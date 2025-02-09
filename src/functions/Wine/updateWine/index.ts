import { APIGatewayEvent, Context, Handler } from "aws-lambda";
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
import { z } from "zod";
import { isValidUrl } from "../../../utils/validators/urlValidator";
import { Wine, WineCategoryEnum, WinePathParams } from "../../../types";
import Logger from "../../../utils/logger";

// ---- Constants ----
const TABLE_NAME = process.env.TABLE_NAME;
const WINE_PK_PREFIX = "WINE#";
const WINE_SK = "META";
const logger = new Logger("updateWine");

// ---- DynamoDB client ----
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// ---- Validate environment variables ----
if (!TABLE_NAME) {
  throw new Error("TABLE_NAME environment variable is not set");
}

// ---- Zod schema for validating the request body ----
const WineSchema = z.object({
  productName: z.string().min(1, "Name is required").optional(),
  description: z.string().min(1, "Description is required").optional(),
  category: z.nativeEnum(WineCategoryEnum).optional(),
  region: z.string().min(1, "Region is required").optional(),
  country: z.string().min(1, "Country is required").optional(),
  grapeVarietal: z.array(z.string()).optional(),
  vintage: z
    .number()
    .min(1900, "Vintage year must be greater than 1900")
    .optional(),
  alcoholContent: z
    .number()
    .min(0, "Alcohol content must be greater than or equal to 0")
    .optional(),
  sizeMl: z.number().min(1, "Size must be greater than 0").optional(),
  price: z.number().min(0.01, "Price must be greater than 0").optional(),
  stockQuantity: z
    .number()
    .min(0, "Stock quantity must be greater than or equal to 0")
    .optional(),
  isInStock: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  imageUrl: z
    .string()
    .refine((url) => isValidUrl(url), {
      message: "Invalid image URL",
    })
    .optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  rating: z
    .number()
    .min(0, "Rating must be greater than or equal to 0")
    .optional(),
  reviewCount: z
    .number()
    .min(0, "Review count must be greater than or equal to 0")
    .optional(),
});

const validateWineSchema = (body: unknown): z.infer<typeof WineSchema> => {
  try {
    return WineSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `Validation error: ${error.errors.map((e) => e.message).join(", ")}`
      );
    }
    throw error;
  }
};
export const updateWine: Handler = async (
  event: APIGatewayEvent,
  context: Context
) => {
  logger.info("Received request to create a new wine", {
    requestId: context.awsRequestId,
    body: event.body ? JSON.parse(event.body) : null,
  });

  try {
    if (!event.body) {
      return createBadRequestResponse("Request body is required");
    }

    let body: unknown;
    try {
      body = JSON.parse(event.body);
    } catch (error) {
      return createBadRequestResponse("Invalid JSON format");
    }

    if (typeof body !== "object" || body === null) {
      return createBadRequestResponse("Request body must be a JSON object");
    }

    const validatedBody = validateWineSchema(body);

    const { wineId } = event.pathParameters || ({} as WinePathParams);

    // Validate wineId
    if (!wineId) {
      return createErrorResponse(400, "Wine ID is required");
    }

    logger.info(`Updating wine with ID: ${wineId}`, {
      requestId: context.awsRequestId,
    });

    const getParams = {
      TableName: TABLE_NAME,
      Key: {
        PK: `${WINE_PK_PREFIX}${wineId}`,
        SK: WINE_SK,
      },
    };

    const getResult = await docClient.send(new GetCommand(getParams));

    if (!getResult.Item) {
      logger.info(`Wine not found with ID: ${wineId}`, {
        requestId: context.awsRequestId,
      });
      return createErrorResponse(404, "Wine not found");
    }

    const updateExpressions = [];
    const expressionAttributeNames: { [key: string]: string } = {};
    const expressionAttributeValues: { [key: string]: any } = {};

    type Attribute = {
      key: keyof Wine;
      alias: string;
      valueAlias: string;
    };

    const attributes: Attribute[] = [
      { key: "productName", alias: "#productName", valueAlias: ":productName" },
      { key: "description", alias: "#description", valueAlias: ":description" },
      { key: "category", alias: "#category", valueAlias: ":category" },
      { key: "region", alias: "#region", valueAlias: ":region" },
      { key: "country", alias: "#country", valueAlias: ":country" },
      {
        key: "grapeVarietal",
        alias: "#grapeVarietal",
        valueAlias: ":grapeVarietal",
      },
      { key: "vintage", alias: "#vintage", valueAlias: ":vintage" },
      {
        key: "alcoholContent",
        alias: "#alcoholContent",
        valueAlias: ":alcoholContent",
      },
      { key: "sizeMl", alias: "#sizeMl", valueAlias: ":sizeMl" },
      { key: "price", alias: "#price", valueAlias: ":price" },
      {
        key: "stockQuantity",
        alias: "#stockQuantity",
        valueAlias: ":stockQuantity",
      },
      { key: "isInStock", alias: "#isInStock", valueAlias: ":isInStock" },
      { key: "isFeatured", alias: "#isFeatured", valueAlias: ":isFeatured" },
      { key: "imageUrl", alias: "#imageUrl", valueAlias: ":imageUrl" },
      { key: "rating", alias: "#rating", valueAlias: ":rating" },
      { key: "reviewCount", alias: "#reviewCount", valueAlias: ":reviewCount" },
      { key: "updatedAt", alias: "#updatedAt", valueAlias: ":updatedAt" },
    ];

    for (const attr of attributes) {
      if ((validatedBody as unknown as Wine)[attr.key] !== undefined) {
        updateExpressions.push(`${attr.alias} = ${attr.valueAlias}`);
        expressionAttributeNames[attr.alias] = attr.key;
        expressionAttributeValues[attr.valueAlias] = (
          validatedBody as unknown as Wine
        )[attr.key];
      }
    }

    // Ensure updatedAt is always updated
    updateExpressions.push("#updatedAt = :updatedAt");
    expressionAttributeNames["#updatedAt"] = "updatedAt";
    expressionAttributeValues[":updatedAt"] = new Date().toISOString();

    if (updateExpressions.length === 0) {
      logger.error(
        `No valid attributes found to update, requestId: ${context.awsRequestId}`
      );
      return createBadRequestResponse("No valid attributes found to update");
    }

    const params = {
      TableName: TABLE_NAME,
      Key: {
        PK: `${WINE_PK_PREFIX}${wineId}`,
        SK: WINE_SK,
      },
      UpdateExpression: `SET ${updateExpressions.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    };

    await docClient.send(new UpdateCommand(params));
    logger.info(
      `Wine updated successfully, requestId: ${context.awsRequestId}`
    );
    return createSuccessResponse(200, {
      message: "Wine updated successfully",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const requestId = context.awsRequestId;
      logger.error(
        `Error updating wine: ${error.errors
          .map((e) => e.message)
          .join(", ")}, requestId: ${requestId}`
      );

      return createBadRequestResponse(
        error.errors.map((e) => e.message).join(", ")
      );
    }

    logger.error(`Error updating wine: ${error.message}`, {
      requestId: context.awsRequestId,
    });
    return createServerErrorResponse(`Error updating wine: ${error.message}`);
  }
};
