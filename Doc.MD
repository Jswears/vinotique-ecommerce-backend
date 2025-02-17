## Create table

```bash
aws dynamodb create-table --table-name WineEcommerce --attribute-definitions AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S AttributeName=GSI1PK,AttributeType=S AttributeName=GSI1SK,AttributeType=S AttributeName=GSI2PK,AttributeType=S AttributeName=GSI2SK,AttributeType=S --key-schema AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 --global-secondary-indexes "[
{
\"IndexName\": \"GSI1\",
\"KeySchema\": [{\"AttributeName\":\"GSI1PK\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"GSI1SK\",\"KeyType\":\"RANGE\"}],
\"Projection\": {\"ProjectionType\":\"ALL\"},
\"ProvisionedThroughput\": {\"ReadCapacityUnits\": 5, \"WriteCapacityUnits\": 5}
},
{
\"IndexName\": \"GSI2\",
\"KeySchema\": [{\"AttributeName\":\"GSI2PK\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"GSI2SK\",\"KeyType\":\"RANGE\"}],
\"Projection\": {\"ProjectionType\":\"ALL\"},
\"ProvisionedThroughput\": {\"ReadCapacityUnits\": 5, \"WriteCapacityUnits\": 5}
}
]" --region eu-central-1
```

## Create lambda

command to create lamba function using this: REGION="eu-central-1" LAMBDA_RUNTIME="nodejs22.x" LAMBDA_ROLE_2="arn:aws:iam::891376911200:role/GetOrdersLambdaRole" name= getOrders zip= dist/getOrders.zip env variable=TABLE_NAME=WineEcommerce
