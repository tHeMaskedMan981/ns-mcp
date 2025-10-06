#!/usr/bin/env node

/**
 * MCP Server for Network School Luma Events (SSE mode)
 * This is the remote/SSE version for use over HTTP
 * 
 * Includes minimal OAuth 2.0 authentication for Claude Desktop compatibility
 */

import express from 'express';
import cors from 'cors';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createServer } from './server.js';
import dotenv from 'dotenv';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const HOST = process.env.HOST || 'localhost';
const BASE_URL = process.env.BASE_URL || `http://${HOST}:${PORT}`;

// Simple in-memory token storage (for MVP - replace with proper storage in production)
const tokens = new Map<string, { code: string; accessToken?: string }>();

// Create Express app
const app = express();

// Enable CORS for all origins (as requested for MVP)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok',
    service: 'network-school-events-mcp',
    version: '1.0.0',
    transport: 'sse',
    auth: 'minimal-oauth'
  });
});

// OAuth 2.0 Authorization endpoint
app.get('/authorize', (req, res) => {
  const { client_id, redirect_uri, state, response_type } = req.query;

  console.error('Authorization request:', { client_id, redirect_uri, state, response_type });

  if (!redirect_uri) {
    return res.status(400).json({ error: 'redirect_uri is required' });
  }

  // Generate a simple authorization code
  const code = crypto.randomBytes(16).toString('hex');
  
  // Store the code for later exchange
  tokens.set(code, { code });

  // Redirect back to Claude Desktop with the code
  const redirectUrl = `${redirect_uri}?code=${code}${state ? `&state=${state}` : ''}`;
  
  console.error('Redirecting to:', redirectUrl);
  
  // Return a simple HTML page that auto-redirects
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>MCP Server Authorization</title>
        <meta http-equiv="refresh" content="0;url=${redirectUrl}">
      </head>
      <body>
        <h1>Authorization Successful</h1>
        <p>Redirecting back to Claude Desktop...</p>
        <p>If you are not redirected automatically, <a href="${redirectUrl}">click here</a>.</p>
      </body>
    </html>
  `);
});

// OAuth 2.0 Token endpoint
app.post('/token', (req, res) => {
  const { grant_type, code, redirect_uri } = req.body;

  console.error('Token request:', { grant_type, code, redirect_uri });

  if (grant_type !== 'authorization_code') {
    return res.status(400).json({ 
      error: 'unsupported_grant_type',
      error_description: 'Only authorization_code grant type is supported' 
    });
  }

  if (!code) {
    return res.status(400).json({ 
      error: 'invalid_request',
      error_description: 'code is required' 
    });
  }

  // Verify the code exists
  const tokenData = tokens.get(code);
  if (!tokenData) {
    return res.status(400).json({ 
      error: 'invalid_grant',
      error_description: 'Invalid authorization code' 
    });
  }

  // Generate an access token
  const accessToken = crypto.randomBytes(32).toString('hex');
  tokenData.accessToken = accessToken;

  console.error('Issued access token:', accessToken);

  // Return the token response
  res.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 86400, // 24 hours
  });
});

// SSE endpoint for MCP communication
app.get('/sse', async (req, res) => {
  console.error('New SSE connection established');
  
  // Optional: Validate authorization header (for MVP, we're lenient)
  const authHeader = req.headers.authorization;
  if (authHeader) {
    console.error('Authorization header present:', authHeader.substring(0, 20) + '...');
    // In MVP mode, we accept any token. In production, validate against stored tokens
    // const token = authHeader.replace('Bearer ', '');
    // const isValid = Array.from(tokens.values()).some(t => t.accessToken === token);
    // if (!isValid) {
    //   return res.status(401).json({ error: 'Invalid access token' });
    // }
  }
  
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Create MCP server instance
  const server = createServer();
  const transport = new SSEServerTransport('/message', res);
  
  await server.connect(transport);

  // Handle client disconnect
  req.on('close', async () => {
    console.error('SSE connection closed');
    await server.close();
  });
});

// POST endpoint for client messages
app.post('/message', async (req, res) => {
  // This endpoint is used by the SSE transport to receive messages from the client
  // The transport handles the actual message processing
  res.status(200).send('Message received');
});

// Start the HTTP server
app.listen(PORT, HOST, () => {
  console.error(`
╔════════════════════════════════════════════════════════════════╗
║   Network School Events MCP Server (SSE Mode)                  ║
╚════════════════════════════════════════════════════════════════╝

Server running on: ${BASE_URL}

Endpoints:
  - SSE:          ${BASE_URL}/sse
  - Health:       ${BASE_URL}/health
  - OAuth Auth:   ${BASE_URL}/authorize
  - OAuth Token:  ${BASE_URL}/token

To use with Claude Desktop, add this to your config:

{
  "mcpServers": {
    "network-school-events": {
      "url": "${BASE_URL}/sse",
      "auth": {
        "type": "oauth2",
        "authorizationUrl": "${BASE_URL}/authorize",
        "tokenUrl": "${BASE_URL}/token",
        "clientId": "mcp-client",
        "clientSecret": "not-required"
      }
    }
  }
}

Note: This is a minimal OAuth implementation for MVP.
Authentication is essentially bypassed for ease of use.
`);
});

