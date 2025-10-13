#!/usr/bin/env node

/**
 * MCP Server for Network School Events (Modern HTTP with OAuth 2.1)
 * This is the production-ready remote server with full authentication
 * 
 * Features:
 * - StreamableHTTPServerTransport (modern protocol)
 * - Full OAuth 2.1 with PKCE
 * - Session management via Mcp-Session-Id headers
 * - WiFi password authentication
 * - Per-user usage tracking
 * - Dual transport support (modern + legacy)
 */

import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createServer } from './server.js';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const HOST = process.env.HOST || '0.0.0.0';
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const WIFI_PASSWORD = process.env.WIFI_PASSWORD || 'darktalent2024!';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface UserProfile {
  email: string;
  name: string;
  createdAt: string;
  lastUsedAt: string;
  toolCallCount: number;
}

interface AuthCode {
  email: string;
  name: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  redirectUri: string;
  expiresAt: number;
}

interface TokenData {
  email: string;
  name: string;
  scopes: string[];
  expiresAt: number;
}

interface SessionData {
  transport: any;
  email: string;
  createdAt: string;
}

interface UserUsage {
  toolCalls: Map<string, number>;
  totalCalls: number;
  lastCall: string;
}

interface GlobalStats {
  totalUsers: number;
  totalToolCalls: number;
  toolBreakdown: Map<string, number>;
  startedAt: string;
}

// ============================================================================
// IN-MEMORY STORAGE
// ============================================================================

const users = new Map<string, UserProfile>();
const authCodes = new Map<string, AuthCode>();
const tokens = new Map<string, TokenData>();
const transports = new Map<string, any>();
const pendingTransports = new Map<string, any>();
const userUsage = new Map<string, UserUsage>();
const globalStats: GlobalStats = {
  totalUsers: 0,
  totalToolCalls: 0,
  toolBreakdown: new Map(),
  startedAt: new Date().toISOString(),
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getBaseUrl(req: express.Request): string {
  if (BASE_URL !== `http://localhost:${PORT}`) {
    return BASE_URL;
  }
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}`;
}

function logWithTimestamp(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.error(`[${timestamp}] ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.error(`[${timestamp}] ${message}`);
  }
}

function trackToolCall(email: string, toolName: string) {
  // Update user usage
  let usage = userUsage.get(email);
  if (!usage) {
    usage = {
      toolCalls: new Map(),
      totalCalls: 0,
      lastCall: new Date().toISOString(),
    };
    userUsage.set(email, usage);
  }
  
  usage.toolCalls.set(toolName, (usage.toolCalls.get(toolName) || 0) + 1);
  usage.totalCalls++;
  usage.lastCall = new Date().toISOString();
  
  // Update user profile
  const user = users.get(email);
  if (user) {
    user.toolCallCount++;
    user.lastUsedAt = new Date().toISOString();
  }
  
  // Update global stats
  globalStats.totalToolCalls++;
  globalStats.toolBreakdown.set(
    toolName,
    (globalStats.toolBreakdown.get(toolName) || 0) + 1
  );
  
  logWithTimestamp(`Tool call: ${toolName}`, { email, totalCalls: usage.totalCalls });
}

async function authenticateToken(
  req: express.Request,
  res: express.Response,
  rpcId: any = null
) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const baseUrl = getBaseUrl(req);

  if (!token) {
    const wwwAuthHeader = `Bearer realm="Network School MCP Server", resource_metadata_uri="${baseUrl}/.well-known/oauth-protected-resource"`;
    
    return {
      success: false,
      response: res
        .status(401)
        .header('WWW-Authenticate', wwwAuthHeader)
        .json({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Missing Bearer token' },
          id: rpcId,
        }),
    };
  }

  const tokenData = tokens.get(token);
  if (!tokenData) {
    return {
      success: false,
      response: res.status(403).json({
        jsonrpc: '2.0',
        error: { code: -32001, message: 'Invalid or expired token' },
        id: rpcId,
      }),
    };
  }

  // Check if token expired
  if (tokenData.expiresAt < Date.now()) {
    tokens.delete(token);
    return {
      success: false,
      response: res.status(403).json({
        jsonrpc: '2.0',
        error: { code: -32001, message: 'Token expired' },
        id: rpcId,
      }),
    };
  }

  // Create auth object for MCP server
  const authObject = {
    token: token,
    clientId: 'network-school-mcp',
    scopes: tokenData.scopes,
    email: tokenData.email,
    name: tokenData.name,
  };

  return {
    success: true,
    tokenData,
    authObject,
  };
}

