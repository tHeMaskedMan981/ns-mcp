# Network School Events MCP Server

A Model Context Protocol (MCP) server that provides access to Network School Luma calendar events through Claude Desktop. **Supports both local (stdio) and remote (SSE) modes.**

## Features

### Tools
- **get_todays_events**: Fetch all events happening today
- **get_upcoming_events**: Get events in the next N days (default: 7)
- **search_events**: Search events by name or description
- **register_for_event**: Register for events directly with your name and email
- **search_wiki**: Search wiki content for information

### Wiki Resources
- **Access Network School wiki pages** with information about:
  - Visas (Malaysia, Singapore, travel from different countries)
  - Internet (WiFi passwords, SIM cards)
  - Getting Started guide
  - And more - easily add new wiki pages as markdown files!

## Installation

```bash
npm install
```

## Build

```bash
npm run build
```

## Development

Watch mode for development:

```bash
npm run dev
```

## Testing

Test the API connection and event formatting:

```bash
npm test
```

This will fetch events from the Luma API and display them in the formatted output.

## Running the Server

### Mode 1: Local Mode (stdio) - For Claude Desktop

This is the default mode for local use with Claude Desktop:

```bash
npm start
```

### Mode 2: Remote Mode with OAuth 2.1 (HTTP) - **RECOMMENDED for Production**

**NEW!** Full OAuth 2.1 implementation with WiFi password authentication:

```bash
npm run start:http
```

Or for development with auto-rebuild:

```bash
npm run dev:http
```

This mode includes:
- ✅ Full OAuth 2.1 with PKCE
- ✅ WiFi password authentication
- ✅ Per-user tracking and usage statistics
- ✅ Modern StreamableHTTP transport
- ✅ Session management
- ✅ Scope-based authorization

See **[OAUTH_GUIDE.md](./OAUTH_GUIDE.md)** for complete setup instructions.

### Mode 3: Remote Mode (SSE) - Legacy Support

For remote access over HTTP using Server-Sent Events (older protocol):

```bash
npm run start:sse
```

The server will start on `http://localhost:3000` by default.

#### Environment Variables

You can configure the server using environment variables:

```bash
# .env file
PORT=3000
HOST=0.0.0.0
BASE_URL=http://localhost:3000
WIFI_PASSWORD=darktalent2024!
LUMA_API_KEY=your_luma_api_key
```

Copy `.env.example` to `.env` and update with your values.

Or set them when running:

```bash
PORT=8080 npm run start:http
```

## Configuration

### Local Mode (stdio) Configuration

Add to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "network-school-events": {
      "command": "node",
      "args": ["/Users/akashkumar/Code/ns-mcp/build/index.js"]
    }
  }
}
```

You can also copy the configuration from `claude_config_example.json` in this project.

### Remote Mode Configuration

#### Option A: Modern OAuth 2.1 (Recommended)

Start the server with full OAuth 2.1:

```bash
npm run start:http
```

For Claude Desktop/Mobile, simply add:

```json
{
  "mcpServers": {
    "network-school-events": {
      "url": "https://your-server-url.railway.app/mcp"
    }
  }
}
```

Claude will automatically:
1. Discover OAuth endpoints
2. Redirect you to login page
3. Ask for WiFi password + email
4. Complete OAuth flow
5. Start using the server

**See [OAUTH_GUIDE.md](./OAUTH_GUIDE.md) for detailed setup.**

#### Option B: Legacy SSE Mode

Start the server with SSE:

```bash
npm run start:sse
```

The server includes minimal OAuth 2.0 authentication to satisfy Claude Desktop's requirements while keeping friction low for MVP.

#### For Local Testing (localhost)

Configure Claude Desktop to connect to the local SSE server:

```json
{
  "mcpServers": {
    "network-school-events": {
      "url": "http://localhost:3000/sse",
      "auth": {
        "type": "oauth2",
        "authorizationUrl": "http://localhost:3000/authorize",
        "tokenUrl": "http://localhost:3000/token",
        "clientId": "mcp-client",
        "clientSecret": "not-required"
      }
    }
  }
}
```

#### For Remote Deployment (Replit, Railway, etc.)

1. Deploy your server and get the URL (e.g., `https://your-app.replit.app`)
2. Set the `BASE_URL` environment variable to your deployment URL
3. Configure Claude Desktop:

