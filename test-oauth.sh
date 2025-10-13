#!/bin/bash

# Test script for OAuth 2.1 endpoints
# Run after starting the server with: npm run start:http

BASE_URL="${1:-http://localhost:3000}"

echo "🧪 Testing OAuth 2.1 Implementation"
echo "===================================="
echo "Base URL: $BASE_URL"
echo ""

# Test 1: Health Check
echo "1️⃣  Testing Health Endpoint..."
curl -s "$BASE_URL/health" | jq '.' || echo "❌ Failed"
echo ""

# Test 2: OAuth Authorization Server Discovery
echo "2️⃣  Testing OAuth Authorization Server Discovery..."
curl -s "$BASE_URL/.well-known/oauth-authorization-server" | jq '.' || echo "❌ Failed"
echo ""

# Test 3: OAuth Protected Resource Discovery
echo "3️⃣  Testing OAuth Protected Resource Discovery..."
curl -s "$BASE_URL/.well-known/oauth-protected-resource" | jq '.' || echo "❌ Failed"
echo ""

# Test 4: Client Registration
echo "4️⃣  Testing Client Registration..."
curl -s -X POST "$BASE_URL/register" \
  -H "Content-Type: application/json" \
  -d '{"client_name": "Test Client", "redirect_uris": ["http://localhost:3000/callback"]}' | jq '.' || echo "❌ Failed"
echo ""

# Test 5: Stats Endpoint (before auth - should fail)
echo "5️⃣  Testing Stats Endpoint..."
curl -s "$BASE_URL/stats" | jq '.' || echo "❌ Failed"
echo ""

# Test 6: MCP Endpoint without auth (should get 401)
echo "6️⃣  Testing MCP Endpoint without authentication (should get 401)..."
curl -s -X POST "$BASE_URL/mcp" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}' | jq '.' || echo "❌ Failed"
echo ""

echo "✅ Basic endpoint tests complete!"
echo ""
echo "📝 Manual Testing Steps:"
echo "   1. Open browser to: $BASE_URL/authorize?client_id=test&redirect_uri=$BASE_URL&response_type=code&state=test123&code_challenge=test&code_challenge_method=plain"
echo "   2. Fill in the login form"
echo "   3. Use WiFi password: darktalent2024!"
echo "   4. Complete the OAuth flow"
echo "   5. Check stats: $BASE_URL/stats"

