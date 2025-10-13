# OAuth 2.1 Authentication Guide

This guide explains how to use the Network School MCP Server with OAuth 2.1 authentication.

## Overview

The server implements full OAuth 2.1 with PKCE (Proof Key for Code Exchange) for secure authentication. Users authenticate using a WiFi password, and all tool usage is tracked per user.

## Features

✅ **OAuth 2.1 with PKCE** - Full standards-compliant authentication  
✅ **WiFi Password Authentication** - Simple, secure access control  
✅ **Per-User Tracking** - Track tool usage by email  
✅ **Session Management** - Proper session handling with `Mcp-Session-Id` headers  
✅ **Dual Transport Support** - Modern StreamableHTTP + Legacy SSE  
✅ **Scope-Based Authorization** - Fine-grained access control  
✅ **Usage Statistics** - Monitor user activity and tool calls  

## Quick Start

### 1. Environment Setup

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and set your configuration:

```env
PORT=3000
HOST=0.0.0.0
BASE_URL=https://your-railway-url.railway.app  # Update this!
WIFI_PASSWORD=darktalent2024!
LUMA_API_KEY=your_luma_api_key
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build and Run

```bash
npm run build
npm run start:http
```

The server will start on the configured PORT.

### 4. Deploy to Railway

Railway will automatically deploy on git push. Make sure to set environment variables in Railway dashboard:

- `BASE_URL` - Your Railway app URL (e.g., `https://ns-mcp-production.up.railway.app`)
- `WIFI_PASSWORD` - The authentication password
- `LUMA_API_KEY` - Your Luma API key

## Using with Claude

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "network-school-events": {
      "url": "https://your-railway-url.railway.app/mcp"
    }
  }
}
```

### Claude Mobile App

1. Open Claude mobile app
2. Go to Settings → Integrations
3. Add new MCP server
4. Enter your server URL: `https://your-railway-url.railway.app/mcp`
5. When prompted, you'll be redirected to the login page
6. Enter:
   - Your full name
   - Your email address
   - WiFi password: `darktalent2024!`
7. Click "Continue to Claude"
8. You'll be redirected back to Claude with access

## OAuth Flow

Here's what happens when you connect:

```
1. Claude → Your Server (/authorize)
   ↓
2. Login Page (WiFi password + name + email)
   ↓
3. Form Submit → Your Server (/callback)
   ↓
4. Password Validation
   ↓
5. Authorization Code Generated
   ↓
6. Redirect → Claude (with code)
   ↓
7. Claude → Your Server (/token)
   ↓
8. Token Exchange (with PKCE validation)
   ↓
9. Access Token Issued
   ↓
10. Claude uses token for all tool calls
```

## Available Endpoints

### OAuth Endpoints

- `GET /.well-known/oauth-authorization-server` - OAuth server metadata
- `GET /.well-known/oauth-protected-resource` - Protected resource metadata
- `POST /register` - Client registration
- `GET /authorize` - Authorization page (login form)
- `POST /callback` - Login form submission
- `POST /token` - Token exchange

### MCP Endpoints

- `POST /mcp` - Modern StreamableHTTP endpoint
- `GET /mcp` - Legacy SSE stream endpoint
- `POST /messages` - Legacy SSE message endpoint
- `DELETE /mcp` - Session cleanup

### Monitoring Endpoints

- `GET /health` - Health check
- `GET /stats` - Usage statistics (shows all users and tool usage)

## Usage Statistics

Visit `https://your-server-url/stats` to see:

- Total users
- Total tool calls
- Per-user usage breakdown
- Tool popularity
- Active sessions
- Last activity timestamps

Example response:

```json
{
  "global": {
    "totalUsers": 5,
    "totalToolCalls": 42,
    "toolBreakdown": {
      "get_upcoming_events": 15,
      "search_events": 12,
      "search_wiki": 10,
      "register_for_event": 5
    },
    "startedAt": "2025-01-15T10:30:00.000Z"
  },
  "users": [
    {
      "email": "john@example.com",
      "name": "John Doe",
      "toolCallCount": 15,
      "lastUsedAt": "2025-01-15T14:20:00.000Z"
    }
  ],
  "usage": [
    {
      "email": "john@example.com",
      "totalCalls": 15,
      "lastCall": "2025-01-15T14:20:00.000Z",
      "toolBreakdown": {
        "get_upcoming_events": 8,
        "search_events": 5,
        "search_wiki": 2
      }
    }
  ],
  "sessions": {
    "active": 2,
    "pending": 0
  }
}
```