```json
{
  "mcpServers": {
    "network-school-events": {
      "url": "https://your-app.replit.app/sse",
      "auth": {
        "type": "oauth2",
        "authorizationUrl": "https://your-app.replit.app/authorize",
        "tokenUrl": "https://your-app.replit.app/token",
        "clientId": "mcp-client",
        "clientSecret": "not-required"
      }
    }
  }
}
```

4. In Claude Desktop, click "Connect" next to the server
5. You'll be redirected to a browser for OAuth authorization
6. The page will automatically redirect back to Claude Desktop
7. Your server is now connected!

**Endpoints:**
- SSE endpoint: `/sse`
- Health check: `/health`
- OAuth Authorization: `/authorize`
- OAuth Token: `/token`

**Security Note for MVP:**
This implementation uses minimal OAuth for compatibility with Claude Desktop. The authentication essentially auto-approves all connections. For production use, implement proper authentication with user validation.

## Usage in Claude Desktop

After configuration, restart Claude Desktop. The server will automatically connect when Claude starts.

You can then ask Claude questions like:

**Viewing Events:**
- "What events are happening today at Network School?"
- "Show me upcoming events in the next 14 days"
- "Show me events in the next 30 days"
- "Search for hackathon events"
- "Find events about AI or machine learning"
- "Are there any coding events coming up?"

**Registering for Events:**
- "Register me for the Vibecoding event with name John Doe and email john@example.com"
- "Sign me up for event evt-XXX with my name and email"
- After viewing events, you can say: "Register me for that AI Music Lab event"

**Accessing Wiki Information:**
- "How do I get a visa for Malaysia from India?"
- "What's the WiFi password?"
- "How do I get started at Network School?"
- "What are the visa requirements for Singapore?"
- Claude will automatically access the relevant wiki pages to answer your questions!

### Available Tools

1. **get_todays_events**: Returns all events happening today
2. **get_upcoming_events**: Returns events in the next N days (default: 7)
   - Parameter: `days` (optional, number)
3. **search_events**: Searches events by name or description
   - Parameter: `query` (required, string)
4. **register_for_event**: Register for an event
   - Parameters:
     - `event_id` (required, string): Event API ID from the event listing
     - `name` (required, string): Your full name
     - `email` (required, string): Your email address
     - `phone_number` (optional, string): Your phone number
     - `timezone` (optional, string): Your timezone (default: Asia/Kuala_Lumpur)

## API

This server fetches data from the public Network School Luma calendar API. No authentication is required.

## Adding Wiki Content

To add or update wiki pages:

1. Create a new `.md` file in the `wiki/` directory:
   ```bash
   echo "# My New Page" > wiki/my-new-page.md
   ```

2. Add your content in Markdown format

3. Rebuild the server:
   ```bash
   npm run build
   ```

4. Restart Claude Desktop

The new wiki page will automatically be available as a resource that Claude can access!

**Tips:**
- Use descriptive filenames (e.g., `transportation.md`, `food-guide.md`)
- Include headers with `#` for better organization
- Link to other resources or external URLs
- Keep information up-to-date

## Architecture

This server supports two transport modes:

### stdio Transport (Local)
- Uses standard input/output for communication
- Launched directly by Claude Desktop as a subprocess
- Best for local development and single-user scenarios

### SSE Transport (Remote)
- Uses Server-Sent Events over HTTP
- Runs as an HTTP server
- Allows remote access from anywhere
- Supports multiple concurrent connections
- CORS enabled for cross-origin requests

## Tech Stack

- TypeScript
- Node.js
- @modelcontextprotocol/sdk
- Express (for SSE mode)
- axios for HTTP requests
- date-fns for date formatting
- cors for cross-origin support

## License

MIT

