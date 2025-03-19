#!/bin/bash

# Load env variables from .env
set -a
source ../.env
set +a

echo "Region is: $AWS_REGION"