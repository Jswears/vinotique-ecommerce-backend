import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayEvent, Handler, Context } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import {
  createBadRequestResponse,
  createServerErrorResponse,
  createSuccessResponse,
} from "../../../utils/returnResponse";
import Logger from "../../../utils/logger";
import { isValidUrl } from "../../../utils/validators/urlValidator";
import { z } from "zod";

// Constants
const TABLE_NAME = process.env.TABLE_NAME || "";
const WINE_PREFIX = "WINE#";
const CATEGORY_PREFIX = "CATEGORY#";
const logger = new Logger("createWine");

// DynamoDB client
const dynamoDbClient = new DynamoDBClient({});
const doClient = DynamoDBDocumentClient.from(dynamoDbClient);

// Validate environment variables
if (!TABLE_NAME) {
  throw new Error("TABLE_NAME environment variable is not set");
}

// Zod schema
enum WineCategoryEnum {
  Red = "Red",
  White = "White",
  Rose = "Rose",
  Sparkling = "Sparkling",
  Dessert = "Dessert",
  Fortified = "Fortified",
}

const WineSchema = z.object({
  productName: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  category: z.nativeEnum(WineCategoryEnum),
  region: z.string().min(1, "Region is required"),
  country: z.string().min(1, "Country is required"),
  grapeVarietal: z.array(z.string()).optional(),
  vintage: z.number().min(1900, "Vintage year must be greater than 1900"),
  alcoholContent: z
    .number()
    .min(0, "Alcohol content must be greater than or equal to 0")
    .optional(),
  sizeMl: z.number().min(1, "Size must be greater than 0").optional(),
  price: z.number().min(0.01, "Price must be greater than 0"),
  stockQuantity: z
    .number()
    .min(0, "Stock quantity must be greater than or equal to 0"),
  imageUrl: z.string().refine((url) => isValidUrl(url), {
    message: "Invalid image URL",
  }),
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

const validateWineSchema = (body: any) => {
  try {
    return WineSchema.parse(body);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `Validation error: ${error.errors.map((e) => e.message).join(", ")}`
      );
    }
    throw error;
  }
};

export const createWine: Handler = async (
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
      return createBadRequestResponse("Invalid JSON in request body");
    }

    if (typeof body !== "object" || body === null) {
      return createBadRequestResponse("Request body must be an object");
    }

    const validatedBody = validateWineSchema(body);
    const productId = uuidv4();
    const categoryId = `${CATEGORY_PREFIX}${validatedBody.category}`;

    const newWine: WineProduct = {
      PK: `${WINE_PREFIX}${productId}`,
      SK: `${WINE_PREFIX}${productId}`,
      wineId: productId,
      productName: validatedBody.productName,
      description: validatedBody.description,
      categoryId,
      type: "PRODUCT",
      region: validatedBody.region,
      country: validatedBody.country || "Unknown",
      grapeVarietal: validatedBody.grapeVarietal || [],
      vintage: validatedBody.vintage,
      alcoholContent: validatedBody.alcoholContent || 0,
      sizeMl: validatedBody.sizeMl || 750,
      price: validatedBody.price,
      stockQuantity: validatedBody.stockQuantity,
      imageUrl: validatedBody.imageUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rating: validatedBody.rating || 0,
      reviewCount: validatedBody.reviewCount || 0,
    };

    await doClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: newWine,
      })
    );

    logger.info("Successfully created wine", {
      requestId: context.awsRequestId,
      productId,
    });

    return createSuccessResponse(201, {
      message: `Wine created with ID: ${productId}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      logger.warn("Validation error", {
        requestId: context.awsRequestId,
        error: errorMessage,
      });
      return createBadRequestResponse(errorMessage);
    }

    logger.error("Error creating wine", {
      requestId: context.awsRequestId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return createServerErrorResponse(
      "Error creating wine. Please try again later."
    );
  }
};
