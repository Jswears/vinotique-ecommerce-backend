import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import Logger from "../../../utils/logger";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayEvent, Handler } from "aws-lambda";
import {
  createErrorResponse,
  createSuccessResponse,
} from "../../../utils/returnResponse";
import { WineResponse } from "../../../types";

// ---- Constants ----
const TABLE_NAME = process.env.TABLE_NAME || "";
const WINE_PREFIX = "WINE#";
const WINE_SK = "META";
const logger = new Logger("searchWines");

// ---- DynamoDB client ----
const dynamoDbClient = new DynamoDBClient({});
const doClient = DynamoDBDocumentClient.from(dynamoDbClient);

// ---- Validate environment variables ----
if (!TABLE_NAME) {
  throw new Error("TABLE_NAME environment variable is not set");
}

// ---- Handler ----
export const searchWines: Handler = async (event: APIGatewayEvent) => {
  logger.info("Received event", event);

  try {
    const { query } = event.queryStringParameters as { query: string };

    logger.info("Searching wines", { query });

    //  Search wines by product name

    // Create projection attributes map dynamically
    const projectionAttributes = [
      "wineId",
      "productName",
      "category",
      "region",
      "country",
      "grapeVarietal",
      "vintage",
      "alcoholContent",
      "sizeMl",
      "price",
      "isInStock",
      "isFeatured",
      "imageUrl",
      "rating",
      "reviewCount",
      "createdAt",
      "updatedAt",
    ];

    const params = {
      TableName: TABLE_NAME,
      FilterExpression: "contains(#productName, :query)",
      ExpressionAttributeNames: projectionAttributes.reduce((acc, attr) => {
        acc[`#${attr}`] = attr;
        return acc;
      }, {} as { [key: string]: string }),
      ExpressionAttributeValues: {
        ":query": query,
      },
      ProjectionExpression: projectionAttributes
        .map((attr) => `#${attr}`)
        .join(", "),
    };

    const result = await doClient.send(new ScanCommand(params));

    if (!result.Items || result.Items.length === 0) {
      logger.error("No wines found");
      return createErrorResponse(404, "No wines found");
    }
    //TODO: NEEDS IMPLEMENTING OF THE CONST RESPONSE TO BE RETURNED
    logger.info(`Wines found: ${result.Items.length} with query: ${query}`);

    return createSuccessResponse(200, result.Items);
  } catch (error) {
    logger.error("Error searching wines", error);
    return createErrorResponse(500, "Error searching wines");
  }
};
