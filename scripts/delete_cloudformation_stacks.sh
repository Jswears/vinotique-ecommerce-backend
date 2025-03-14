#!/bin/bash
# ------------------------------------------------------------------
# Description: This script deletes AWS CloudFormation stacks for
#              DynamoDB and API Gateway.
# ------------------------------------------------------------------

# AWS Configuration
REGION="eu-central-1"
DYNAMODB_STACK="WineEcommerceDB"
API_STACK="WineEcommerceAPI"
LOG_FILE="logs/cloudformation_delete.log"

# Function to delete a CloudFormation stack
delete_stack() {
    local STACK_NAME=$1

    echo "🚨 Deleting CloudFormation stack: $STACK_NAME" | tee -a "$LOG_FILE"

    if aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" &> /dev/null; then
        aws cloudformation delete-stack --stack-name "$STACK_NAME" --region "$REGION"
        echo "⏳ Waiting for stack deletion to complete..." | tee -a "$LOG_FILE"
        aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME" --region "$REGION"
        echo "✅ Stack '$STACK_NAME' successfully deleted!" | tee -a "$LOG_FILE"
    else
        echo "⚠️ Stack '$STACK_NAME' does not exist or is already deleted." | tee -a "$LOG_FILE"
    fi
}

# Main execution
echo "⚠️ WARNING: This will delete the CloudFormation stacks!"
read -p "Are you sure you want to proceed? (yes/no): " CONFIRMATION

if [[ "$CONFIRMATION" == "yes" ]]; then
    delete_stack "$DYNAMODB_STACK"
    delete_stack "$API_STACK"
else
    echo "🚫 Deletion canceled."
fi
