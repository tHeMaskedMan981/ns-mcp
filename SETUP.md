# Setup Guide for Claude Desktop

This guide will help you connect the Network School Events MCP server to Claude Desktop.

## Step 1: Build the Project

```bash
cd /Users/akashkumar/Code/ns-mcp
npm install
npm run build
```

## Step 2: Test the Server

Verify the API connection works:

```bash
npm test
```

You should see a list of upcoming events. If this works, the server is ready to use.

## Step 3: Configure Claude Desktop

1. Open the Claude Desktop configuration file:

   **macOS**: 
   ```bash
   open ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

   **Windows**:
   ```
   notepad %APPDATA%\Claude\claude_desktop_config.json
   ```

2. Add the server configuration to the `mcpServers` object:

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

   If you already have other MCP servers configured, add a comma after the previous entry and append the new configuration.

3. Save the file.

## Step 4: Restart Claude Desktop

1. Quit Claude Desktop completely
2. Reopen Claude Desktop

## Step 5: Verify Connection

In Claude Desktop, try asking:

> "What Network School events are happening today?"

If the server is connected correctly, Claude will use the `get_todays_events` tool to fetch and display the events.

## Troubleshooting

### Server Not Connecting

1. Check the Claude Desktop logs:
   - macOS: `~/Library/Logs/Claude/mcp*.log`
   - Windows: `%APPDATA%\Claude\logs\mcp*.log`

2. Verify the path in the config is correct:
   ```bash
   ls /Users/akashkumar/Code/ns-mcp/build/index.js
   ```

3. Test the server manually:
   ```bash
   node /Users/akashkumar/Code/ns-mcp/build/index.js
   ```
   The server should start and output: "Network School Events MCP Server running on stdio"

### Events Not Showing

1. Run the test command to verify API access:
   ```bash
   npm test
   ```

2. Check your internet connection

### Invalid JSON in Config

- Use a JSON validator to check your config file
- Make sure all braces `{}` and brackets `[]` are properly closed
- Make sure all strings use double quotes `"`, not single quotes
- Don't forget commas between entries

## Example Queries

Once connected, try these queries in Claude Desktop:

- "What events are happening today at Network School?"
- "Show me all events in the next 2 weeks"
- "Search for AI-related events"
- "Are there any hackathon events coming up?"
- "Show me events about coding or programming"

## Updating the Server

After making changes to the code:

```bash
cd /Users/akashkumar/Code/ns-mcp
npm run build
```

Then restart Claude Desktop to load the updated server.

