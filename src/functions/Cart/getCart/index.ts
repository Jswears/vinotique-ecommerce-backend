import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import Logger from "../../../utils/logger";
import {
  BatchGetCommand,
  DynamoDBDocumentClient,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { APIGatewayEvent, Handler } from "aws-lambda";
import {
  createErrorResponse,
  createSuccessResponse,
} from "../../../utils/returnResponse";
import { CartItem } from "../../../types";

// ---- Constants ----
const TABLE_NAME = process.env.TABLE_NAME || "WineEcommerce";
const logger = new Logger("getCart");

// ---- DynamoDB client ----
const client = new DynamoDBClient({});
const doClient = DynamoDBDocumentClient.from(client);

// ---- Validate environment variables ----
if (!TABLE_NAME) {
  throw new Error("TABLE_NAME environment variable is not set");
}

// ---- Handler ----
export const handler: Handler = async (event: APIGatewayEvent) => {
  try {
    logger.info("Event received", event);

    // Extract and validate userId from path parameters
    const { userId } = event.pathParameters || {};

    if (!userId) {
      logger.error("Missing userId");
      return createErrorResponse(400, "Missing userId");
    }

    // Query for cart items using userId composite key
    const cartResult = await doClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": `USER#${userId}`,
          ":sk": "CART#",
        },
      })
    );

    // Flatten cart items from query result
    const carts = cartResult.Items || [];
    const cartItems: CartItem[] = carts.flatMap(
      (item: any) => item.cartItems || []
    );

    if (cartItems.length === 0) {
      logger.info("Cart is empty");
      return createErrorResponse(404, `No cart found for user ${userId}`);
    }

    logger.info(`Found ${cartItems.length} items in cart for user ${userId}`);

    // Extract wineIds for details lookup
    const wineIds = cartItems.map((item) => item.wineId);

    // Prepare DynamoDB keys for product details
    const productKeys = wineIds.map((wineId) => ({
      PK: `WINE#${wineId}`,
      SK: "META",
    }));

    // Utility to split array into chunks (max 100 keys per batch)
    const chunkArray = <T>(arr: T[], size: number): T[][] =>
      Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
        arr.slice(i * size, i * size + size)
      );

    const productChunks = chunkArray(productKeys, 100);
    const productResponses = await Promise.all(
      productChunks.map(async (chunk) => {
        const response = await doClient.send(
          new BatchGetCommand({
            RequestItems: {
              [TABLE_NAME]: {
                Keys: chunk,
                ProjectionExpression: "wineId, productName, price, imageUrl",
              },
            },
          })
        );
        return response.Responses?.[TABLE_NAME] || [];
      })
    );

    // Flatten product details responses
    const allProducts = productResponses.flat();

    logger.info("Product details", productResponses);

    // Map product details to corresponding cart items
    const productMap = new Map(allProducts.map((p) => [p.wineId, p]));

    const enrichedCart = cartItems.map((item) => {
      const product = productMap.get(item.wineId);
      return {
        ...item,
        productName: product?.productName || "Unknown",
        price: product?.price || 0,
        imageUrl: product?.imageUrl || "",
      };
    });

    // Calculate total price for enriched cart
    const totalPrice = enrichedCart.reduce(
      (sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 1),
      0
    );

    logger.info("Enriched cart", enrichedCart);
    return createSuccessResponse(200, { cartItems: enrichedCart, totalPrice });
  } catch (error) {
    logger.error(
      `Error getting cart: ${error instanceof Error ? error.message : error}`
    );
    return createErrorResponse(500, "Error getting cart");
  }
};
