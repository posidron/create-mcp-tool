#!/bin/bash
set -e

# Create a temporary test directory
TEST_DIR=$(mktemp -d)
echo "Creating test directory: $TEST_DIR"

# Pack the current project
echo "Packing @mantiqo/create-mcp..."
TARBALL_PATH=$(npm pack | tail -n 1)
echo "Created tarball: $TARBALL_PATH"

# Get absolute path to tarball
ABSOLUTE_TARBALL_PATH="$(pwd)/$TARBALL_PATH"
echo "Absolute tarball path: $ABSOLUTE_TARBALL_PATH"

# Move to the test directory
cd "$TEST_DIR"

# Safely uninstall any existing installations
echo "Removing any existing installations..."
npm uninstall -g create-mcp 2>/dev/null || true
npm uninstall -g @mantiqo/create-mcp 2>/dev/null || true

# Install the package globally
echo "Installing package globally for testing..."
npm install -g "$ABSOLUTE_TARBALL_PATH"

# Test the stdio transport template (default)
echo "Testing stdio transport template..."
create-mcp stdio-project

# Test the HTTP transport template
echo "Testing HTTP transport template..."
create-mcp http-project --template basic-http

# Display success
echo -e "\n\n✅ Installation test successful!"
echo "Test projects created at:"
echo "- $TEST_DIR/stdio-project (stdio transport)"
echo "- $TEST_DIR/http-project (HTTP transport)"
echo "You can now explore these test projects to verify everything is working as expected."
echo -e "\nTo remove the test directory and global installation:"
echo "rm -rf $TEST_DIR"
echo "npm uninstall -g @mantiqo/create-mcp"

# Add execution instructions
echo -e "\nFor manual testing of stdio transport, you can:"
echo "cd $TEST_DIR/stdio-project"
echo "npm install"
echo "npm run build"
echo "npm start"

echo -e "\nFor manual testing of HTTP transport, you can:"
echo "cd $TEST_DIR/http-project"
echo "npm install"
echo "npm run build"
echo "npm start"
echo "Then connect to http://localhost:3000/mcp"
