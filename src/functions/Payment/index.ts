import Logger from "../../utils/logger";
import { APIGatewayEvent, Handler } from "aws-lambda";
import {
  createErrorResponse,
  createSuccessResponse,
} from "../../utils/returnResponse";
import { Stripe } from "stripe";

// ---- Constants ----
const logger = new Logger("payment");
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const stripe = new Stripe(STRIPE_SECRET_KEY);

// ---- Validate environment variables ----
if (!STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is not set");
}

// ---- Handler function ----
export const handler: Handler = async (event: APIGatewayEvent) => {
  try {
    const body = JSON.parse(event.body || "{}");
    logger.info("Received payment request", body);

    if (!body) {
      return createErrorResponse(400, "Invalid request body");
    }

    // Process payment here
    const { cartItems, successUrl, cancelUrl, metadata } = body;

    const lineItems = cartItems.map((item: any) => ({
      price_data: {
        currency: "eur",
        product_data: {
          name: item.productName,
          images: [item.imageUrl],
        },
        unit_amount: item.price,
      },
      quantity: item.quantity,
    }));

    logger.info("Creatig stripe payment session", lineItems);

    // Create stripe payment session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      billing_address_collection: "required",
      automatic_tax: { enabled: true },
      shipping_address_collection: {
        allowed_countries: ["US", "CA", "GB", "DE", "FR", "ES", "IT"],
      },
      metadata,
    });

    logger.info("Stripe session created", session);

    return createSuccessResponse(200, { sessionUrl: session.url });
  } catch (error) {
    logger.error("Error processing payment", error);
    return createErrorResponse(500, "Error processing payment");
  }
};
