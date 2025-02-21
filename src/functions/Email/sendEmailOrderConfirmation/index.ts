import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { APIGatewayEvent, Handler, APIGatewayProxyResult } from "aws-lambda";

// Initialize SES Client
const ses = new SESClient({ region: process.env.AWS_REGION || "eu-central-1" });

const formatOrderDetails = (order: any) => {
  const {
    shippingDetails,
    totalAmount,
    orderStatus,
    orderId,
    createdAt,
    cartItems,
    customer,
  } = order;
  const items = cartItems
    .map(
      (item: any) =>
        `- ${item.productName} (Quantity: ${item.quantity}, Price: ${
          item.price / 100
        } EUR)`
    )
    .join("\n");

  return `
    Order ID: ${orderId}
    Customer: ${customer}
    Status: ${orderStatus}
    Created At: ${new Date(createdAt).toLocaleString()}
    Shipping Details:
      Name: ${shippingDetails.name}
      Address: ${shippingDetails.address.line1}, ${
    shippingDetails.address.city
  }, ${shippingDetails.address.postal_code}, ${shippingDetails.address.country}
    Total Amount: ${totalAmount / 100} EUR
    Items:
    ${items}
  `;
};

export const handler: Handler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Parse request body (assuming it's JSON)
    const body = event.body ? JSON.parse(event.body) : {};
    console.log("event", event);
    // Extract recipient email from request body or fallback to default
    const toEmail = body.toEmail || process.env.TO_EMAIL;
    if (!toEmail) {
      throw new Error("Recipient email is required.");
    }

    // Extract orders from request body
    const orders = body.orders || [];
    if (orders.length === 0) {
      throw new Error("No orders found in the request.");
    }

    // Format order details
    const orderDetails = orders.map(formatOrderDetails).join("\n\n");

    // Prepare SES email command
    const command = new SendEmailCommand({
      Destination: {
        ToAddresses: [toEmail],
      },
      Message: {
        Body: {
          Text: { Data: orderDetails },
        },
        Subject: { Data: body.subject || "Order Confirmation" },
      },
      Source: process.env.SOURCE_EMAIL || "ji.swearssalinas@gmail.com",
    });

    // Send email
    await ses.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Email sent successfully" }),
    };
  } catch (error) {
    console.error("Email sending error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to send email" }),
    };
  }
};
