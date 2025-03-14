#!/bin/bash
# Description: This script deletes AWS Lambda functions

# AWS Configuration
REGION="eu-central-1"

# Lambda Functions List
LAMBDA_NAMES=("getPresignedUrl" "getWines" "getWineById" "createWine" "updateWine" "deleteWine" "updateCart" "getCart" "payment" "handleOrder" "updateStock" "getWinesByCategory" "searchWines" "getOrders")

# Function to delete all Lambda functions
delete_lambda_functions() {
    echo "⚠️ Deleting all Lambda functions..."
    for i in "${!LAMBDA_NAMES[@]}"; do
        delete_single_lambda "$i"
    done
    echo "✅ All Lambda functions deleted successfully!"
}

# Function to delete a single Lambda function
delete_single_lambda() {
    local index=$1
    local FUNCTION_NAME="${LAMBDA_NAMES[$index]}"
    
    echo "🚨 Deleting: $FUNCTION_NAME"

    # AWS CLI command to delete the function
    aws lambda delete-function \
        --function-name "$FUNCTION_NAME" \
        --region "$REGION" \
        --no-cli-pager

    echo "✅ Deleted: $FUNCTION_NAME"
}

# Interactive mode for deletion
interactive_delete() {
    echo "🔹 Select Lambda functions to delete (comma-separated, e.g., 1,3,5) or type 'all' to delete everything:"
    for i in "${!LAMBDA_NAMES[@]}"; do
        echo "$((i+1))) ${LAMBDA_NAMES[$i]}"
    done
    echo -n "Enter your choice: "
    read -r selection

    if [[ "$selection" == "all" ]]; then
        delete_lambda_functions
        return
    fi

    IFS=',' read -ra indices <<< "$selection"
    for num in "${indices[@]}"; do
        if [[ "$num" =~ ^[0-9]+$ ]] && (( num > 0 && num <= ${#LAMBDA_NAMES[@]} )); then
            delete_single_lambda "$((num - 1))"
        else
            echo "❌ Invalid selection: $num"
        fi
    done
}

# Main script execution
echo "🔧 AWS Lambda Deletion Script"
echo "⚠️ Warning: This action is irreversible!"
echo "1) Delete all Lambda functions"
echo "2) Delete selected Lambda functions (interactive mode)"
echo -n "Choose an option: "
read -r choice

case $choice in
    1) delete_lambda_functions ;;
    2) interactive_delete ;;
    *) echo "❌ Invalid choice. Exiting..." ;;
esac