async function createAndConnectTransport(
  sessionId: string,
  mcpServer: any,
  prefix: string = ''
) {
  if (pendingTransports.has(sessionId) || transports.has(sessionId)) {
    return pendingTransports.get(sessionId) || transports.get(sessionId);
  }

  logWithTimestamp(`${prefix}Creating new transport`, { sessionId });

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => sessionId,
    onsessioninitialized: (actualId: string) => {
      logWithTimestamp('Session initialized', { actualId });
      pendingTransports.delete(actualId);
    },
  });

  // Manually assign session ID
  transport.sessionId = sessionId;

  // Set cleanup handler
  transport.onclose = () => {
    logWithTimestamp('Transport closed', { sessionId });
    if (transports.has(sessionId)) {
      transports.delete(sessionId);
    }
  };

  // Track pending transport and store immediately
  pendingTransports.set(sessionId, transport);
  transports.set(sessionId, transport);

  // Connect to MCP server
  try {
    await mcpServer.connect(transport);
    logWithTimestamp(`${prefix}Transport connected`, { sessionId });
  } catch (error) {
    logWithTimestamp(`${prefix}Transport connection failed`, { sessionId, error });
    pendingTransports.delete(sessionId);
    transports.delete(sessionId);
    throw error;
  }

  return transport;
}

// ============================================================================
// EXPRESS APP SETUP
// ============================================================================

const app = express();

// Enable CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Mcp-Session-Id'],
  exposedHeaders: ['Mcp-Session-Id'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// Create MCP server instance (shared across all transports)
const mcpServer = createServer();

// ============================================================================
// HEALTH & INFO ENDPOINTS
// ============================================================================

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'network-school-events-mcp',
    version: '1.0.0',
    transport: 'streamable-http',
    auth: 'oauth-2.1',
    uptime: process.uptime(),
  });
});

app.get('/stats', (_req, res) => {
  const userList = Array.from(users.values()).map(u => ({
    email: u.email,
    name: u.name,
    toolCallCount: u.toolCallCount,
    lastUsedAt: u.lastUsedAt,
  }));

  const usageByUser = Array.from(userUsage.entries()).map(([email, usage]) => ({
    email,
    totalCalls: usage.totalCalls,
    lastCall: usage.lastCall,
    toolBreakdown: Object.fromEntries(usage.toolCalls),
  }));

  res.json({
    global: {
      ...globalStats,
      toolBreakdown: Object.fromEntries(globalStats.toolBreakdown),
    },
    users: userList,
    usage: usageByUser,
    sessions: {
      active: transports.size,
      pending: pendingTransports.size,
    },
  });
});

// ============================================================================
// OAUTH 2.1 DISCOVERY ENDPOINTS
// ============================================================================

