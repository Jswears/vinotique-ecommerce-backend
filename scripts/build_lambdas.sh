#!/bin/bash
# Description: This script builds and deploys AWS Lambda functions

# Variables
BUILD_FOLDERS=("src/functions/Wine/getPresignedUrl" "src/functions/Wine/getWines" "src/functions/Wine/getWineById" "src/functions/Wine/createWine" "src/functions/Wine/updateWine" "src/functions/Wine/deleteWine" "src/functions/Cart/updateCart" "src/functions/Cart/getCart" "src/functions/Payment" "src/functions/Order/handleOrder" "src/functions/Wine/updateStock" "src/functions/Wine/getWinesByCategory" "src/functions/Wine/searchWines" "src/functions/Order/getOrders")
LAMBDA_NAMES=("getPresignedUrl" "getWines" "getWineById" "createWine" "updateWine" "deleteWine" "updateCart" "getCart" "payment" "handleOrder" "updateStock" "getWinesByCategory" "searchWines" "getOrders")

# Lambda build function
build_lambda_functions() {
    echo "Building all Lambda functions..."
    for i in "${!BUILD_FOLDERS[@]}"; do
        build_single_lambda "$i"
    done
    echo "✅ All Lambda functions built successfully!"
}

# Function to build a single Lambda function
build_single_lambda() {
    local index=$1
    echo "🚀 Building: ${LAMBDA_NAMES[$index]}"
    npx esbuild "${BUILD_FOLDERS[$index]}/index.ts" \
        --bundle --minify --sourcemap \
        --platform=node --target=es2020 \
        --outfile="dist/${LAMBDA_NAMES[$index]}/index.js"
    echo "✅ Build complete: ${LAMBDA_NAMES[$index]}"
    
    # Zip the built file
    echo "📦 Zipping: ${LAMBDA_NAMES[$index]}"
    cd "dist/${LAMBDA_NAMES[$index]}" && zip -r index.zip index.js* && mv index.zip "../${LAMBDA_NAMES[$index]}.zip"
    echo "✅ Zip complete: ${LAMBDA_NAMES[$index]}"
    cd - > /dev/null
}

# Interactive mode for selecting functions
interactive_build() {
    echo "🔹 Select Lambda functions to build (comma-separated, e.g., 1,3,5) or type 'all' to build everything:"
    for i in "${!LAMBDA_NAMES[@]}"; do
        echo "$((i+1))) ${LAMBDA_NAMES[$i]}"
    done
    echo -n "Enter your choice: "
    read -r selection

    if [[ "$selection" == "all" ]]; then
        build_lambda_functions
        return
    fi

    IFS=',' read -ra indices <<< "$selection"
    for num in "${indices[@]}"; do
        if [[ "$num" =~ ^[0-9]+$ ]] && (( num > 0 && num <= ${#LAMBDA_NAMES[@]} )); then
            build_single_lambda "$((num - 1))"
        else
            echo "❌ Invalid selection: $num"
        fi
    done
}

# Main script execution
echo "🔧 AWS Lambda Build Script"
echo "1) Build all Lambda functions"
echo "2) Build selected Lambda functions (interactive mode)"
echo -n "Choose an option: "
read -r choice

case $choice in
    1) build_lambda_functions ;;
    2) interactive_build ;;
    *) echo "❌ Invalid choice. Exiting..." ;;
esac
