import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

/**
 * Minimal MCP Server with stdio Transport
 *
 * A starter implementation of the Model Context Protocol server using stdio transport.
 * This template is designed to be extended with your own tools, resources, and prompts.
 * This is ideal for direct integration with Claude Desktop.
 */
class MinimalMcpServer {
  private server: McpServer;

  constructor() {
    // Create an MCP server with metadata
    this.server = new McpServer({
      name: "Minimal MCP Server",
      version: "1.0.0",
    });

    this.registerTools();
  }

  /**
   * Register tools with the MCP server.
   * Add your tools here following this pattern.
   */
  private registerTools(): void {
    // Sample tool: simple echo tool that demonstrates the pattern
    this.server.tool(
      "echo",
      {
        message: z.string().describe("Message to echo back"),
      },
      async ({ message }: { message: string }) => {
        try {
          return {
            content: [
              {
                type: "text" as const,
                text: `Received message: ${message}`,
              },
            ],
          };
        } catch (error) {
          return {
            isError: true,
            content: [
              {
                type: "text" as const,
                text: `Error in echo tool: ${(error as Error).message}`,
              },
            ],
          };
        }
      }
    );
  }

  /**
   * Start the MCP server.
   * This connects the server to stdin/stdout for Claude Desktop integration.
   */
  public async start(): Promise<void> {
    try {
      // Start receiving messages on stdin and sending messages on stdout
      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      console.error("MCP Server started and ready for connections.");
    } catch (error) {
      console.error("Failed to start MCP Server:", error);
      process.exit(1);
    }
  }
}

// Start the server
const server = new MinimalMcpServer();
server.start().catch((error) => {
  console.error("Failed to start MCP Server:", error);
  process.exit(1);
});
