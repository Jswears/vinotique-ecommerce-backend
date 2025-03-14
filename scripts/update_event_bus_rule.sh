#!/bin/bash
# Description: This script updates the EventBridge rule to attach the latest handleOrder Lambda function

# AWS Configuration
REGION="eu-central-1"
RULE_NAME="vinotique-stripe"
FUNCTION_NAME="handleOrder"
ACCOUNT_ID="891376911200"
EVENT_BUS_NAME=$(grep EVENT_BUS_NAME ../.env | cut -d '=' -f2)

# Step 1: Get existing target IDs
TARGETS=$(aws events list-targets-by-rule \
    --rule "$RULE_NAME" \
    --event-bus-name "$EVENT_BUS_NAME" \
    --region "$REGION" \
    --query "Targets[*].Id" \
    --output text)

# Step 2: Remove existing target if it exists
if [[ -n "$TARGETS" ]]; then
    echo "⚠️ Removing old target(s) from EventBridge rule: $RULE_NAME on Event Bus: $EVENT_BUS_NAME"
    aws events remove-targets \
        --rule "$RULE_NAME" \
        --event-bus-name "$EVENT_BUS_NAME" \
        --ids $TARGETS \
        --region "$REGION"
    echo "✅ Old target(s) removed successfully!"
else
    echo "ℹ️ No existing targets found for rule: $RULE_NAME on Event Bus: $EVENT_BUS_NAME. Proceeding..."
fi

# Step 3: Add the new handleOrder Lambda function as the target
echo "🚀 Attaching new handleOrder function to EventBridge rule: $RULE_NAME on Event Bus: $EVENT_BUS_NAME"
aws events put-targets \
    --rule "$RULE_NAME" \
    --event-bus-name "$EVENT_BUS_NAME" \
    --targets "Id=\"$FUNCTION_NAME\",Arn=\"arn:aws:lambda:$REGION:$ACCOUNT_ID:function:$FUNCTION_NAME\"" \
    --region "$REGION"

echo "✅ New handleOrder function attached successfully to the custom event bus!"

# Step 4: Add Lambda permission to be invoked by EventBridge
echo "🔄 Checking if Lambda function already has EventBridge permissions..."
STATEMENT_ID="EventBridgeInvokeFunction"

if aws lambda get-policy --function-name "$FUNCTION_NAME" --region "$REGION" | grep -q "$STATEMENT_ID"; then
    echo "✅ Lambda function already has EventBridge permissions."
else
    echo "🚀 Adding invoke permission for EventBridge to Lambda function..."
    aws lambda add-permission \
        --function-name "$FUNCTION_NAME" \
        --statement-id "$STATEMENT_ID" \
        --action "lambda:InvokeFunction" \
        --principal "events.amazonaws.com" \
        --source-arn "arn:aws:events:$REGION:$ACCOUNT_ID:rule/$EVENT_BUS_NAME/$RULE_NAME" \
        --region "$REGION"
    echo "✅ Lambda function invoke permission added successfully!"
fi

# Step 5: Ensure the EventBridge rule is enabled
echo "🔄 Ensuring the EventBridge rule is enabled..."
aws events enable-rule --name "$RULE_NAME" --event-bus-name "$EVENT_BUS_NAME" --region "$REGION"
echo "✅ EventBridge rule is now enabled and active!"
