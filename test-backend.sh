#!/bin/bash

# Test script for MadeWithKiro backend API
# Tests the dev environment endpoints

API_URL="https://7fr5jcee6j.execute-api.us-west-2.amazonaws.com/dev"

echo "Testing MadeWithKiro Backend API"
echo "================================="
echo ""

# Test 1: Get all applications
echo "1. Testing GET /applications (fetch all applications)"
echo "---"
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "${API_URL}/applications")
http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_STATUS/d')

if [ "$http_status" = "200" ]; then
    echo "✅ Status: $http_status"
    echo "Response:"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
else
    echo "❌ Status: $http_status"
    echo "Response: $body"
fi
echo ""

# Test 2: Get applications by user
echo "2. Testing GET /applications?userId=test-user-001"
echo "---"
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "${API_URL}/applications?userId=test-user-001")
http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_STATUS/d')

if [ "$http_status" = "200" ]; then
    echo "✅ Status: $http_status"
    echo "Response:"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
else
    echo "❌ Status: $http_status"
    echo "Response: $body"
fi
echo ""

# Test 3: Get user profile
echo "3. Testing GET /profile/test-user-001"
echo "---"
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "${API_URL}/profile/test-user-001")
http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_STATUS/d')

if [ "$http_status" = "200" ]; then
    echo "✅ Status: $http_status"
    echo "Response:"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
else
    echo "❌ Status: $http_status"
    echo "Response: $body"
fi
echo ""

echo "================================="
echo "Testing complete!"
