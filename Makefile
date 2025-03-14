# Makefile for managing AWS Lambda functions and API Gateway

# AWS Configuration
REGION := eu-central-1
BUILD_SCRIPT := scripts/build_lambdas.sh
DEPLOY_SCRIPT := scripts/deploy_lambdas.sh
DELETE_SCRIPT := scripts/delete_lambdas.sh
DYNAMODB_SCRIPT := scripts/create_dynamodb_stack.sh
API_SCRIPT := scripts/create_api_stack.sh
DELETE_CLOUDFORMATION_SCRIPT := scripts/delete_cloudformation_stacks.sh

# Available Lambda functions
LAMBDA_NAMES := getWines getWineById createWine updateWine deleteWine updateCart getCart payment handleOrder updateStock getWinesByCategory searchWines getOrders

# Default target
.PHONY: help
help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Available targets:"
	@echo "  build               Build all Lambda functions"
	@echo "  deploy              Deploy all Lambda functions"
	@echo "  delete              Delete all Lambda functions"
	@echo "  build-single        Build a single Lambda function (use LAMBDA=<function_name>)"
	@echo "  deploy-single       Deploy a single Lambda function (use LAMBDA=<function_name>)"
	@echo "  delete-single       Delete a single Lambda function (use LAMBDA=<function_name>)"
	@echo "  create-dynamodb     Deploy DynamoDB stack"
	@echo "  create-api          Deploy API Gateway stack"
	@echo "  delete-cloudformation Delete both DynamoDB and API Gateway stacks"
	@echo "  clean               Remove all built files"

# Build all Lambda functions
.PHONY: build
build:
	@echo "🚀 Building all Lambda functions..."
	@bash $(BUILD_SCRIPT) all

# Deploy all Lambda functions
.PHONY: deploy
deploy:
	@echo "🚀 Deploying all Lambda functions..."
	@bash $(DEPLOY_SCRIPT) all

# Delete all Lambda functions
.PHONY: delete
delete:
	@echo "🚀 Deleting all Lambda functions..."
	@bash $(DELETE_SCRIPT) all

# Build a single Lambda function
.PHONY: build-single
build-single:
	@if [ -z "$(LAMBDA)" ]; then \
		echo "❌ Please specify a Lambda function: make build-single LAMBDA=<function_name>"; \
		exit 1; \
	fi
	@echo "🚀 Building Lambda function: $(LAMBDA)"
	@bash $(BUILD_SCRIPT) $(LAMBDA)

# Deploy a single Lambda function
.PHONY: deploy-single
deploy-single:
	@if [ -z "$(LAMBDA)" ]; then \
		echo "❌ Please specify a Lambda function: make deploy-single LAMBDA=<function_name>"; \
		exit 1; \
	fi
	@echo "🚀 Deploying Lambda function: $(LAMBDA)"
	@bash $(DEPLOY_SCRIPT) $(LAMBDA)

# Delete a single Lambda function
.PHONY: delete-single
delete-single:
	@if [ -z "$(LAMBDA)" ]; then \
		echo "❌ Please specify a Lambda function: make delete-single LAMBDA=<function_name>"; \
		exit 1; \
	fi
	@echo "🚀 Deleting Lambda function: $(LAMBDA)"
	@bash $(DELETE_SCRIPT) $(LAMBDA)

# Deploy DynamoDB stack
.PHONY: create-dynamodb
create-dynamodb:
	@echo "🚀 Deploying DynamoDB CloudFormation stack..."
	@bash $(DYNAMODB_SCRIPT)

# Deploy API Gateway stack
.PHONY: create-api
create-api:
	@echo "🚀 Deploying API Gateway CloudFormation stack..."
	@bash $(API_SCRIPT)

# Delete CloudFormation stacks (DynamoDB & API Gateway)
.PHONY: delete-cloudformation
delete-cloudformation:
	@echo "🚨 Deleting all CloudFormation stacks..."
	@bash $(DELETE_CLOUDFORMATION_SCRIPT)

# Clean build artifacts
.PHONY: clean
clean:
	@echo "🗑️ Cleaning up build artifacts..."
	@rm -rf dist/*.zip
	@rm -rf logs/*
	@echo "✅ Clean-up complete!"
