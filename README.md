# Network School Events MCP Server

A Model Context Protocol (MCP) server that provides access to Network School Luma calendar events through Claude Desktop.

## Features

### Tools
- **get_todays_events**: Fetch all events happening today
- **get_upcoming_events**: Get events in the next N days (default: 7)
- **search_events**: Search events by name or description
- **register_for_event**: Register for events directly with your name and email

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

## Configuration

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

## Tech Stack

- TypeScript
- Node.js
- @modelcontextprotocol/sdk
- axios for HTTP requests
- date-fns for date formatting

## License

MIT

