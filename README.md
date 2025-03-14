# Vinotique E-commerce API

This project is an e-commerce API for Vinotique, a wine store. It is built using AWS services such as Lambda, DynamoDB, API Gateway, and Cognito for authentication. The API supports various operations like managing wines, handling orders, updating stock, and processing payments.

## Table of Contents

- [Architecture](#architecture)
- [Setup](#setup)
- [Deployment](#deployment)
- [API Endpoints](#api-endpoints)
- [Scripts](#scripts)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)

## Architecture

The API is built using the following AWS services:

- **Lambda**: For serverless functions.
- **DynamoDB**: For storing wine products, orders, and cart items.
- **API Gateway**: For exposing the API endpoints.
- **Cognito**: For user authentication and authorization.
- **S3**: For storing product images.

## Setup

### Prerequisites

- AWS CLI configured with appropriate permissions.
- Node.js and npm installed.
- AWS account with necessary IAM roles and policies.

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/Jswears/vinotique-ecommerce-backend.git
   cd vinotique-ecommerce-api
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add the necessary environment variables:
   ```env
   TABLE_NAME=WineEcommerce
   BUCKET_NAME=your_bucket_name_for_images
   STRIPE_SECRET_KEY=your_stripe_secret_key
   COGNITO_USER_POOL_ID=your_cognito_user_pool_id
   COGNITO_APP_CLIENT_ID=your_cognito_app_client_id
   ```

## Deployment

### Build and Deploy Lambda Functions

1. Build all Lambda functions:

   ```bash
   make build
   ```

2. Deploy all Lambda functions:
   ```bash
   make deploy
   ```

### Deploy CloudFormation Stacks

1. Deploy DynamoDB stack:

   ```bash
   make create-dynamodb
   ```

2. Deploy API Gateway stack:
   ```bash
   make create-api
   ```

## API Endpoints

### Wines

- `GET /wines`: Retrieve all wines.
- `POST /wines`: Create a new wine (Admin only).
- `GET /wines/{wineId}`: Retrieve a wine by ID.
- `PUT /wines/{wineId}`: Update a wine by ID (Admin only).
- `DELETE /wines/{wineId}`: Delete a wine by ID (Admin only).

### Cart

- `GET /cart/{userId}`: Retrieve cart items for a user.
- `POST /cart/{userId}`: Update cart items for a user.

### Orders

- `GET /orders`: Retrieve all orders (Admin only).

### Payment

- `POST /payment`: Process a payment.

### Presigned URL

- `POST /wines/presigned-url`: Get a presigned URL for uploading images (Admin only).

## Scripts

### Build Scripts

- `make build`: Build lambda function, gives the option to build a single function using `LAMBDA` variable.

### Deployment Scripts

- `make deploy`: Deploy lambda functions, gives the option to deploy all functions or a single function using `LAMBDA` variable.

### Deletion Scripts

- `make delete`: Delete all Lambda functions.
- `make delete-single LAMBDA=<function_name>`: Delete a single Lambda function.
- `make delete-cloudformation`: Delete both DynamoDB and API Gateway stacks.

## Environment Variables

- `TABLE_NAME`: Name of the DynamoDB table.
- `BUCKET_NAME`: Name of the S3 bucket for storing product images.
- `STRIPE_SECRET_KEY`: Stripe secret key for payment processing.
- `COGNITO_USER_POOL_ID`: Cognito User Pool ID for authentication.
- `COGNITO_APP_CLIENT_ID`: Cognito App Client ID for authentication.

## Database Schema

The DynamoDB table `WineEcommerce` has the following schema:

### Primary Keys

- `PK` (Partition Key): Primary key for the table.
- `SK` (Sort Key): Secondary key for the table.

### Global Secondary Indexes (GSI)

- `GSI1`:
  - `GSI1PK` (Partition Key)
  - `GSI1SK` (Sort Key)
- `GSI2`:
  - `GSI2PK` (Partition Key)
  - `GSI2SK` (Sort Key)

### Wine Attributes

- `PK`: Primary key for the table.
- `SK`: Secondary key for the table.
- `GSI1PK`: Partition key for the first global secondary index.
- `GSI1SK`: Sort key for the first global secondary index.
- `GSI2PK`: Partition key for the second global secondary index.
- `GSI2SK`: Sort key for the second global secondary index.
- `entityType`: Type of the entity (e.g., `PRODUCT`, `ORDER`).
- `wineId`: Unique identifier for the wine.
- `productName`: Name of the wine product.
- `producer`: Producer of the wine.
- `description`: Description of the wine.
- `category`: Category of the wine.
- `region`: Region where the wine is produced.
- `country`: Country where the wine is produced.
- `grapeVarietal`: Array of grape varietals used in the wine.
- `vintage`: Year the wine was produced.
- `alcoholContent`: Alcohol content of the wine.
- `sizeMl`: Size of the wine bottle in milliliters.
- `price`: Price of the wine.
- `stockQuantity`: Quantity of the wine in stock.
- `isInStock`: Boolean indicating if the wine is in stock.
- `isFeatured`: Boolean indicating if the wine is featured.
- `imageUrl`: URL of the wine product image.
- `rating`: Rating of the wine.
- `reviewCount`: Number of reviews for the wine.
- `createdAt`: Timestamp when the wine was created.
- `updatedAt`: Timestamp when the wine was last updated.

### Order Attributes

- `orderId`: Unique identifier for the order.
- `customer`: Customer name.
- `orderStatus`: Status of the order (e.g., `PENDING`, `COMPLETED`).
- `totalAmount`: Total amount of the order.
- `cartItems`: Array of items in the cart.
- `shippingDetails`: Shipping details for the order.
- `createdAt`: Timestamp when the order was created.

## License

This project is licensed under the MIT License.
