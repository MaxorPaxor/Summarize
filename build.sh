#!/bin/bash

# Get the production API key from environment variable
PROD_API_KEY=$1

# Create build directory
mkdir -p dist

# Copy all files
cp -r * dist/

# Replace placeholder with actual API key
sed -i "s/%PROD_API_KEY%/$PROD_API_KEY/" dist/keys.js 