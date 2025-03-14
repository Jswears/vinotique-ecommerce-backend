#!/bin/bash
# Description: This script deploys AWS Lambda functions

# AWS Configuration
REGION="eu-central-1"
LAMBDA_RUNTIME="nodejs22.x"

# Lambda Functions and IAM Roles
LAMBDA_FUNCTIONS=("getPresignedUrl" "createWine" "getWines" "getWineById" "updateWine" "deleteWine" "updateCart" "getCart" "deleteWineFromCart" "payment" "handleOrder" "updateStock" "getWinesByCategory" "searchWines" "getOrders")
LAMBDA_ROLES=("LambdaS3UploaderRole" "CreateWineLambdaRole" "GetWinesLambdaRole" "GetWineByIdLambdaRole" "UpdateWineLambdaRole" "DeleteWineLambdaRole" "UpdateCartLambdaRole" "GetCartLambdaRole" "DeleteWineFromCartLambdaRole" "PaymentLambdaRole" "HandleOrderLambdaRole" "UpdateStockLambdaRole" "GetWinesByCategoryLambdaRole" "SearchWinesLambdaRole" "GetOrdersLambdaRole")

# Check if Lambda function exists
function_exists() {
    aws lambda get-function --function-name "$1" --region "$REGION" &> /dev/null
    return $?
}

# Deploy a single Lambda function (create if missing)
deploy_single_lambda() {
    local index=$1
    local FUNCTION_NAME="${LAMBDA_FUNCTIONS[$index]}"
    local ROLE_ARN="arn:aws:iam::891376911200:role/${LAMBDA_ROLES[$index]}"
    local ENV_VARS=""
    local DESC=""

    # Set environment variables and descriptions for specific functions
    case $FUNCTION_NAME in
        "getPresignedUrl")
            ENV_VARS="Variables={BUCKET_NAME=vinotique-ecommerce-product-images-$REGION}"
            DESC="Get presigned URL for uploading images"
            ;;
        "payment")
            ROLE_ARN="arn:aws:iam::891376911200:role/LambdaBasicExecutionRole"
            STRIPE_SECRET_KEY=$(grep STRIPE_SECRET_KEY .env | cut -d '=' -f2)
            ENV_VARS="Variables={STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY}"
            DESC="Payment processing"
            ;;
        *)
            ENV_VARS="Variables={TABLE_NAME=WineEcommerce}"
            DESC="CRUD operations for wines"
            ;;
    esac

    echo "🚀 Deploying: $FUNCTION_NAME"

    # Zip the function
    zip -r "dist/${FUNCTION_NAME}.zip" "dist/${FUNCTION_NAME}/index.js" > /dev/null

    if function_exists "$FUNCTION_NAME"; then
        echo "🔄 Updating existing function: $FUNCTION_NAME"
        aws lambda update-function-code \
            --function-name "$FUNCTION_NAME" \
            --zip-file "fileb://dist/${FUNCTION_NAME}.zip" \
            --region "$REGION" \
            --no-cli-pager
    else
        echo "🆕 Creating new function: $FUNCTION_NAME"
        aws lambda create-function \
            --function-name "$FUNCTION_NAME" \
            --runtime "$LAMBDA_RUNTIME" \
            --role "$ROLE_ARN" \
            --handler index.handler \
            --zip-file "fileb://dist/${FUNCTION_NAME}.zip" \
            --region "$REGION" \
            --environment "$ENV_VARS" \
            --description "$DESC" \
            --no-cli-pager
    fi

    echo "✅ Deployment complete: $FUNCTION_NAME"
}

# Deploy all Lambda functions
deploy_lambda_functions() {
    echo "🚀 Deploying all Lambda functions..."
    for i in "${!LAMBDA_FUNCTIONS[@]}"; do
        deploy_single_lambda "$i"
    done
    echo "✅ All Lambda functions deployed successfully!"
}

# Interactive mode for selecting functions
interactive_deploy() {
    echo "🔹 Select Lambda functions to deploy (comma-separated, e.g., 1,3,5) or type 'all' to deploy everything:"
    for i in "${!LAMBDA_FUNCTIONS[@]}"; do
        echo "$((i+1))) ${LAMBDA_FUNCTIONS[$i]}"
    done
    echo -n "Enter your choice: "
    read -r selection

    if [[ "$selection" == "all" ]]; then
        deploy_lambda_functions
        return
    fi

    IFS=',' read -ra indices <<< "$selection"
    for num in "${indices[@]}"; do
        if [[ "$num" =~ ^[0-9]+$ ]] && (( num > 0 && num <= ${#LAMBDA_FUNCTIONS[@]} )); then
            deploy_single_lambda "$((num - 1))"
        else
            echo "❌ Invalid selection: $num"
        fi
    done
}

# Main script execution
echo "🔧 AWS Lambda Deployment Script"
echo "1) Deploy all Lambda functions"
echo "2) Deploy selected Lambda functions (interactive mode)"
echo -n "Choose an option: "
read -r choice

case $choice in
    1) deploy_lambda_functions ;;
    2) interactive_deploy ;;
    *) echo "❌ Invalid choice. Exiting..." ;;
esac
