import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import Logger from "../../../utils/logger";
import { DeleteCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { APIGatewayEvent, Context, Handler } from "aws-lambda";
import {
  createServerErrorResponse,
  createSuccessResponse,
} from "../../../utils/returnResponse";

// ---- Constants ----
const TABLE_NAME = process.env.TABLE_NAME || "";
const WINE_PREFIX = "WINE#";
const WINE_SK = "META";
const logger = new Logger("deleteWine");

// ---- DynamoDB client ----
const dynamoDbClient = new DynamoDBClient({});
const doClient = DynamoDBDocumentClient.from(dynamoDbClient);

// ---- Validate environment variables ----
if (!TABLE_NAME) {
  throw new Error("TABLE_NAME environment variable is not set");
}

// ---- Handler ----

export const deleteWine: Handler = async (
  event: APIGatewayEvent,
  context: Context
) => {
  logger.info("Received event", event);

  try {
    const { wineId } = event.pathParameters as { wineId: string };

    logger.info("Deleting wine", { wineId });

    // ---- Delete wine ----
    const params = {
      TableName: TABLE_NAME,
      Key: {
        PK: `${WINE_PREFIX}${wineId}`,
        SK: WINE_SK,
      },
    };

    await doClient.send(new DeleteCommand(params));

    logger.info("Wine deleted", { wineId });

    return createSuccessResponse(200, { message: "Wine deleted successfully" });
  } catch (error) {
    logger.error("Error deleting wine", error);
    return createServerErrorResponse();
  }
};
