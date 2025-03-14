import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import Logger from "../../../utils/logger";
import { DeleteCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { APIGatewayEvent, Context, Handler } from "aws-lambda";
import {
  createServerErrorResponse,
  createSuccessResponse,
  createErrorResponse,
} from "../../../utils/returnResponse";

// ---- Constants ----
const TABLE_NAME = process.env.TABLE_NAME || "";
const WINE_PREFIX = "WINE#";
const WINE_SK = "META";
const ADMIN_GROUP = "ADMINS";
const logger = new Logger("deleteWine");

// ---- DynamoDB client ----
const dynamoDbClient = new DynamoDBClient({});
const doClient = DynamoDBDocumentClient.from(dynamoDbClient);

// ---- Validate environment variables ----
if (!TABLE_NAME) {
  throw new Error("TABLE_NAME environment variable is not set");
}

// ---- Handler ----
export const handler: Handler = async (
  event: APIGatewayEvent,
  context: Context
) => {
  const requestId = context.awsRequestId;
  logger.info("Received request to delete a wine", { requestId });

  try {
    // ---- Authorization: Ensure Admin User ----
    const userGroups =
      event.requestContext?.authorizer?.claims["cognito:groups"];
    if (!userGroups || !userGroups.includes(ADMIN_GROUP)) {
      logger.warn("Unauthorized access attempt", { requestId });
      return createErrorResponse(403, "Forbidden: Admin access required");
    }

    const { wineId } = event.pathParameters as { wineId: string };

    if (!wineId) {
      return createErrorResponse(400, "Wine ID is required");
    }

    logger.info("Deleting wine", { requestId, wineId });

    // ---- Delete wine ----
    const params = {
      TableName: TABLE_NAME,
      Key: {
        PK: `${WINE_PREFIX}${wineId}`,
        SK: WINE_SK,
      },
    };

    await doClient.send(new DeleteCommand(params));
    logger.info("Wine deleted", { requestId, wineId });

    return createSuccessResponse(200, { message: "Wine deleted successfully" });
  } catch (error) {
    logger.error("Error deleting wine", { requestId, error });
    return createServerErrorResponse("Error deleting wine.");
  }
};
