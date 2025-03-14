import {
  APIGatewayEvent,
  Context,
  Handler,
  APIGatewayProxyResult,
} from "aws-lambda";
import {
  createBadRequestResponse,
  createErrorResponse,
  createServerErrorResponse,
  createSuccessResponse,
} from "../../../utils/returnResponse";
import {
  DynamoDBDocumentClient,
  UpdateCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import Logger from "../../../utils/logger";
import { wineSchema } from "../../../utils/validators/zodValidators";

// ---- Constants ----
const TABLE_NAME = process.env.TABLE_NAME;
const WINE_PK_PREFIX = "WINE#";
const WINE_SK = "META";
const ADMIN_GROUP = "ADMINS";
const logger = new Logger("updateWine");

// ---- DynamoDB client ----
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// ---- Validate environment variables ----
if (!TABLE_NAME) {
  throw new Error("TABLE_NAME environment variable is not set");
}

export const handler: Handler = async (
  event: APIGatewayEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const requestId = context.awsRequestId;
  logger.info("Received request to update a wine", {
    requestId,
    body: event.body,
  });

  try {
    // ---- Authorization: Ensure Admin User ----
    const userGroups =
      event.requestContext?.authorizer?.claims["cognito:groups"];
    if (!userGroups || !userGroups.includes(ADMIN_GROUP)) {
      logger.warn("Unauthorized access attempt", { requestId });
      return createErrorResponse(403, "Forbidden: Admin access required");
    }

    if (!event.body) {
      return createBadRequestResponse("Request body is required");
    }

    // **Parse JSON body**
    let parsedBody;
    try {
      parsedBody = JSON.parse(event.body);
    } catch (error) {
      return createErrorResponse(400, "Invalid JSON format");
    }

    // ---- Validate Input ----
    const validationResult = wineSchema.safeParse(parsedBody);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors
        .map((e) => e.message)
        .join(", ");
      logger.warn("Validation failed", { requestId, errorMessage });
      return createErrorResponse(400, `Validation Error: ${errorMessage}`);
    }

    const validatedBody = validationResult.data;
    const { wineId } = event.pathParameters || {};

    // Validate wineId
    if (!wineId) {
      return createErrorResponse(400, "Wine ID is required");
    }

    logger.info(`Updating wine with ID: ${wineId}`, { requestId });

    const getParams = {
      TableName: TABLE_NAME,
      Key: {
        PK: `${WINE_PK_PREFIX}${wineId}`,
        SK: WINE_SK,
      },
    };

    const getResult = await docClient.send(new GetCommand(getParams));

    if (!getResult.Item) {
      logger.info(`Wine not found with ID: ${wineId}`, { requestId });
      return createErrorResponse(404, "Wine not found");
    }

    // ---- Construct Update Expression ----
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    for (const key of Object.keys(validatedBody)) {
      updateExpressions.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = (validatedBody as any)[key];
    }

    // Ensure updatedAt is always updated
    updateExpressions.push("#updatedAt = :updatedAt");
    expressionAttributeNames["#updatedAt"] = "updatedAt";
    expressionAttributeValues[":updatedAt"] = new Date().toISOString();

    if (updateExpressions.length === 0) {
      logger.error(`No valid attributes found to update`, { requestId });
      return createBadRequestResponse("No valid attributes found to update");
    }

    const updateParams = {
      TableName: TABLE_NAME,
      Key: {
        PK: `${WINE_PK_PREFIX}${wineId}`,
        SK: WINE_SK,
      },
      UpdateExpression: `SET ${updateExpressions.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    };

    await docClient.send(new UpdateCommand(updateParams));
    logger.info(`Wine updated successfully`, { requestId });

    return createSuccessResponse(200, { message: "Wine updated successfully" });
  } catch (error: any) {
    logger.error(`Error updating wine`, { requestId, error });
    return createServerErrorResponse("Error updating wine.");
  }
};
