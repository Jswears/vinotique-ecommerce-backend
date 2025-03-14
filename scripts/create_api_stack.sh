#!/bin/bash
# ------------------------------------------------------------------------------
# Description: This script deploys or updates the Vinotique API Gateway 
#              (with Cognito authentication) and enforces CORS.
# ------------------------------------------------------------------------------

# Default variables
REGION="eu-central-1"
STAGE_NAME="dev"
STACK_NAME="WineEcommerceAPI"
API_STACK_FILE="cf_stacks/api-gateway-stack.yaml"
LOG_FILE="logs/api_gateway_deploy.log"
UPDATE_MODE=false

# Load environment variables from .env file if present
if [[ -f ".env" ]]; then
    export $(grep -v '^#' .env | xargs)
fi

# ------------------------------------------------------------------------------
# 1) Show usage/help
# ------------------------------------------------------------------------------
usage() {
    cat <<EOF
Usage: $0 [options] [update-stack]

Options:
  --region <region>        AWS region (default: ${REGION})
  --stage <stage>          Deployment stage (default: ${STAGE_NAME})
  --stack-name <stack>     Name of the CloudFormation stack (default: ${STACK_NAME})
  update-stack             Updates the existing stack without prompting for Cognito IDs
  -h, --help               Show this help text

Examples:
  $0 --region us-east-1 --stage dev --stack-name MyApiStack
  $0 update-stack  # Updates the stack using values from .env

Logs are stored in:
  ${LOG_FILE}
EOF
    exit 1
}

# ------------------------------------------------------------------------------
# 2) Parse command-line arguments
# ------------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        update-stack)
            UPDATE_MODE=true
            shift
            ;;
        --region)
            REGION="$2"
            shift
            shift
            ;;
        --stage)
            STAGE_NAME="$2"
            shift
            shift
            ;;
        --stack-name)
            STACK_NAME="$2"
            shift
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo "Unknown option: $1"
            usage
            ;;
    esac
done

# ------------------------------------------------------------------------------
# 3) Setup & prerequisite checks
# ------------------------------------------------------------------------------
mkdir -p logs

if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install and configure AWS CLI first." | tee -a "$LOG_FILE"
    exit 1
fi

if ! aws sts get-caller-identity --region "$REGION" &> /dev/null; then
    echo "❌ AWS credentials not configured or invalid. Run 'aws configure'." | tee -a "$LOG_FILE"
    exit 1
fi

if [[ ! -f "$API_STACK_FILE" ]]; then
    echo "❌ Template file '${API_STACK_FILE}' not found." | tee -a "$LOG_FILE"
    exit 1
fi

# ------------------------------------------------------------------------------
# 4) Retrieve Cognito parameters from .env or prompt user
# ------------------------------------------------------------------------------
if [[ -z "$COGNITO_USER_POOL_ID" || -z "$COGNITO_APP_CLIENT_ID" ]]; then
    if [[ -f ".env" ]]; then
        echo "⚠️ .env file is missing Cognito values. Prompting for input..."
    fi

    read -p "Enter Cognito User Pool ID: " COGNITO_USER_POOL_ID
    read -p "Enter Cognito App Client ID: " COGNITO_APP_CLIENT_ID

    if [[ -z "$COGNITO_USER_POOL_ID" || -z "$COGNITO_APP_CLIENT_ID" ]]; then
        echo "❌ Error: Cognito User Pool ID and App Client ID are required."
        exit 1
    fi
fi

# ------------------------------------------------------------------------------
# 5) Deploy or Update API Gateway Stack
# ------------------------------------------------------------------------------
deploy_api_stack() {
    echo "🚀 Deploying API Gateway Stack..." | tee -a "$LOG_FILE"

    if aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" &> /dev/null; then
        echo "⚠️ Stack '$STACK_NAME' already exists."

        echo "🔄 Updating stack..." | tee -a "$LOG_FILE"
        aws cloudformation update-stack \
            --stack-name "$STACK_NAME" \
            --template-body file://"$API_STACK_FILE" \
            --region "$REGION" \
            --parameters \
                ParameterKey=StageName,ParameterValue="$STAGE_NAME" \
                ParameterKey=CognitoUserPoolId,ParameterValue="$COGNITO_USER_POOL_ID" \
                ParameterKey=CognitoAppClientId,ParameterValue="$COGNITO_APP_CLIENT_ID" \
            --capabilities CAPABILITY_IAM \
            --no-cli-pager --output json >> "$LOG_FILE" 2>&1

        echo "⏳ Waiting for stack update to complete..." | tee -a "$LOG_FILE"
        aws cloudformation wait stack-update-complete --stack-name "$STACK_NAME" --region "$REGION"
    else
        echo "🔹 Creating new stack: $STACK_NAME..." | tee -a "$LOG_FILE"
        aws cloudformation create-stack \
            --stack-name "$STACK_NAME" \
            --template-body file://"$API_STACK_FILE" \
            --region "$REGION" \
            --parameters \
                ParameterKey=StageName,ParameterValue="$STAGE_NAME" \
                ParameterKey=CognitoUserPoolId,ParameterValue="$COGNITO_USER_POOL_ID" \
                ParameterKey=CognitoAppClientId,ParameterValue="$COGNITO_APP_CLIENT_ID" \
            --capabilities CAPABILITY_IAM \
            --no-cli-pager --output json >> "$LOG_FILE" 2>&1

        echo "⏳ Waiting for stack creation to complete..." | tee -a "$LOG_FILE"
        aws cloudformation wait stack-create-complete --stack-name "$STACK_NAME" --region "$REGION"
    fi
}

# ------------------------------------------------------------------------------
# 6) Run deployment steps
# ------------------------------------------------------------------------------
deploy_api_stack
