import { DynamoDBClient, ReturnValue } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  UpdateCommand,
  QueryCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import Logger from "../../../utils/logger";
import { APIGatewayEvent, Handler } from "aws-lambda";
import {
  createErrorResponse,
  createSuccessResponse,
} from "../../../utils/returnResponse";
import { v4 } from "uuid";
import { CartDocument } from "../../../types";

// ---- Constants ----
const TABLE_NAME = process.env.TABLE_NAME || "";
const CART_TTL_SECONDS = Number(process.env.CART_TTL_SECONDS) || 3600;
const logger = new Logger("updateCart");
const USER_ID_PREFIX = "USER#";
const CART_PREFIX = "CART#";
const VALID_ACTIONS = ["add", "remove", "clearCart"];

// ---- DynamoDB client ----
const dynamoDbClient = new DynamoDBClient({});
const doClient = DynamoDBDocumentClient.from(dynamoDbClient);

// ---- Validate environment variables ----
if (!TABLE_NAME) {
  throw new Error("TABLE_NAME environment variable is not set");
}

// ---- Helper functions ----
async function getOrCreateCart(userId: string): Promise<CartDocument> {
  const { Items } = await doClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `${USER_ID_PREFIX}${userId}`,
        ":sk": CART_PREFIX,
      },
      Limit: 1,
    })
  );

  if (Items && Items.length > 0) {
    return Items[0] as CartDocument;
  }

  const cartId = v4();
  const now = new Date();
  const expiresAt = Math.floor(now.getTime() / 1000) + CART_TTL_SECONDS;
  const newCart: CartDocument = {
    PK: `${USER_ID_PREFIX}${userId}`,
    SK: `${CART_PREFIX}${cartId}`,
    cartId,
    cartItems: [],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt, // Set expiration on creation
  };
  logger.info("Creating new cart", newCart);
  return newCart;
}

async function deleteCart(cart: CartDocument): Promise<void> {
  await doClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: cart.PK,
        SK: cart.SK,
      },
    })
  );
  logger.info("Deleted cart", cart);
}

async function updateCart(
  userId: string,
  wineId: string,
  newQuantity: number,
  action: "add" | "remove" | "clearCart"
): Promise<string> {
  const cart = await getOrCreateCart(userId);

  const now = new Date();
  let updatedCartItems = cart.cartItems;
  if (action === "clearCart") {
    updatedCartItems = [];
  } else {
    const existingItemIndex = updatedCartItems.findIndex(
      (item) => item.wineId === wineId
    );

    if (existingItemIndex !== -1) {
      if (action === "add") {
        updatedCartItems[existingItemIndex].quantity += newQuantity;
      } else {
        updatedCartItems[existingItemIndex].quantity -= newQuantity;
      }

      if (updatedCartItems[existingItemIndex].quantity <= 0) {
        updatedCartItems = updatedCartItems.filter(
          (item) => item.wineId !== wineId
        );
      }
    } else {
      updatedCartItems.push({
        wineId,
        quantity: newQuantity,
        addedAt: now.toISOString(),
      });
    }
  }

  if (updatedCartItems.length === 0) {
    await deleteCart(cart);
    return "Cart deleted successfully";
  }

  const expiresAt = Math.floor(now.getTime() / 1000) + CART_TTL_SECONDS;

  await doClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: cart.PK,
        SK: cart.SK,
      },
      UpdateExpression:
        "SET #cartItems = :cartItems, updatedAt = :updatedAt, expiresAt = :expiresAt",
      ExpressionAttributeNames: {
        "#cartItems": "cartItems",
      },
      ExpressionAttributeValues: {
        ":cartItems": updatedCartItems,
        ":updatedAt": now.toISOString(),
        ":expiresAt": expiresAt,
      },
      ReturnValues: ReturnValue.ALL_NEW,
    })
  );
  return `Cart updated successfully with ${newQuantity} cartItems and action ${action}`;
}

// ---- Handler ----
//TODO: Change to get userId from pathParameters and not from body
export const handler: Handler = async (event: APIGatewayEvent) => {
  logger.info("Received event", event);
  try {
    const { cartItems } = JSON.parse(event.body || "{}");

    logger.info("Processing cartItems", cartItems);

    const messages: string[] = [];
    for (const item of cartItems) {
      const { userId, wineId, quantity, action } = item;

      if (!VALID_ACTIONS.includes(action)) {
        return createErrorResponse(400, "Invalid action");
      }

      const message = await updateCart(userId, wineId, quantity, action);
      messages.push(message);
    }

    return createSuccessResponse(200, { messages });
  } catch (error) {
    logger.error("Error processing item", error);

    return createErrorResponse(500, "Error processing item");
  }
};
