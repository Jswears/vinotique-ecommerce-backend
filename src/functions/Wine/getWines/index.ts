import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import {
  APIGatewayEvent,
  Context,
  Handler,
  APIGatewayProxyResult,
} from "aws-lambda";
import Logger from "../../../utils/logger";
import {
  createErrorResponse,
  createSuccessResponse,
} from "../../../utils/returnResponse";
import { QueryParams, WineResponse } from "../../../types";

// ---- Constants ----
const TABLE_NAME = process.env.TABLE_NAME;
const defaultPageSize = 10;
const logger = new Logger("getWines");

// ---- Validate environment variables ----
if (!TABLE_NAME) {
  throw new Error("TABLE_NAME environment variable is not set");
}

// ---- DynamoDB Client ----
const client = new DynamoDBClient({});
const doClient = DynamoDBDocumentClient.from(client);

// ---- Handler ----
export const getWines: Handler = async (
  event: APIGatewayEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const requestId = context.awsRequestId;
  logger.info("Fetching wines", { requestId });
  const claims = event.requestContext?.authorizer?.claims;
  console.log("claims", claims);
  console.log("event", event);

  try {
    // ---- Parse Query Parameters ----
    const queryParams = event.queryStringParameters as QueryParams;
    logger.info("Query parameters received", { requestId, queryParams });

    let limit = defaultPageSize;
    let startKey;

    // ---- Validate `pageSize` ----
    if (queryParams?.pageSize) {
      const parsedPageSize = parseInt(queryParams.pageSize, 10);
      if (isNaN(parsedPageSize) || parsedPageSize < 1) {
        return createErrorResponse(
          400,
          "Invalid pageSize parameter. Must be a positive integer."
        );
      }
      limit = parsedPageSize;
    }

    // ---- Validate `nextToken` ----
    if (queryParams?.nextToken) {
      try {
        startKey = JSON.parse(
          Buffer.from(queryParams.nextToken, "base64").toString("utf-8")
        );
      } catch (error) {
        logger.warn("Invalid nextToken format", { requestId, error });
        return createErrorResponse(400, "Invalid nextToken parameter.");
      }
    }

    // ---- Define Projection Attributes ----
    const projectionAttributes = [
      "wineId",
      "productName",
      "producer",
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
      "stockQuantity",
      "description",
    ];

    // ---- Query the Database ----
    const params = {
      TableName: TABLE_NAME,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :winePartition",
      ExpressionAttributeValues: {
        ":winePartition": "WINE",
      },
      ProjectionExpression: projectionAttributes
        .map((attr) => `#${attr}`)
        .join(", "),
      ExpressionAttributeNames: projectionAttributes.reduce(
        (acc, attr) => ({ ...acc, [`#${attr}`]: attr }),
        {}
      ),
      Limit: limit,
      ExclusiveStartKey: startKey,
    };

    const result = await doClient.send(new QueryCommand(params));

    // ---- Handle No Wines Found ----
    if (!result.Items || result.Items.length === 0) {
      logger.info("No wines found", { requestId });
      return createSuccessResponse(200, {
        wines: [],
        totalCount: 0,
        nextToken: null,
      });
    }

    // ---- Handle Pagination Token ----
    const nextTokenValue = result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString("base64")
      : null;

    // ---- Construct Response ----
    const response: WineResponse = {
      wines: result.Items as WineResponse["wines"],
      totalCount: result.Count || 0,
      nextToken: nextTokenValue,
    };

    logger.info("Successfully retrieved wines", {
      requestId,
      count: response.totalCount,
    });

    return createSuccessResponse(200, response);
  } catch (error) {
    logger.error("Error fetching wines", { requestId, error });
    return createErrorResponse(500, "An error occurred while fetching wines.");
  }
};
