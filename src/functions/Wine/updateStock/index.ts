import { DynamoDBClient, ReturnValue } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import Logger from "../../../utils/logger";
import { Handler } from "aws-lambda";
import {
  createErrorResponse,
  createSuccessResponse,
} from "../../../utils/returnResponse";

// ---- Constants ----
const TABLE_NAME = process.env.TABLE_NAME || "WineEcommerce";
const logger = new Logger("updateStock");

// ---- DynamoDB client ----
const dynamoDbClient = new DynamoDBClient({});
const doClient = DynamoDBDocumentClient.from(dynamoDbClient);

// ---- Validate environment variables ----
if (!TABLE_NAME) {
  throw new Error("TABLE_NAME environment variable is not set");
}

// ---- Helper functions ----
const updateStock = async (wineId: string, quantity: number) => {
  const now = new Date().toISOString();

  // First update: decrement stockQuantity and update updatedAt
  const params = {
    TableName: TABLE_NAME,
    Key: {
      PK: `WINE#${wineId}`,
      SK: "META",
    },
    UpdateExpression:
      "SET stockQuantity = stockQuantity - :quantity, updatedAt = :updatedAt",
    ExpressionAttributeValues: {
      ":quantity": quantity,
      ":updatedAt": now,
    },
    ConditionExpression: "stockQuantity >= :quantity",
    ReturnValues: "ALL_NEW" as ReturnValue,
  };

  const updateCommand = new UpdateCommand(params);
  let result = await doClient.send(updateCommand);

  // The returned stockQuantity is already updated
  let newStock = result.Attributes?.stockQuantity;

  // If newStock is 0, update isInStock to false
  if (newStock === 0) {
    const statusParams = {
      TableName: TABLE_NAME,
      Key: {
        PK: `WINE#${wineId}`,
        SK: "META",
      },
      UpdateExpression: "SET isInStock = :status, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":status": false,
        ":updatedAt": now,
      },
      ReturnValues: "ALL_NEW" as ReturnValue,
    };
    const statusUpdateCommand = new UpdateCommand(statusParams);
    result = await doClient.send(statusUpdateCommand);
  }

  return {
    wineId,
    stock: result.Attributes?.stockQuantity,
    isInStock: result.Attributes?.isInStock,
  };
};

// ---- Handler ----
export const handler: Handler = async (event) => {
  try {
    const { items } = event;

    if (!items || !Array.isArray(items) || items.length === 0) {
      logger.warn("No items provided for stock update");
      return createErrorResponse(400, "No items provided for stock update");
    }

    const updatePromises = items.map(async (item: any) => {
      const { wineId, quantity } = item;
      return updateStock(wineId, quantity);
    });

    const results = await Promise.all(updatePromises);
    logger.info("Stock updated", results);

    return createSuccessResponse(200, `Stock updated ${results}`);
  } catch (error: any) {
    logger.error(`Error updating stock: ${error.message}`, error);
    return createErrorResponse(500, "Error updating stock");
  }
};
