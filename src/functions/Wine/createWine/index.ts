import {
  APIGatewayEvent,
  Handler,
  Context,
  APIGatewayProxyResult,
} from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import {
  createBadRequestResponse,
  createErrorResponse,
  createServerErrorResponse,
  createSuccessResponse,
} from "../../../utils/returnResponse";
import Logger from "../../../utils/logger";
import { wineSchema } from "../../../utils/validators/zodValidators";
import { WineProduct } from "../../../types";

// ---- Constants ----
const TABLE_NAME = process.env.TABLE_NAME;
const WINE_PREFIX = "WINE#";
const CATEGORY_PREFIX = "CATEGORY#";
const ADMIN_GROUP = "ADMINS";
const logger = new Logger("createWine");

// ---- Ensure Required Environment Variables ----
if (!TABLE_NAME) {
  throw new Error("TABLE_NAME environment variable is not set");
}

// ---- DynamoDB Client ----
const dynamoDbClient = new DynamoDBClient({});
const doClient = DynamoDBDocumentClient.from(dynamoDbClient);

// ---- Main Lambda Handler ----
export const handler: Handler = async (
  event: APIGatewayEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const requestId = context.awsRequestId;
  logger.info("Received request to create a new wine", { requestId });

  try {
    // ---- 1️⃣ Authorization: Ensure Admin User ----
    const userGroups =
      event.requestContext?.authorizer?.claims["cognito:groups"];
    if (!userGroups || !userGroups.includes(ADMIN_GROUP)) {
      logger.warn("Unauthorized access attempt", { requestId });
      return createErrorResponse(403, "Forbidden: Admin access required");
    }

    // ---- 2️⃣ Ensure Request Body Exists ----
    if (!event.body) {
      logger.warn("Request body is missing", { requestId });
      return createBadRequestResponse("Request body is required");
    }

    // ---- 3️⃣ Parse & Validate JSON Body ----
    let body: unknown;
    try {
      body = JSON.parse(event.body);
    } catch (error) {
      logger.warn("Invalid JSON format in request", { requestId, error });
      return createBadRequestResponse("Invalid JSON in request body");
    }

    const validationResult = wineSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      logger.warn("Validation failed", { requestId, errorMessage });
      return createErrorResponse(400, `Validation Error: ${errorMessage}`);
    }

    // ---- 4️⃣ Generate Wine ID & Category ----
    const validatedBody = validationResult.data;
    const wineId = uuidv4();
    const categoryId = `${CATEGORY_PREFIX}${validatedBody.category}`;

    // ---- 5️⃣ Create Wine Object ----
    const newWine: WineProduct = {
      // ---- Primary Keys ----
      PK: `${WINE_PREFIX}${wineId}`,
      SK: "META",

      // ---- GSI Indexes ----
      GSI1PK: "WINE",
      GSI1SK: `${validatedBody.productName}#${wineId}`,
      GSI2PK: categoryId,
      GSI2SK: `${validatedBody.productName}#${wineId}`,

      // ---- Product Details ----
      entityType: "PRODUCT",
      wineId,
      productName: validatedBody.productName,
      producer: validatedBody.producer,
      description: validatedBody.description,
      category: validatedBody.category,
      region: validatedBody.region,
      country: validatedBody.country || "Unknown",
      grapeVarietal: validatedBody.grapeVarietal || [],
      vintage: validatedBody.vintage,
      alcoholContent: validatedBody.alcoholContent || 0,
      sizeMl: validatedBody.sizeMl || 750,
      price: validatedBody.price,
      stockQuantity: validatedBody.stockQuantity,
      isInStock: validatedBody.stockQuantity > 0,
      isFeatured: validatedBody.isFeatured,
      imageUrl: validatedBody.imageUrl,
      rating: validatedBody.rating || 0,
      reviewCount: validatedBody.reviewCount || 0,

      // ---- Timestamps ----
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // ---- 6️⃣ Store in DynamoDB ----
    await doClient.send(
      new PutCommand({ TableName: TABLE_NAME, Item: newWine })
    );

    logger.info("Successfully created wine", { requestId, wineId });

    return createSuccessResponse(201, {
      message: `Wine created successfully with ID: ${wineId}`,
      wineId,
    });
  } catch (error) {
    logger.error("Error creating wine", {
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return createServerErrorResponse(
      "Error creating wine. Please try again later."
    );
  }
};