app.get('/.well-known/oauth-authorization-server', (req, res) => {
  const baseUrl = getBaseUrl(req);
  
  res.json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/authorize`,
    token_endpoint: `${baseUrl}/token`,
    registration_endpoint: `${baseUrl}/register`,
    scopes_supported: ['mcp:read', 'mcp:write', 'events:read', 'events:register', 'wiki:read'],
    response_types_supported: ['code'],
    response_modes_supported: ['query'],
    grant_types_supported: ['authorization_code'],
    token_endpoint_auth_methods_supported: ['none'],
    code_challenge_methods_supported: ['S256', 'plain'],
  });
});

app.get('/.well-known/oauth-protected-resource', (req, res) => {
  const baseUrl = getBaseUrl(req);
  
  res.json({
    resource: `${baseUrl}/mcp`,
    authorization_servers: [
      {
        issuer: baseUrl,
        authorization_endpoint: `${baseUrl}/authorize`,
      },
    ],
    scopes_supported: ['mcp:read', 'mcp:write', 'events:read', 'events:register', 'wiki:read'],
    bearer_methods_supported: ['header'],
  });
});

// ============================================================================
// OAUTH 2.1 ENDPOINTS
// ============================================================================

// Client registration endpoint
app.post('/register', (req, res) => {
  const clientId = crypto.randomBytes(16).toString('hex');
  
  logWithTimestamp('Client registration', req.body);
  
  res.json({
    client_id: clientId,
    client_name: req.body.client_name || 'MCP Client',
    redirect_uris: req.body.redirect_uris || [],
    token_endpoint_auth_method: 'none',
  });
});

// Authorization endpoint - serves the login page
app.get('/authorize', (req, res) => {
  const { client_id, redirect_uri, state, response_type, code_challenge, code_challenge_method } = req.query;

  logWithTimestamp('Authorization request', {
    client_id,
    redirect_uri,
    state,
    response_type,
    code_challenge: code_challenge ? 'present' : 'none',
    code_challenge_method,
  });

  if (!redirect_uri) {
    return res.status(400).json({ error: 'redirect_uri is required' });
  }

  if (response_type !== 'code') {
    return res.status(400).json({ error: 'Only response_type=code is supported' });
  }

  // Serve the login HTML page (will submit to /callback)
  res.sendFile(path.join(__dirname, '..', 'public', 'authorize.html'));
});

// Callback endpoint - processes login form submission
app.post('/callback', (req, res) => {
  const { password, name, email, redirect_uri, state, code_challenge, code_challenge_method } = req.body;

  logWithTimestamp('Callback received', { email, name, redirect_uri, hasPassword: !!password });

  // Validate required fields
  if (!password || !name || !email || !redirect_uri) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['password', 'name', 'email', 'redirect_uri'],
    });
  }

  // Validate WiFi password
  if (password !== WIFI_PASSWORD) {
    logWithTimestamp('Invalid password attempt', { email });
    return res.status(401).json({
      error: 'invalid_password',
      message: 'Incorrect WiFi password',
    });
  }

  // Create or update user
  let user = users.get(email);
  if (!user) {
    user = {
      email,
      name,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      toolCallCount: 0,
    };
    users.set(email, user);
    globalStats.totalUsers++;
    logWithTimestamp('New user registered', { email, name });
  } else {
    user.name = name; // Update name if changed
    user.lastUsedAt = new Date().toISOString();
    logWithTimestamp('Existing user logged in', { email, name });
  }

  // Generate authorization code
  const code = crypto.randomBytes(32).toString('hex');

  // Store the code with PKCE parameters if provided
  authCodes.set(code, {
    email,
    name,
    codeChallenge: code_challenge as string | undefined,
    codeChallengeMethod: (code_challenge_method as string) || 'plain',
    redirectUri: redirect_uri as string,
    expiresAt: Date.now() + 600000, // 10 minutes
  });

  // Build redirect URL
  const redirectUrl = new URL(redirect_uri as string);
  redirectUrl.searchParams.set('code', code);
  if (state) {
    redirectUrl.searchParams.set('state', state as string);
  }

  logWithTimestamp('Authorization code issued', { email, code: code.substring(0, 10) + '...' });

  // Redirect back to Claude with the authorization code
  res.redirect(redirectUrl.toString());
});

// Token endpoint - exchanges authorization code for access token
app.post('/token', (req, res) => {
  const { grant_type, code, redirect_uri, code_verifier } = req.body;

  logWithTimestamp('Token request', {
    grant_type,
    code: code ? code.substring(0, 10) + '...' : 'none',
    redirect_uri,
    code_verifier: code_verifier ? 'present' : 'none',
  });

  if (grant_type !== 'authorization_code') {
    return res.status(400).json({
      error: 'unsupported_grant_type',
      error_description: 'Only authorization_code grant type is supported',
    });
  }

  if (!code) {
    return res.status(400).json({
      error: 'invalid_request',
      error_description: 'code is required',
    });
  }

  // Verify the code exists
  const authData = authCodes.get(code);
  if (!authData) {
    return res.status(400).json({
      error: 'invalid_grant',
      error_description: 'Invalid authorization code',
    });
  }

  // Check if code expired
  if (authData.expiresAt < Date.now()) {
    authCodes.delete(code);
    return res.status(400).json({
      error: 'invalid_grant',
      error_description: 'Authorization code expired',
    });
  }

  // Validate redirect_uri matches
  if (redirect_uri && redirect_uri !== authData.redirectUri) {
    return res.status(400).json({
      error: 'invalid_grant',
      error_description: 'redirect_uri mismatch',
    });
  }

  // Validate PKCE if code_challenge was provided
  if (authData.codeChallenge) {
    if (!code_verifier) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'code_verifier is required',
      });
    }

    let calculatedChallenge: string;
    if (authData.codeChallengeMethod === 'S256') {
      calculatedChallenge = crypto
        .createHash('sha256')
        .update(code_verifier)
        .digest('base64url');
    } else {
      calculatedChallenge = code_verifier;
    }

    if (calculatedChallenge !== authData.codeChallenge) {
      logWithTimestamp('PKCE validation failed', { email: authData.email });
      return res.status(400).json({
        error: 'invalid_grant',
        error_description: 'Invalid code verifier',
      });
    }
  }

  // Generate an access token
  const accessToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 86400000; // 24 hours

  const tokenData: TokenData = {
    email: authData.email,
    name: authData.name,
    scopes: ['mcp:read', 'mcp:write', 'events:read', 'events:register', 'wiki:read'],
    expiresAt,
  };

  tokens.set(accessToken, tokenData);

  // Clean up auth code (one-time use)
  authCodes.delete(code);

  logWithTimestamp('Access token issued', {
    email: authData.email,
    token: accessToken.substring(0, 10) + '...',
  });

  // Return the token response
  res.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 86400, // 24 hours
    scope: tokenData.scopes.join(' '),
  });
});

// ============================================================================
// MCP ENDPOINTS (Modern StreamableHTTP)
// ============================================================================

app.post('/mcp', async (req, res) => {
  const body = req.body;
  const rpcId = body && body.id !== undefined ? body.id : null;

  // Authenticate the token
  const authResult = await authenticateToken(req, res, rpcId);
  if (!authResult.success) {
    return authResult.response;
  }

  if (!authResult.authObject) {
    return res.status(500).json({
      jsonrpc: '2.0',
      error: { code: -32002, message: 'Internal authentication error' },
      id: rpcId,
    });
  }

  // Assign auth object to request for tool handlers
  (req as any).auth = authResult.authObject;

  // Track tool calls
  if (body && body.method === 'tools/call' && body.params?.name) {
    trackToolCall(authResult.authObject.email, body.params.name);
  }

  // Extract session ID from header
  const clientSessionIdHeader = req.headers['mcp-session-id'];
  const actualClientSessionId = Array.isArray(clientSessionIdHeader)
    ? clientSessionIdHeader[0]
    : clientSessionIdHeader;

  let transport;
  let effectiveSessionId: string;

  // Check if this is an initialize request
  const isInitRequest = body && body.method === 'initialize';

  if (isInitRequest) {
    // Create new session for initialize requests
    effectiveSessionId = crypto.randomUUID();
    transport = await createAndConnectTransport(
      effectiveSessionId,
      mcpServer,
      'Initialize: '
    );

    // Set the session ID in the response header
    res.setHeader('Mcp-Session-Id', effectiveSessionId);
  } else if (actualClientSessionId && pendingTransports.has(actualClientSessionId)) {
    // Use pending transport
    transport = await pendingTransports.get(actualClientSessionId);
    effectiveSessionId = actualClientSessionId;
  } else if (actualClientSessionId && transports.has(actualClientSessionId)) {
    // Use existing transport
    transport = transports.get(actualClientSessionId);
    effectiveSessionId = actualClientSessionId;
  } else if (actualClientSessionId) {
    // Create new transport for unknown session ID
    effectiveSessionId = actualClientSessionId;
    transport = await createAndConnectTransport(
      effectiveSessionId,
      mcpServer,
      'Unknown Session: '
    );
  } else {
    // Error: non-initialize request without session ID
    return res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32003,
        message: 'Bad Request: No session ID provided for non-initialize request.',
      },
      id: rpcId,
    });
  }

  // Ensure session ID is consistent
  req.headers['mcp-session-id'] = effectiveSessionId;
  res.setHeader('Mcp-Session-Id', effectiveSessionId);

  // Handle request using MCP transport
  try {
    await transport.handleRequest(req, res, body);
  } catch (handleError) {
    logWithTimestamp('MCP POST handleRequest error', {
      sessionId: effectiveSessionId,
      error: handleError,
    });
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error during MCP request handling',
        },
        id: rpcId,
      });
    }
  }
});

// DELETE endpoint for session cleanup
app.delete('/mcp', async (req, res) => {
  const clientSessionIdHeader = req.headers['mcp-session-id'];
  const sessionId = Array.isArray(clientSessionIdHeader)
    ? clientSessionIdHeader[0]
    : clientSessionIdHeader;

  if (!sessionId) {
    return res.status(400).json({ error: 'Missing session ID' });
  }

  const transport = transports.get(sessionId);
  if (transport) {
    logWithTimestamp('Session deleted', { sessionId });
    transports.delete(sessionId);
    res.status(204).end();
  } else {
    res.status(404).json({ error: 'Session not found' });
  }
});

// ============================================================================
// LEGACY SSE ENDPOINTS (for backward compatibility)
// ============================================================================

app.get('/mcp', async (req, res) => {
  logWithTimestamp('Legacy SSE connection established');

  // Authenticate the token
  const authResult = await authenticateToken(req, res, null);
  if (!authResult.success) {
    return authResult.response;
  }

  if (!authResult.authObject) {
    return res.status(500).send('Internal authentication error');
  }

  (req as any).auth = authResult.authObject;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // Create SSE transport
  const transport = new SSEServerTransport('/messages', res);
  transports.set(transport.sessionId, transport);

  res.setHeader('Mcp-Session-Id', transport.sessionId);

  logWithTimestamp('SSE transport created', {
    sessionId: transport.sessionId,
    email: authResult.authObject.email,
  });

  try {
    await mcpServer.connect(transport);
  } catch (error) {
    logWithTimestamp('SSE connection error', { error });
    if (!res.headersSent) {
      res.status(500).send('Internal server error during SSE setup.');
    } else {
      res.end();
    }

    if (transports.has(transport.sessionId)) {
      transports.delete(transport.sessionId);
    }
  }

  // Handle client disconnect
  req.on('close', () => {
    logWithTimestamp('SSE connection closed', { sessionId: transport.sessionId });
    if (transports.has(transport.sessionId)) {
      transports.delete(transport.sessionId);
    }
  });
});

app.post('/messages', async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const body = req.body;
  const rpcId = body && body.id !== undefined ? body.id : null;

  // Authenticate the token
  const authResult = await authenticateToken(req, res, rpcId);
  if (!authResult.success) {
    return authResult.response;
  }

  if (!authResult.authObject) {
    return res.status(500).json({
      jsonrpc: '2.0',
      error: { code: -32002, message: 'Internal authentication error' },
      id: rpcId,
    });
  }

  (req as any).auth = authResult.authObject;

  // Track tool calls
  if (body && body.method === 'tools/call' && body.params?.name) {
    trackToolCall(authResult.authObject.email, body.params.name);
  }

  if (!sessionId) {
    return res.status(400).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Missing sessionId in query parameters' },
      id: rpcId,
    });
  }

  const transport = transports.get(sessionId);

  if (!transport || !(transport instanceof SSEServerTransport)) {
    return res.status(404).json({
      jsonrpc: '2.0',
      error: { code: -32001, message: 'Session not found or not an SSE session' },
      id: rpcId,
    });
  }

  try {
    await transport.handlePostMessage(req, res, body);
  } catch (error) {
    logWithTimestamp('SSE message handling error', { sessionId, error });
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error handling message' },
        id: rpcId,
      });
    }
  }
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, HOST, () => {
  console.error(`
╔════════════════════════════════════════════════════════════════╗
║   Network School Events MCP Server (OAuth 2.1)                 ║
╚════════════════════════════════════════════════════════════════╝

Server running on: ${BASE_URL}
WiFi Password: ${WIFI_PASSWORD}

Endpoints:
  - Modern MCP:   POST ${BASE_URL}/mcp
  - Legacy SSE:   GET  ${BASE_URL}/mcp
  - OAuth Auth:   GET  ${BASE_URL}/authorize
  - OAuth Token:  POST ${BASE_URL}/token
  - Stats:        GET  ${BASE_URL}/stats
  - Health:       GET  ${BASE_URL}/health

Claude Desktop/Mobile Configuration:
{
  "mcpServers": {
    "network-school-events": {
      "url": "${BASE_URL}/mcp"
    }
  }
}

Note: OAuth 2.1 with PKCE is fully implemented.
Users authenticate with WiFi password.
All usage is tracked per user.
`);
});

