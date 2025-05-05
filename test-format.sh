#!/bin/bash
set -e

# Test the format output of the CLI tool
echo "Testing CLI output format..."

# Create a temporary test directory
TEST_DIR=$(mktemp -d)
echo "Creating test directory: $TEST_DIR"
cd "$TEST_DIR"

# Run create-mcp with no customization or installation to make it faster
echo "Running create-mcp..."
npx /Users/posidron/Downloads/mcps/create-mcp-tool --no-customize --no-install test-mcp-format

# Done
echo -e "\n✅ Test completed. Check the output above for the correct format."
echo "Test project created at: $TEST_DIR/test-mcp-format"
echo "You can remove it with: rm -rf $TEST_DIR"
