import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import Logger from "../../../utils/logger";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayEvent, Handler } from "aws-lambda";
import { OrderResponse, QueryParams } from "../../../types";
import {
  createErrorResponse,
  createSuccessResponse,
} from "../../../utils/returnResponse";

// ---- Constants ----
const TABLE_NAME = process.env.TABLE_NAME || "WineEcommerce";
const defaultPageSize = 10;
const logger = new Logger("getOrders");

// ---- DynamoDB client ----
const dynamoDbClient = new DynamoDBClient({});
const doClient = DynamoDBDocumentClient.from(dynamoDbClient);

// ---- Validate environment variables ----
if (!TABLE_NAME) {
  throw new Error("TABLE_NAME environment variable is not set");
}

// ---- Handler function ----
export const handler: Handler = async (event: APIGatewayEvent) => {
  try {
    // Get and validate query parameters
    const queryParams = event.queryStringParameters as QueryParams;
    logger.info("Query parameters", { queryParams });

    let limit = defaultPageSize;
    let startKey;

    if (queryParams?.pageSize) {
      const parsedPageSize = parseInt(queryParams.pageSize, 10);
      if (isNaN(parsedPageSize) || parsedPageSize < 1) {
        return createErrorResponse(400, "Invalid pageSize parameter");
      }
      limit = parsedPageSize;
    }

    if (queryParams?.nextToken) {
      try {
        startKey = JSON.parse(
          Buffer.from(queryParams.nextToken, "base64").toString("utf-8")
        );
      } catch (error) {
        return createErrorResponse(400, "Invalid nextToken parameter");
      }
    }

    // Create projection attributes map dynamically
    const projectionAttributes = [
      "orderId",
      "customer",
      "orderStatus",
      "totalAmount",
      "shippingDetails",
      "createdAt",
      "cartItems",
    ];

    // Query the database to get all wines with querycommand
    const params = {
      TableName: TABLE_NAME,
      IndexName: "GSI1",
      KeyConditionExpression:
        "GSI1PK = :orderPartition and begins_with(GSI1SK, :orderSort)",
      ExpressionAttributeValues: {
        ":orderPartition": "ORDER",
        ":orderSort": "ORDER#",
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
      Limit: limit,
      ExclusiveStartKey: startKey,
    };

    const result = await doClient.send(new QueryCommand(params));

    if (!result.Items || result.Items.length === 0) {
      return createErrorResponse(404, "No orders found");
    }

    const nextTokenValue = result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString("base64")
      : null;

    const response: OrderResponse = {
      orders: result.Items as OrderResponse["orders"],
      totalCount: result.Count || 0,
      nextToken: nextTokenValue,
    };

    logger.info("Successfully got orders", {
      count: response.totalCount,
    });

    return createSuccessResponse(200, response);
  } catch (error) {
    logger.error("Error getting orders", error);
    return createErrorResponse(500, "An error occurred while fetching orders");
  }
};
