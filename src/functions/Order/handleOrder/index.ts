import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import Logger from "../../../utils/logger";
import { v4 } from "uuid";
import { APIGatewayEvent, EventBridgeEvent, Handler } from "aws-lambda";
import {
  createErrorResponse,
  createSuccessResponse,
} from "../../../utils/returnResponse";

// ---- Constants ----
const TABLE_NAME = process.env.TABLE_NAME || "WineEcommerce";
const logger = new Logger("handleOrder");

// ---- DynamoDB client ----
const dynamoDbClient = new DynamoDBClient({});
const doClient = DynamoDBDocumentClient.from(dynamoDbClient);

// ---- Validate environment variables ----
if (!TABLE_NAME) {
  throw new Error("TABLE_NAME environment variable is not set");
}

// ---- Helper functions ----
const createOrder = async (order: any) => {
  try {
    const orderId = v4();
    const now = new Date();
    const item = {
      PK: `ORDER#${orderId}`,
      SK: `ORDER#${orderId}`,
      orderId,
      ...order,
      createdAt: now.toISOString(),
    };
  } catch (error) {}
};

export const handler: Handler = async (
  event: EventBridgeEvent<string, any>
) => {
  try {
    // Receive event from event bridge
    const { detail } = event;

    console.log("Received event: ", event);
    console.log("Detail: ", detail);

    return createSuccessResponse(200, "Order created successfully");
  } catch (error) {
    logger.error("Error creating order", error);
    return createErrorResponse(500, "Error creating order");
  }
};
