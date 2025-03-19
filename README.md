# Vinotique E-commerce API Backend

An AWS-based serverless e-commerce API for **Vinotique**, a wine store. It uses Lambda, DynamoDB, API Gateway, Cognito for authentication, S3 for product image storage, and Stripe for payment processing.

## Table of Contents

- [Project Architecture](#project-architecture)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [Repository Setup](#repository-setup)
  - [Install Dependencies](#install-dependencies)
  - [Environment Configuration](#environment-configuration)
- [S3 Bucket Configuration](#s3-bucket-configuration)
- [Deployment Guide](#deployment-guide)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Scripts Reference](#scripts-reference)
- [Stripe Integration](#stripe-integration)
- [Additional Notes](#additional-notes)
- [License](#license)

## Project Architecture

- **Lambda**: Serverless backend logic.
- **DynamoDB**: NoSQL database for products, orders, and carts.
- **API Gateway**: Entry point for API calls.
- **Cognito**: Manages user authentication.
- **S3**: Stores product images.

## Prerequisites

- AWS CLI with proper permissions.
- Node.js and npm installed.
- AWS account with relevant IAM roles and policies.

## Getting Started

### Repository Setup

```bash
git clone https://github.com/Jswears/vinotique-ecommerce-backend.git
cd vinotique-ecommerce-api
```

### Install Dependencies

```bash
npm install
```

### Environment Configuration

Create a `.env` file in the root directory. Refer to `.env.example`. Example:

```env
TABLE_NAME=WineEcommerce
COGNITO_USER_POOL_ID=<your_cognito_user_pool_id>
COGNITO_APP_CLIENT_ID=<your_cognito_app_client_id>
STRIPE_SECRET_KEY=<your_stripe_secret_key>
EVENT_BUS_NAME=<your_event_bus_name>
BUCKET_NAME=<your_bucket_name>
AWS_REGION=<your_aws_region>
```

> _Tip_: Follow frontend repository instructions to easily set up Cognito resources with `npx ampx amplify`.

## S3 Bucket Configuration

### Update Bucket CORS

Go to **S3 > Buckets > Your Bucket > Permissions > CORS Configuration** and set:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedOrigins": ["<your_domain>"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

### Create a New S3 Bucket (Optional)

Update `/scripts/cors/bucket_cors.json` to match your domain and run:

```bash
make s3-bucket
```

### Add Optional Bucket Policy (for CloudFront)

```json
{
  "Version": "2008-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": { "Service": "cloudfront.amazonaws.com" },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::<your_bucket_name>/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::<your_account_id>:distribution/<your_distribution_id>"
        }
      }
    },
    {
      "Sid": "AllowCloudFrontOriginAccessIdentity",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity <your_identity_id>"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::<your_bucket_name>/*"
    }
  ]
}
```

## Deployment Guide

### Build and Deploy Lambdas

```bash
make build
make deploy
```

### Deploy Infrastructure

- DynamoDB:

```bash
make create-dynamodb
```

- API Gateway:

```bash
make create-api
```

> _Recommendation_: Follow the least privilege principle when creating IAM policies for each Lambda.

## API Endpoints

> **Note**: All endpoints require a valid JWT token (Cognito authorization).
>
> Frontend repo: [Vinotique E-commerce Frontend](https://github.com/Jswears/vinotique-ecommerce-frontend.git)

### Wines

- `GET /wines` — Get all wines
- `POST /wines` — Add new wine (Admin only)
- `GET /wines/{wineId}` — Get wine by ID
- `PUT /wines/{wineId}` — Update wine by ID (Admin only)
- `DELETE /wines/{wineId}` — Delete wine by ID (Admin only)

### Cart

- `GET /cart/{userId}` — Get cart items for user
- `POST /cart/{userId}` — Update cart for user

### Orders

- `GET /orders` — Get all orders (Admin only)

### Payment

- `POST /payment` — Process payment

### Presigned URL

- `POST /wines/presigned-url` — Generate S3 presigned URL (Admin only)

## Database Schema

### DynamoDB `WineEcommerce` Table

- **Primary Keys:** `PK` (Partition Key), `SK` (Sort Key)
- **GSIs:**
  - GSI1: `GSI1PK`, `GSI1SK`
  - GSI2: `GSI2PK`, `GSI2SK`

### Wine Attributes

- `entityType`, `wineId`, `productName`, `producer`, `description`, `category`, `region`, `country`, `grapeVarietal`, `vintage`, `alcoholContent`, `sizeMl`, `price`, `stockQuantity`, `isInStock`, `isFeatured`, `imageUrl`, `rating`, `reviewCount`, `createdAt`, `updatedAt`

### Order Attributes

- `orderId`, `customer`, `orderStatus`, `totalAmount`, `cartItems`, `shippingDetails`, `createdAt`

## Scripts Reference

### Build

- `make build` — Build all Lambda functions

### Deploy

- `make deploy` — Deploy all Lambda functions
- `make create-dynamodb` — Create DynamoDB stack
- `make create-api` — Create API Gateway stack

### Delete

- `make delete` — Delete all Lambda functions
- `make delete-single LAMBDA=<function_name>` — Delete single Lambda
- `make delete-cloudformation` — Remove DynamoDB and API Gateway stacks

### S3 Bucket Management

- `make s3-bucket` — Create and configure S3 bucket

## Stripe Integration

Follow [Stripe's Getting Started Guide](https://docs.stripe.com/get-started) to configure API keys and webhook endpoints. EventBridge integration happens via the webhook setup.

## Additional Notes

- The API Gateway currently uses a `dev` stage. You can add a `prod` stage as needed.
- Make sure to regularly review IAM permissions and Lambda timeouts for optimization.
- **IAM Roles and Policies**: Refer to the `/docs/iam_roles_and_policies.md` folder for detailed information on setting up and reviewing IAM roles and policies.

## License

This project is licensed under the [MIT License](LICENSE).
