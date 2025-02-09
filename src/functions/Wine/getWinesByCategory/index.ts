import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import Logger from "../../../utils/logger";
import {
  createErrorResponse,
  createSuccessResponse,
} from "../../../utils/returnResponse";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayEvent, Context, Handler } from "aws-lambda";
import { CategoryPathParams, QueryParams, WineResponse } from "../../../types";

// ---- Constants ----
const TABLE_NAME = process.env.TABLE_NAME || "";
const logger = new Logger("getWineByCategory");
const defaultPageSize = 10;

// ---- DynamoDB client ----
const dynamoDbClient = new DynamoDBClient({});
const doClient = DynamoDBDocumentClient.from(dynamoDbClient);

// ---- Validate environment variables ----
if (!TABLE_NAME) {
  throw new Error("TABLE_NAME environment variable is not set");
}

// ---- Handler ----
export const getWinesByCategory: Handler = async (
  event: APIGatewayEvent,
  context: Context
) => {
  logger.info("Getting wines by category", { event });

  try {
    // Get category from path parameters
    const { category } = event.pathParameters || ({} as CategoryPathParams);
    logger.info("Getting wines by category", { category });

    const { pageSize, nextToken } =
      event.queryStringParameters || ({} as QueryParams);
    logger.info("Query parameters", { pageSize, nextToken });

    let limit = defaultPageSize;
    let startKey;

    // Validate category
    if (!category) {
      return createErrorResponse(400, "Category is required");
    }

    // Validate page size
    if (pageSize) {
      const parsedPageSize = parseInt(pageSize, 10);
      if (isNaN(parsedPageSize) || parsedPageSize < 1) {
        return createErrorResponse(400, "Invalid pageSize parameter");
      }
      limit = parsedPageSize;
    }

    // Validate nextToken
    if (nextToken) {
      try {
        startKey = JSON.parse(
          Buffer.from(nextToken, "base64").toString("utf-8")
        );
      } catch (error) {
        return createErrorResponse(400, "Invalid nextToken parameter");
      }
    }

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

    // Query DynamoDB
    const params = {
      TableName: TABLE_NAME,
      IndexName: "GSI2",
      KeyConditionExpression: "GSI2PK = :category",
      ExpressionAttributeValues: {
        ":category": `CATEGORY#${category}`,
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

    logger.info("Query result", { result });
    if (!result.Items || result.Items.length === 0) {
      logger.info(`No wines found for category: ${category}`);
      return createSuccessResponse(200, {
        wines: [],
        nextToken: null,
      });
    }

    let nextTokenValue = null;
    if (result.LastEvaluatedKey) {
      nextTokenValue = Buffer.from(
        JSON.stringify(result.LastEvaluatedKey)
      ).toString("base64");
    }

    const response: WineResponse = {
      wines: result.Items as WineResponse["wines"],
      totalCount: result.Count || 0,
      nextToken: nextTokenValue,
    };

    logger.info(`Found ${result.Items.length} wines for category: ${category}`);

    return createSuccessResponse(200, response);
  } catch (error) {
    logger.error("Error getting wines by category", {
      error,
      category: event.pathParameters?.category,
    });
    return createErrorResponse(500, "Internal server error");
  }
};
