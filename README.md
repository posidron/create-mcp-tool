# @mantiqo/create-mcp

[![npm version](https://img.shields.io/npm/v/@mantiqo/create-mcp)](https://www.npmjs.com/package/@mantiqo/create-mcp)
[![Downloads](https://img.shields.io/npm/dm/@mantiqo/create-mcp)](https://www.npmjs.com/package/@mantiqo/create-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A flexible bootstrap tool for creating Model Context Protocol (MCP) servers.

## What is this?

This tool creates a customizable scaffold for building MCP servers with optional enhancements. It provides:

- A complete but minimal TypeScript MCP server implementation
- Support for different transport mechanisms (stdio or HTTP) via templates
- Support for built-in templates, local templates, or GitHub templates
- Customization options for ESLint and Prettier
- Simple example showing the pattern for adding tools
- Easy extensibility for your specific needs

## Installation

```bash
# Install globally from npm
npm install -g @mantiqo/create-mcp

# Or use npx to run without installing
npx @mantiqo/create-mcp@latest my-mcp-project
```

## Usage

### Basic Usage

```bash
# Create a new MCP project with stdio transport (default)
create-mcp my-mcp-project

# Create a new MCP project with HTTP transport
create-mcp my-mcp-project --template basic-http
```

### Template Selection

There are three ways to select templates:

1. **Using built-in templates:**
   ```bash
   # Use the stdio template (this is the default)
   create-mcp my-project --template basic-stdio

   # Use the HTTP template
   create-mcp my-project --template basic-http
   ```

2. **Using custom local templates:**
   ```bash
   # Use a local directory as template
   create-mcp my-project --template ./path/to/template
   ```

3. **Using GitHub templates:**
   ```bash
   # Use a GitHub repository as template
   create-mcp my-project --template https://github.com/username/mcp-template
   ```

### Other Options

```bash
# Skip customization prompts
create-mcp my-mcp-project --no-customize

# Skip installing dependencies
create-mcp my-mcp-project --no-install
```

## Templates

### Built-in Templates

- **basic-stdio** (default): Minimal MCP server with stdio transport and echo tool
- **basic-http**: Minimal MCP server with HTTP transport and echo tool

Each template is designed for a specific transport mechanism. Choose the one that best fits your needs.

### Using Custom Templates

You can use any directory or GitHub repository as a template. The tool will:

1. Copy all files from the template
2. Update package.json with your project information
3. Modify README.md to reflect your project name and description
4. Optionally customize with additional features
5. Include prompts directory for LLM interaction

### Template-Specific Configuration Instructions

Templates can provide their own configuration instructions by including a `config-instructions.json` file at the root of the template. This file allows templates to define exactly how they should be configured in different environments.

Example `config-instructions.json`:

```json
{
  "transportType": "http",
  "Claude Desktop": {
    "configPath": "$HOME/Library/Application\\ Support/Claude/claude_desktop_config.json",
    "instructions": "Add to mcpServers:",
    "snippet": "{\n  \"mcpServers\": {\n    \"${projectName}\": {\n      \"type\": \"sse\",\n      \"url\": \"http://localhost:3000/mcp\"\n    }\n  }\n}"
  },
  "VS Code": {
    "configPath": "$HOME/Library/Application\\ Support/Code/User/settings.json",
    "instructions": "Add to settings:",
    "snippet": "\"mcp\": {\n  \"servers\": {\n    \"${projectName}\": {\n      \"type\": \"sse\",\n      \"url\": \"http://localhost:3000/mcp\"\n    }\n  }\n}"
  }
}
```

The format supports:
- `transportType`: Specify "http" or "stdio" to indicate which transport mechanism the template uses
- Multiple environments (Claude Desktop, VS Code, etc.)
- Template variables: `${projectName}` and `${projectDir}` are automatically replaced
- Custom instructions and configuration snippets

## Transport Options

The MCP specification defines different transport mechanisms, which are implemented in our built-in templates:

- **stdio** (basic-stdio template): Simple transport using standard input/output, ideal for direct integration with Claude Desktop
- **HTTP** (basic-http template): Uses Streamable HTTP transport with Server-Sent Events (SSE) for server-to-client communication

## Customization Options

When using built-in templates, you can add optional features:

- **ESLint**: Adds linting with TypeScript support
- **Prettier**: Adds code formatting

## Features

The generated MCP server includes:

- TypeScript support
- MCP SDK integration
- Basic server setup with the transport defined by the template
- Example echo tool to demonstrate the pattern
- Clean architecture to extend with your own tools
- Prompts directory with reference materials for LLM interaction

## Configuration

### stdio Transport (basic-stdio template)

After creating a server with the stdio transport template, you can integrate it with Claude Desktop by adding it to your configuration file:

```bash
# Edit Claude Desktop config
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
    "my-mcp-project": {
      "type": "stdio",
      "command": "node",
      "args": [
        "/absolute/path/to/my-mcp-project/dist/index.js"
      ]
    }
  }
}
```

Or for Cursor IDE:
```bash
vim $HOME/.cursor/mcp.json
```

For Claude Desktop and Cursor, add an entry to the `mcpServers` section:

```json
{
  "mcpServers": {
    "my-mcp-project": {
      "type": "stdio",
      "command": "node",
      "args": [
        "/absolute/path/to/my-mcp-project/dist/index.js"
      ]
    }
  }
}
```

After updating the configuration, restart Claude Desktop.

### HTTP Transport (basic-http template)

After creating a server with the HTTP transport template, start it and connect to it:

```bash
# Start the server
npm start

# The MCP endpoint will be available at:
http://localhost:3000/mcp
```

You can also configure Claude Desktop to use the HTTP-based MCP server:

```json
{
  "mcpServers": {
    "my-mcp-project": {
      "type": "http",
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

## Extending Your Server

The minimal template is designed to be extended. Add your own tools by:

1. Editing `src/index.ts`
2. Adding new tool definitions in the `registerTools()` method
3. Following the patterns established in the sample code

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT](LICENSE)