## Scopes

All users are granted these scopes by default:

- `mcp:read` - Read MCP resources
- `mcp:write` - Write MCP operations
- `events:read` - Read event information
- `events:register` - Register for events
- `wiki:read` - Read wiki content

### Adding Scope-Based Authorization

The server includes an example of scope-based authorization in the `register_for_event` tool. You can add similar checks to other tools:

```typescript
// In server.ts
const requestMeta = (request as any)._meta;
if (requestMeta && requestMeta.authInfo) {
  const authInfo = requestMeta.authInfo;
  if (!authInfo.scopes || !authInfo.scopes.includes('required:scope')) {
    return {
      content: [{
        type: 'text',
        text: 'Unauthorized: Missing required scope'
      }],
      isError: true
    };
  }
}
```

## Security Notes

### Current Implementation (MVP)

- ✅ OAuth 2.1 with PKCE fully implemented
- ✅ Token-based authentication
- ✅ Session management
- ✅ WiFi password validation
- ⚠️ In-memory storage (tokens lost on restart)
- ⚠️ No rate limiting (coming soon)
- ⚠️ No token refresh (tokens expire after 24 hours)

### For Production

Consider upgrading to:

1. **Persistent Storage**: Replace in-memory Maps with Redis or database
2. **Rate Limiting**: Add per-user rate limits
3. **Token Refresh**: Implement refresh tokens
4. **Real Auth Provider**: Integrate Firebase, Auth0, or Clerk
5. **HTTPS Only**: Always use HTTPS in production
6. **Session Expiry**: Add automatic session cleanup

## Troubleshooting

### "Missing Bearer token"

- Make sure you completed the OAuth flow
- Check that your token hasn't expired (24 hour lifetime)
- Try reconnecting the MCP server

### "Invalid or expired token"

- Token expired (24 hours) - reconnect to get a new token
- Server restarted (in-memory tokens lost) - reconnect

### "Incorrect WiFi password"

- Check that `WIFI_PASSWORD` in `.env` matches what you're entering
- Default is `darktalent2024!`

### "Session not found"

- Session expired or server restarted
- Client should automatically reinitialize
- Try reconnecting the MCP server

### Can't connect from Claude Mobile

1. Make sure `BASE_URL` is set correctly in Railway
2. Check that server is accessible via HTTPS
3. Verify OAuth endpoints are working: `GET /.well-known/oauth-authorization-server`
4. Check Railway logs for errors

## Development

### Local Testing

```bash
# Terminal 1: Watch mode
npm run dev:http

# Terminal 2: Test the server
curl http://localhost:3000/health
curl http://localhost:3000/.well-known/oauth-authorization-server
```

### Viewing Logs

```bash
# On Railway
railway logs

# Local
npm run dev:http
# Logs go to stderr
```

### Testing OAuth Flow

1. Open browser to: `http://localhost:3000/authorize?client_id=test&redirect_uri=http://localhost:3000/callback&response_type=code&code_challenge=test123&code_challenge_method=plain&state=xyz`
2. Fill in the form
3. Watch the console for the full flow

## Architecture

### Session Management

- Each client gets a unique session ID via `Mcp-Session-Id` header
- Initialize requests create new sessions
- Subsequent requests reuse existing sessions
- DELETE /mcp cleanly terminates sessions

### Transport Types

**Modern (StreamableHTTP)**
- Single endpoint: POST /mcp
- Session ID via header
- Better performance
- Recommended for new clients

**Legacy (SSE)**
- Dual endpoints: GET /mcp + POST /messages
- Session ID via query param
- Backward compatibility
- Long-lived connections

### User Tracking

```
Token → Email → User Profile
              ↓
         Usage Stats
```

Every tool call is tracked and attributed to the authenticated user's email.

## Future Enhancements

- [ ] Add Firebase Authentication
- [ ] Implement rate limiting per user
- [ ] Add token refresh mechanism
- [ ] Persistent storage (Redis/PostgreSQL)
- [ ] Admin dashboard for user management
- [ ] Export usage data to CSV
- [ ] Webhook notifications for new users
- [ ] Multiple authentication methods
- [ ] Custom scopes per user
- [ ] API key management

## Support

For issues or questions:
1. Check the Railway logs: `railway logs`
2. Visit `/stats` endpoint to see system status
3. Check this guide for troubleshooting tips

## License

MIT

