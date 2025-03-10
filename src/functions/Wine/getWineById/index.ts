import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  APIGatewayEvent,
  Context,
  Handler,
  APIGatewayProxyResult,
} from "aws-lambda";
import Logger from "../../../utils/logger";
import {
  createBadRequestResponse,
  createErrorResponse,
  createSuccessResponse,
} from "../../../utils/returnResponse";
import { Wine } from "../../../types";

// ---- Constants ----
const TABLE_NAME = process.env.TABLE_NAME;
const logger = new Logger("getWineById");

// ---- Validate Environment Variables ----
if (!TABLE_NAME) {
  throw new Error("TABLE_NAME environment variable is not set");
}

// ---- DynamoDB Client ----
const client = new DynamoDBClient({});
const doClient = DynamoDBDocumentClient.from(client);

// ---- Handler ----
export const getWineById: Handler = async (
  event: APIGatewayEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const requestId = context.awsRequestId;

  try {
    // ---- Get wineId from path parameters ----
    const { wineId } = event.pathParameters || {};
    logger.info("Fetching wine by ID", { requestId, wineId });

    // ---- Validate wineId ----
    if (!wineId) {
      logger.warn("Wine ID is missing", { requestId });
      return createBadRequestResponse("Wine ID is required");
    }

    if (!/^[A-Za-z0-9-]+$/.test(wineId)) {
      logger.warn("Invalid Wine ID format", { requestId, wineId });
      return createBadRequestResponse("Invalid Wine ID format.");
    }

    // ---- Define Projection Attributes ----
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

    // ---- Query Parameters for GetCommand ----
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
        (acc, attr) => ({ ...acc, [`#${attr}`]: attr }),
        {}
      ),
    };

    // ---- Execute Query ----
    const result = await doClient.send(new GetCommand(params));
    const wine = result.Item as Wine | undefined;

    // ---- Handle Not Found ----
    if (!wine) {
      logger.info("Wine not found", { requestId, wineId });
      return createErrorResponse(404, `Wine with ID ${wineId} not found`);
    }

    // ---- Return Success Response ----
    logger.info("Successfully retrieved wine", { requestId, wineId });
    return createSuccessResponse(200, wine);
  } catch (error) {
    logger.error("Error fetching wine", {
      requestId,
      wineId: event.pathParameters?.wineId,
      error,
    });
    return createErrorResponse(500, "Internal server error");
  }
};
