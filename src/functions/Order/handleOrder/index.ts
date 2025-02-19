import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  BatchGetCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import Logger from "../../../utils/logger";
import { v4 } from "uuid";
import { EventBridgeEvent, Handler } from "aws-lambda";
import {
  createErrorResponse,
  createSuccessResponse,
} from "../../../utils/returnResponse";
import { invokeLambda } from "../../../utils/lambdaInvoker";

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
const fetchCartFromDynamoDB = async (userId: string) => {
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: {
      ":pk": `USER#${userId}`,
      ":sk": "CART#",
    },
  };
  const cartResult = await doClient.send(new QueryCommand(params));

  // Flatten cart items from query result
  const carts = cartResult.Items || [];
  const cartItems = carts.flatMap((item: any) => item.cartItems || []);

  if (cartItems.length === 0) {
    logger.info("Cart is empty");
    return createErrorResponse(400, "Cart is empty");
  }
  logger.info(`Found ${cartItems.length} items in cart for user ${userId}`);

  return cartItems;
};

const createEnrichedCartItems = async (cartItems: any) => {
  // Extract wineIds for details lookup
  const wineIds = cartItems.map((item: any) => item.wineId);

  // Prepare DynamoDB query for wine details
  const productKeys = wineIds.map((wineId: string) => ({
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
              Keys: chunk as Record<string, any>[],
              ProjectionExpression: "wineId, productName, price",
            },
          },
        })
      );
      return response.Responses?.[TABLE_NAME] || [];
    })
  );
  const products = productResponses.flat();
  logger.info("Product details", products);

  //Map product details to cart items
  const productMap = new Map(products.map((p) => [p.wineId, p]));

  const enrichedCartItems = cartItems.map((item: any) => {
    const product = productMap.get(item.wineId);
    return {
      ...item,
      productName: product?.productName || "Unknown",
      price: product?.price || 0,
    };
  });
  return enrichedCartItems;
};

const createOrder = async (order: any, cartItems: any) => {
  try {
    const orderId = v4();
    const now = new Date();

    const item = {
      PK: `ORDER#${orderId}`,
      SK: `ORDER#${orderId}`,
      GSI1PK: `ORDER`,
      GSI1SK: `ORDER#${orderId}`,
      entityType: "ORDER",
      orderStatus: "PENDING",
      customer: order.shipping_details?.name,
      orderId,
      userId: order.metadata?.userId,
      status: order.status,
      totalAmount: order.amount_total / 100,
      cartItems,
      shippingDetails: order.shipping_details,
      createdAt: now.toISOString(),
    };

    const params = {
      TableName: TABLE_NAME,
      Item: item,
    };

    await doClient.send(new PutCommand(params));
    return {
      message: "Order created successfully",
      orderId,
      orderStatus: "PENDING",
      items: item.cartItems,
    };
  } catch (error) {
    logger.error("Error creating order", error);
    throw new Error("Error creating order");
  }
};

const clearCart = async (userId: string) => {
  logger.info(`Clearing cart for user ${userId}`);
  await doClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: `CART#${userId}`,
      },
    })
  );
  logger.info(`Cart cleared for user ${userId}`);
};

// Invoke the updateStock function to update the stock of the wine
const updateStock = async (items: any) => {
  logger.info(
    `Invoking updateStock function with payload: ${JSON.stringify(items)}`
  );

  const invokeResponse = await invokeLambda({
    FunctionName: process.env.UPDATE_STOCK_FUNCTION_NAME || "updateStock",
    Payload: {
      items,
    },
  });

  logger.info("Stock updated successfully", invokeResponse);
};

// ---- Handler function ----
export const handler: Handler = async (
  event: EventBridgeEvent<string, any>
) => {
  try {
    // Receive event from event bridge
    const { detail } = event;
    logger.info("Received order event", detail);

    if (!detail) {
      return createErrorResponse(400, "Invalid request body");
    }

    // Create order
    const order = detail.data.object;
    logger.info("Creating order", order);

    // Fetch cart items from DynamoDB
    const cartItems = await fetchCartFromDynamoDB(order.metadata?.userId);
    const enrichedCartItems = await createEnrichedCartItems(cartItems);

    const orderResult = await createOrder(order, enrichedCartItems);

    logger.info("Order created successfully", orderResult);

    // Clear cart
    await clearCart(order.metadata.userId);

    // Invoke updateStock function
    await updateStock(orderResult.items);
    return createSuccessResponse(
      200,
      `Order created successfully ${orderResult}`
    );
  } catch (error) {
    logger.error("Error creating order", error);
    return createErrorResponse(500, "Error creating order");
  }
};
