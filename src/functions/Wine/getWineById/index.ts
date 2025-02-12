import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { APIGatewayEvent, Context, Handler } from "aws-lambda";
import Logger from "../../../utils/logger";
import {
  createBadRequestResponse,
  createErrorResponse,
  createSuccessResponse,
} from "../../../utils/returnResponse";
import { Wine } from "../../../types";

// ---- Constants ----
const TABLE_NAME = process.env.TABLE_NAME || "";
const logger = new Logger("getWines");

// ---- DynamoDB client ----
const client = new DynamoDBClient({});
const doClient = DynamoDBDocumentClient.from(client);

// ---- Validate environment variables ----
if (!TABLE_NAME) {
  throw new Error("TABLE_NAME environment variable is not set");
}

// ---- Handler ----

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

    // Add wineId format validation
    if (!/^[A-Za-z0-9-]+$/.test(wineId)) {
      return createBadRequestResponse("Invalid Wine ID format");
    }

    // Create projection attributes map dynamically
    const projectionAttributes = [
      "wineId",
      "productName",
      "producer",
      "description",
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
      Key: {
        PK: `WINE#${wineId}`,
        SK: "META",
      },
      ProjectionExpression: projectionAttributes
        .map((attr) => `#${attr}`)
        .join(", "),
      ExpressionAttributeNames: projectionAttributes.reduce(
        (acc, attr) => ({
          ...acc,
          [`#${attr}`]: attr,
        }),
        {}
      ),
    };

    const result = await doClient.send(new GetCommand(params));
    const wine = result.Item as Wine | undefined;

    if (!wine) {
      return createErrorResponse(404, `Wine with ID ${wineId} not found`);
    }

    // Return the wine
    logger.info("Successfully retrieved wine", { wineId });
    return createSuccessResponse(200, wine);
  } catch (error) {
    logger.error("Error getting wine", {
      error,
      wineId: event.pathParameters?.wineId,
    });
    return createErrorResponse(500, "Internal server error");
  }
};
