# Minimal MCP Server (stdio transport)

A simple, extensible Model Context Protocol server template using stdio transport.

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

## Configuration

To use this MCP with Claude Desktop:

1. Get the absolute path to the transpiled script:
   ```bash
   echo "$(pwd)/dist/index.js"
   ```

2. Edit your Claude Desktop configuration:
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
         "type": "stdio",
         "command": "node",
         "args": [
           "/absolute/path/to/minimal-mcp-server/dist/index.js"
         ]
       }
     }
   }
   ```

   Or for Cursor IDE:
   ```bash
   vim $HOME/.cursor/mcp.json
   ```

3. For Claude Desktop and Cursor, add an entry to the `mcpServers` section:
   ```json
   {
     "mcpServers": {
       "minimal-mcp-server": {
         "command": "node",
         "args": [
           "/absolute/path/to/minimal-mcp-server/dist/index.js"
         ]
       }
     }
   }
   ```

4. Restart Claude Desktop

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

## Development

To run in development mode:
```bash
npm run dev
```

## License

MIT
