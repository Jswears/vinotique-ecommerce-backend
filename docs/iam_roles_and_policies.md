### Roles and Policies

Remember to put AWSLambdaBasicExecutionRole for all the lambda functions to be able to write logs to CloudWatch.

1. **LambdaS3UploaderRole**

   - **Policy**: Allows uploading objects to a specific S3 bucket.
   - **Permissions**:
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Effect": "Allow",
           "Action": ["s3:PutObject", "s3:GetObject"],
           "Resource": "arn:aws:s3:::<BUCKET_NAME>/*"
         }
       ]
     }
     ```

2. **CreateWineLambdaRole**

   - **Policy**: Allows writing to the DynamoDB table for wine creation.
   - **Permissions**:
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Effect": "Allow",
           "Action": "dynamodb:PutItem",
           "Resource": "arn:aws:dynamodb:<AWS_REGION>:<AWS_ACCOUNT_ID>:table/WineEcommerce"
         }
       ]
     }
     ```

3. **GetWinesLambdaRole**

   - **Policy**: Allows reading all items from the DynamoDB table.
   - **Permissions**:
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Effect": "Allow",
           "Action": "dynamodb:Scan",
           "Resource": "arn:aws:dynamodb:<AWS_REGION>:<AWS_ACCOUNT_ID>:table/WineEcommerce"
         }
       ]
     }
     ```

4. **GetWineByIdLambdaRole**

   - **Policy**: Allows reading a specific item from the DynamoDB table.
   - **Permissions**:
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Effect": "Allow",
           "Action": "dynamodb:Query",
           "Resource": "arn:aws:dynamodb:<AWS_REGION>:<AWS_ACCOUNT_ID>:table/index/GSI1"
         }
       ]
     }
     ```

5. **UpdateWineLambdaRole**

   - **Policy**: Allows updating items in the DynamoDB table.
   - **Permissions**:
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Effect": "Allow",
           "Action": ["dynamodb:UpdateItem", "dynamodb:GetItem"],
           "Resource": "arn:aws:dynamodb:<AWS_REGION>:<AWS_ACCOUNT_ID>:table/WineEcommerce"
         }
       ]
     }
     ```

6. **DeleteWineLambdaRole**

   - **Policy**: Allows deleting items from the DynamoDB table.
   - **Permissions**:
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Effect": "Allow",
           "Action": "dynamodb:DeleteItem",
           "Resource": "arn:aws:dynamodb:<AWS_REGION>:<AWS_ACCOUNT_ID>:table/WineEcommerce"
         }
       ]
     }
     ```

7. **UpdateCartLambdaRole**

   - **Policy**: Allows updating cart items in the DynamoDB table.
   - **Permissions**:
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Effect": "Allow",
           "Action": [
             "dynamodb:UpdateItem",
             "dynamodb:Query",
             "dynamodb:PutItem",
             "dynamodb:DeleteItem"
           ],
           "Resource": "arn:aws:dynamodb:<AWS_REGION>:<AWS_ACCOUNT_ID>:table/WineEcommerce"
         }
       ]
     }
     ```

8. **GetCartLambdaRole**

   - **Policy**: Allows reading cart items from the DynamoDB table.
   - **Permissions**:
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Effect": "Allow",
           "Action": ["dynamodb:Query", "dynamodb:BatchGetItem"],
           "Resource": "arn:aws:dynamodb:<AWS_REGION>:<AWS_ACCOUNT_ID>:table/WineEcommerce"
         }
       ]
     }
     ```

9. **DeleteWineFromCartLambdaRole**

   - **Policy**: Allows deleting items from the cart in the DynamoDB table.
   - **Permissions**:
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Effect": "Allow",
           "Action": "dynamodb:DeleteItem",
           "Resource": "arn:aws:dynamodb:<AWS_REGION>:<AWS_ACCOUNT_ID>:table/WineEcommerce"
         }
       ]
     }
     ```

10. **Payment**
    Just use LambdaBasicExecutionRole

11. **HandleOrderLambdaRole**

    - **Policy**: Allows creating orders in the DynamoDB table.
    - **Permissions**:
      ```json
      {
        "Version": "2012-10-17",
        "Statement": [
          {
            "Effect": "Allow",
            "Action": [
              "dynamodb:PutItem",
              "dynamodb:DeleteItem",
              "dynamodb:BatchGetItem",
              "dynamodb:Query",
              "dynamodb:BatchWriteItem"
            ],
            "Resource": "arn:aws:dynamodb:<AWS_REGION>:<AWS_ACCOUNT_ID>:table/WineEcommerce"
          }
        ]
      }
      ```

12. **UpdateStockLambdaRole**

    - **Policy**: Allows updating stock levels in the DynamoDB table.
    - **Permissions**:
      ```json
      {
        "Version": "2012-10-17",
        "Statement": [
          {
            "Effect": "Allow",
            "Action": "dynamodb:UpdateItem",
            "Resource": "arn:aws:dynamodb:<AWS_REGION>:<AWS_ACCOUNT_ID>:table/WineEcommerce"
          }
        ]
      }
      ```

13. **GetWinesByCategoryLambdaRole**

    - **Policy**: Allows querying wines by category in the DynamoDB table.
    - **Permissions**:
      ```json
      {
        "Version": "2012-10-17",
        "Statement": [
          {
            "Effect": "Allow",
            "Action": "dynamodb:Query",
            "Resource": "arn:aws:dynamodb:<AWS_REGION>:<AWS_ACCOUNT_ID>:table/WineEcommerce/index/GSI2"
          }
        ]
      }
      ```

14. **SearchWinesLambdaRole**

    - **Policy**: Allows scanning the DynamoDB table for wine search.
    - **Permissions**:
      ```json
      {
        "Version": "2012-10-17",
        "Statement": [
          {
            "Effect": "Allow",
            "Action": "dynamodb:Scan",
            "Resource": "arn:aws:dynamodb:<AWS_REGION>:<AWS_ACCOUNT_ID>:table/WineEcommerce"
          }
        ]
      }
      ```

15. **GetOrdersLambdaRole**
    - **Policy**: Allows reading orders from the DynamoDB table.
    - **Permissions**:
      ```json
      {
        "Version": "2012-10-17",
        "Statement": [
          {
            "Effect": "Allow",
            "Action": "dynamodb:Query",
            "Resource": "arn:aws:dynamodb:<AWS_REGION>:<AWS_ACCOUNT_ID>:table/WineEcommerce/index/GSI1"
          }
        ]
      }
      ```
