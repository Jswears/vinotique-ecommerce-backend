import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayEvent, Handler, Context } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import {
  createBadRequestResponse,
  createErrorResponse,
  createServerErrorResponse,
  createSuccessResponse,
} from "../../../utils/returnResponse";
import Logger from "../../../utils/logger";
import { isValidUrl } from "../../../utils/validators/urlValidator";
import { z } from "zod";
import { Wine } from "../../../types";

// Constants
const TABLE_NAME = process.env.TABLE_NAME || "";
const logger = new Logger("createWine");

// DynamoDB client
const dynamoDbClient = new DynamoDBClient({});
const doClient = DynamoDBDocumentClient.from(dynamoDbClient);

// Validate environment variables
if (!TABLE_NAME) {
  throw new Error("TABLE_NAME environment variable is not set");
}

// Zod schema
enum WineTypeEnum {
  Red = "Red",
  White = "White",
  Rose = "Rose",
  Sparkling = "Sparkling",
  Dessert = "Dessert",
  Fortified = "Fortified",
}

const WineSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  price: z.number().min(0.01, "Price must be greater than 0"),
  wineType: z.nativeEnum(WineTypeEnum, {
    errorMap: () => ({ message: "Invalid Wine Type" }),
  }),
  region: z.string().min(1, "Region is required"),
  producer: z.string().min(1, "Producer is required"),
  year: z.number().min(1900, "Year must be greater than 1900"),
  stock: z.number().min(0, "Stock must be greater than or equal to 0"),
  sku: z.string().min(1, "SKU is required"),
  imageUrl: z.string().refine((url) => isValidUrl(url), {
    message: "Invalid image URL",
  }),
  createdAt: z.string().optional(),
  isFeatured: z.boolean().default(false),
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
  const body = JSON.parse(event.body || "{}");

  logger.info("Received request to create a new wine", {
    requestId: context.awsRequestId,
    body: body,
  });

  try {
    if (!body) {
      logger.warn("Empty request body", { requestId: context.awsRequestId });
      return createErrorResponse(400, "Request body is required");
    }

    const validatedBody = validateWineSchema(body);

    const wineId = uuidv4();

    const { name, wineType, stock, ...rest } = validatedBody;

    const newWine: Wine = {
      PK: `WINE#${wineId}`,
      SK: `WINE#${wineId}`,
      entityType: "WINE",
      GSI1PK: "WINE",
      GSI1SK: `${name}#${wineId}`,
      GSI2PK: `CATEGORY#${wineType}`,
      GSI2SK: `${name}#${wineId}`,
      isAvailable: stock > 0,
      name,
      wineType,
      stock,
      ...rest,
    };

    await doClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: newWine,
      })
    );

    logger.info("Successfully created wine", {
      requestId: context.awsRequestId,
      newWine: newWine,
    });

    return createSuccessResponse(201, {
      message: `Wine created with ID: ${wineId}`,
      data: newWine,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      logger.warn("Validation error", {
        requestId: context.awsRequestId,
        error: error.errors.map((e) => e.message).join(", "),
      });
      return createBadRequestResponse(
        error.errors.map((e) => e.message).join(", ")
      );
    }
    logger.error(`Error creating wine: ${JSON.stringify(error, null, 2)}`, {
      requestId: context.awsRequestId,
    });
    return createServerErrorResponse(`Error creating wine: ${error.message}`);
  }
};
