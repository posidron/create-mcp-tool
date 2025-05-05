import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import cors from "cors";
import { randomUUID } from "crypto";
import express from "express";
import { createServer } from "http";
import { z } from "zod";

/**
 * Minimal MCP Server with HTTP Transport
 *
 * A starter implementation of the Model Context Protocol server using Streamable HTTP transport.
 * This template is designed to be extended with your own tools, resources, and prompts.
 */
export class MinimalMcpServer {
  public server: McpServer;

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
}

// Start HTTP server
const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;

// Create an instance of the MCP server
const mcpServer = new MinimalMcpServer();

// Create HTTP server from Express app
const httpServer = createServer(app);

// Map to store transports by session ID
const transports: Record<string, any> = {};

// Handle POST requests for client-to-server communication
app.post("/mcp", async (req, res) => {
  // Check for existing session ID
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  let transport;

  if (sessionId && transports[sessionId]) {
    // Reuse existing transport
    transport = transports[sessionId];
  } else if (!sessionId) {
    // New initialization request
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        // Store the transport by session ID
        transports[sessionId] = transport;
      },
    });

    // Clean up transport when closed
    transport.onclose = () => {
      if (transport.sessionId) {
        delete transports[transport.sessionId];
      }
    };

    // Connect to the MCP server
    await mcpServer.server.connect(transport);
  } else {
    // Invalid request
    res.status(400).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Bad Request: No valid session ID provided",
      },
      id: null,
    });
    return;
  }

  // Handle the request
  await transport.handleRequest(req, res, req.body);
});

// Reusable handler for GET and DELETE requests
const handleSessionRequest = async (
  req: express.Request,
  res: express.Response
) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }

  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
};

// Handle GET requests for server-to-client notifications via SSE
app.get("/mcp", handleSessionRequest);

// Handle DELETE requests for session termination
app.delete("/mcp", handleSessionRequest);

// Start the server
httpServer.listen(PORT, () => {
  console.log(`MCP HTTP Server running at http://localhost:${PORT}/mcp`);
});
