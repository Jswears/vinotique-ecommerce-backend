import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayEvent, Context, Handler } from "aws-lambda";
import Logger from "../../../utils/logger";
import {
  createErrorResponse,
  createSuccessResponse,
} from "../../../utils/returnResponse";

// ### Constants ###
const TABLE_NAME = process.env.TABLE_NAME || "";
const defaultPageSize = 10;
const logger = new Logger("getWines");

// ### DynamoDB client ###
const client = new DynamoDBClient({});
const doClient = DynamoDBDocumentClient.from(client);

// ### Validate environment variables ###
if (!TABLE_NAME) {
  throw new Error("TABLE_NAME environment variable is not set");
}

// ### Handler ###
export const getWines: Handler = async (
  event: APIGatewayEvent,
  context: Context
) => {
  logger.info("Getting wines", { event, context });

  try {
    // Get query parameters
    const queryParams = event.queryStringParameters;
    logger.info("Query parameters", { queryParams });
    let limit;
    let startKey;

    if (queryParams) {
      const { pageSize, nextToken } = queryParams;
      limit = pageSize ? parseInt(pageSize, 10) : defaultPageSize;
      startKey = nextToken
        ? JSON.parse(Buffer.from(nextToken, "base64").toString("utf-8"))
        : undefined;
    }

    // Query the database to get all wines with querycommand
    const params = {
      TableName: TABLE_NAME,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :winePartition",
      ExpressionAttributeValues: {
        ":winePartition": "WINE",
      },
      Limit: limit,
      ProjectionExpression:
        "#name, #wineId, #description, #price, #wineType, #region, #producer, #year, #stock, #sku, #imageUrl, #createdAt, #isFeatured, #isAvailable",
      ExpressionAttributeNames: {
        "#wineId": "wineId",
        "#name": "name",
        "#description": "description",
        "#price": "price",
        "#wineType": "wineType",
        "#region": "region",
        "#producer": "producer",
        "#year": "year",
        "#stock": "stock",
        "#sku": "sku",
        "#imageUrl": "imageUrl",
        "#createdAt": "createdAt",
        "#isFeatured": "isFeatured",
        "#isAvailable": "isAvailable",
      },
      ExclusiveStartKey: startKey,
    };
    const result = await doClient.send(new QueryCommand(params));
    const totalCountResult = result.Count || 0;

    if (!result.Items || result.Items.length === 0) {
      logger.warn("No wines found");
      return createErrorResponse(404, "No wines found");
    }

    // Encode the last evaluated key to be used as nextToken
    let nextTokenValue = null;
    if (result.LastEvaluatedKey) {
      nextTokenValue = Buffer.from(
        JSON.stringify(result.LastEvaluatedKey)
      ).toString("base64");
    }

    // Return the wines
    logger.info("Successfully got wines", {
      wines: result.Items,
      count: totalCountResult,
    });

    return createSuccessResponse(200, {
      wines: result.Items,
      totalCount: totalCountResult,
      nextToken: nextTokenValue,
    });
  } catch (error: any) {
    logger.error("Error getting wines", { error });
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error getting wines" }),
    };
  }
};
