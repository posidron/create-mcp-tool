# Publishing to npm

This guide covers how to publish the `create-mcp` package to npm.

## Prerequisites

- Node.js 16 or newer
- An npm account (create one at [npmjs.com](https://www.npmjs.com/signup))
- You must be logged in to npm on your local machine

## Before Publishing

1. Ensure all your changes are committed to your repository
2. Update the version number in `package.json` if needed
3. Make sure your `README.md` is up to date
4. Verify you have a `LICENSE` file

## Testing Your Package Locally

Before publishing, you should test that your package works correctly as an npm package:

```bash
# Create a tarball of your package
npm pack

# This will create a file like create-mcp-1.0.0.tgz

# In a different directory, install the tarball
mkdir test-install
cd test-install
npm install ../path/to/create-mcp-1.0.0.tgz -g

# Test that the CLI tool works
create-mcp test-project
```

## Publishing to npm

Once you've tested your package and are ready to publish:

```bash
# Login to npm if you haven't already
npm login

# Publish the package
npm publish

# If you want to publish a scoped package
npm publish --access=public
```

### Publishing a New Version

When you need to publish a new version:

1. Update your code
2. Update the version in `package.json` following [semantic versioning](https://semver.org/):
   - MAJOR version for incompatible API changes
   - MINOR version for added functionality in a backward compatible manner
   - PATCH version for backward compatible bug fixes

3. Publish the new version:
   ```bash
   npm publish
   ```

## Maintenance

### Updating Dependencies

Periodically check for outdated dependencies:

```bash
npm outdated
```

Update dependencies:

```bash
npm update
```

### README Badges

Consider adding version and download badges to your README.md:

```markdown
![npm version](https://img.shields.io/npm/v/create-mcp)
![Downloads](https://img.shields.io/npm/dm/create-mcp)
```

## Unpublishing

If you need to unpublish a version (only possible within 72 hours of publishing):

```bash
npm unpublish create-mcp@1.0.0
```

To unpublish the entire package (only if there are no dependents):

```bash
npm unpublish create-mcp --force
```

Note: npm discourages unpublishing packages that others might depend on.
