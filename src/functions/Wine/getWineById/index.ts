import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { APIGatewayEvent, Context, Handler } from "aws-lambda";
import Logger from "../../../utils/logger";
import {
  createBadRequestResponse,
  createErrorResponse,
  createSuccessResponse,
} from "../../../utils/returnResponse";

// ### Constants ###
const TABLE_NAME = process.env.TABLE_NAME || "";
const logger = new Logger("getWines");

// ### DynamoDB client ###
const client = new DynamoDBClient({});
const doClient = DynamoDBDocumentClient.from(client);

// ### Validate environment variables ###
if (!TABLE_NAME) {
  throw new Error("TABLE_NAME environment variable is not set");
}

// ### Handler ###

export const getWineById: Handler = async (
  event: APIGatewayEvent,
  context: Context
) => {
  try {
    // Get wineId from path parameters
    const { wineId } = event.pathParameters || {};
    logger.info("Getting wine by ID", { wineId });

    if (!wineId) {
      return createBadRequestResponse("Wine ID is required");
    }

    // Query the database to get the wine by ID
    const params = {
      TableName: TABLE_NAME,
      Key: {
        PK: `WINE#${wineId}`,
        SK: "META",
      },
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
        "#updatedAt": "updatedAt",
        "#isFeatured": "isFeatured",
        "#isAvailable": "isAvailable",
      },
    };

    const result = await doClient.send(new GetCommand(params));
    const wine = result.Item;

    if (!wine) {
      return createErrorResponse(404, "Wine not found");
    }

    // Return the wine
    logger.info("Successfully retrieved wine", { wine });
    return createSuccessResponse(200, wine);
  } catch (error) {
    logger.error("Error getting wine", { error });
    return createErrorResponse(500, (error as Error).message);
  }
};
