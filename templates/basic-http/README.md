# Minimal MCP Server (HTTP transport)

A simple, extensible Model Context Protocol server template using HTTP transport.

## Requirements

- Node.js 18+

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the project:
   ```bash
   npm run build
   ```

## Usage

Start the server:
```bash
npm start
```

This will start an HTTP server on port 3000 (or the port specified in the PORT environment variable). The MCP endpoint will be available at:

```
http://localhost:3000/mcp
```

## Configuration with Claude Desktop

You can also use this HTTP-based MCP server with Claude Desktop:

1. Edit your Claude Desktop configuration:
   ```bash
   vim $HOME/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

   Or for VS Code:
   ```bash
   vim $HOME/Library/Application\ Support/Code/User/settings.json
   ```

   In VS Code, add to the settings.json:
   ```json
   "mcp": {
     "servers": {
       "minimal-mcp-server": {
         "type": "http",
         "url": "http://localhost:3000/mcp"
       }
     }
   }
   ```

   Or for Cursor IDE:
   ```bash
   vim $HOME/.cursor/mcp.json
   ```

2. For Claude Desktop and Cursor, add an entry to the `mcpServers` section:
   ```json
   {
     "mcpServers": {
       "minimal-mcp-server": {
         "type": "http",
         "url": "http://localhost:3000/mcp"
       }
     }
   }
   ```

3. Start your HTTP server and restart Claude Desktop

## Available Tools

This minimal MCP provides a single demonstration tool:

- `echo`: Simple echo tool that returns any message you send

## Extending the Server

To add your own functionality:

1. Edit `src/index.ts`
2. Add new tools in the `registerTools()` method
3. Follow the existing pattern for consistent error handling
4. Build with `npm run build`

### Adding a Tool Example

```typescript
// In the registerTools() method:
this.server.tool(
  "myTool",
  {
    param1: z.string().describe("Description of parameter 1"),
    param2: z.number().optional().describe("Optional numeric parameter"),
  },
  async ({ param1, param2 }) => {
    try {
      // Your tool implementation here
      const result = `Processed ${param1} with value ${param2}`;

      return {
        content: [
          {
            type: "text" as const,
            text: result,
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: `Error in myTool: ${(error as Error).message}`,
          },
        ],
      };
    }
  }
);
```

## HTTP Transport Details

This server uses the Streamable HTTP transport from the MCP specification:

- POST /mcp - For client-to-server messages
- GET /mcp - For server-to-client notifications using Server-Sent Events (SSE)
- DELETE /mcp - For session termination

The server supports multiple simultaneous clients through session management.

## Development

To run in development mode:
```bash
npm run dev
```

## License

MIT
