import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayEvent, Context, Handler } from "aws-lambda";
import Logger from "../../../utils/logger";
import {
  createErrorResponse,
  createSuccessResponse,
} from "../../../utils/returnResponse";
import { QueryParams, WineResponse } from "../../../types";

// ---- Constants ----
const TABLE_NAME = process.env.TABLE_NAME || "";
const defaultPageSize = 10;
const logger = new Logger("getWines");

// ---- DynamoDB client ----
const client = new DynamoDBClient({});
const doClient = DynamoDBDocumentClient.from(client);

// ---- Validate environment variables ----
if (!TABLE_NAME) {
  throw new Error("TABLE_NAME environment variable is not set");
}

// ---- Handler ----
export const getWines: Handler = async (
  event: APIGatewayEvent,
  context: Context
) => {
  logger.info("Getting wines", { event, context });

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

    // Query the database to get all wines with querycommand
    const params = {
      TableName: TABLE_NAME,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :winePartition",
      ExpressionAttributeValues: {
        ":winePartition": "WINE",
      },
      Limit: limit,
      ProjectionExpression:
        "#wineId, #productName, #description, #category, #region, #country, #grapeVarietal, #vintage, #alcoholContent, #sizeMl, #price, #isInStock, #isFeatured, #imageUrl, #rating, #reviewCount, #createdAt, #updatedAt",
      ExpressionAttributeNames: {
        "#wineId": "wineId",
        "#productName": "productName",
        "#description": "description",
        "#category": "category",
        "#region": "region",
        "#country": "country",
        "#grapeVarietal": "grapeVarietal",
        "#vintage": "vintage",
        "#alcoholContent": "alcoholContent",
        "#sizeMl": "sizeMl",
        "#price": "price",
        "#isInStock": "isInStock",
        "#isFeatured": "isFeatured",
        "#imageUrl": "imageUrl",
        "#rating": "rating",
        "#reviewCount": "reviewCount",
        "#createdAt": "createdAt",
        "#updatedAt": "updatedAt",
      },
      ExclusiveStartKey: startKey,
    };
    const result = await doClient.send(new QueryCommand(params));

    if (!result.Items || result.Items.length === 0) {
      return createSuccessResponse(200, {
        data: [],
        totalCount: 0,
        nextToken: null,
      });
    }

    const nextTokenValue = result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString("base64")
      : null;

    const response: WineResponse = {
      data: result.Items as WineResponse["data"],
      totalCount: result.Count || 0,
      nextToken: nextTokenValue,
    };

    logger.info("Successfully got wines", {
      count: response.totalCount,
    });

    return createSuccessResponse(200, response);
  } catch (error) {
    logger.error("Error getting wines", { error });
    return createErrorResponse(500, "An error occurred while fetching wines");
  }
};
