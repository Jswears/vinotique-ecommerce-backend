#!/bin/bash

# Load env variables from .env
set -a
source .env
set +a


# Function to create an S3 bucket
create_bucket() {
    if [ -z "$BUCKET_NAME" ]; then
        read -p "There is not defined .env variable. Enter the bucket name to create: " BUCKET_NAME
    else 
        echo "🔃 Creating $BUCKET_NAME Bucket"
        aws s3api create-bucket --bucket $BUCKET_NAME --region $AWS_REGION --create-bucket-configuration LocationConstraint=$AWS_REGION
        echo "✅ $BUCKET_NAME Bucket Created Successfully"
        
        echo "🔃 Adding Necessary Cors for PresignedUrl"
        aws s3api put-bucket-cors --bucket $BUCKET_NAME --cors-configuration file://scripts/cors/bucket_cors.json
        echo "✅ Cors Added Successfully"

        if [ $? -eq 0 ]; then
            echo "Bucket '$BUCKET_NAME' created successfully."
        else
            echo "Failed to create bucket '$BUCKET_NAME'."
        fi
    fi
}

# Function to delete an S3 bucket
delete_bucket() {
    read -p "Enter the bucket name to delete: " BUCKET_NAME
    aws s3api delete-bucket --bucket $BUCKET_NAME --region $AWS_REGION
    if [ $? -eq 0 ]; then
        echo "Bucket '$BUCKET_NAME' deleted successfully."
    else
        echo "Failed to delete bucket '$BUCKET_NAME'."
    fi
}

# Main script
echo "Choose an option:"
echo "1. Create a bucket"
echo "2. Delete a bucket"
read -p "Enter your choice (1 or 2): " CHOICE

case $CHOICE in
    1)
        create_bucket
        echo $REGION
        ;;
    2)
        delete_bucket
        ;;
    *)
        echo "Invalid choice. Please enter 1 or 2."
        ;;
esac