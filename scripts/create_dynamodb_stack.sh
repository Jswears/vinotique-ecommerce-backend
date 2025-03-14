#!/bin/bash
# Description: This script deploys a DynamoDB table using AWS CloudFormation

# Variables
REGION="eu-central-1"
STACK_NAME="WineEcommerceDB"
TEMPLATE_PATH="cf_stacks/dynamodb-stack.yaml"
LOG_FILE="logs/cloudformation_output.json"

# Function to check if the stack exists
stack_exists() {
    aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" &> /dev/null
    return $?
}

# Function to create or update the DynamoDB stack
deploy_dynamodb_stack() {
    echo "🚀 Deploying DynamoDB CloudFormation stack..."
    if stack_exists; then
        echo "⚠️ Stack '$STACK_NAME' already exists. Updating..."
        aws cloudformation update-stack --stack-name "$STACK_NAME" \
            --template-body file://"$TEMPLATE_PATH" \
            --region "$REGION" --no-cli-pager --output json > "$LOG_FILE"
        aws cloudformation wait stack-update-complete --stack-name "$STACK_NAME" --region "$REGION"
    else
        echo "🔹 Creating new stack: $STACK_NAME"
        aws cloudformation create-stack --stack-name "$STACK_NAME" \
            --template-body file://"$TEMPLATE_PATH" \
            --region "$REGION" --no-cli-pager --output json > "$LOG_FILE"
        aws cloudformation wait stack-create-complete --stack-name "$STACK_NAME" --region "$REGION"
    fi

    if [ $? -eq 0 ]; then
        echo "✅ DynamoDB stack successfully deployed!"
    else
        echo "❌ Stack deployment failed. Check logs: $LOG_FILE"
    fi
}

# Confirmation before execution
echo "⚠️ This will deploy/update the CloudFormation stack for DynamoDB."
read -p "Proceed? (yes/no): " choice
if [[ "$choice" == "yes" ]]; then
    deploy_dynamodb_stack
else
    echo "🚫 Deployment canceled."
fi
