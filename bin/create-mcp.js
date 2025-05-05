#!/usr/bin/env node

import chalk from "chalk";
import { execSync } from "child_process";
import { program } from "commander";
import fs from "fs-extra";
import inquirer from "inquirer";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

// Get current file directory with ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Version from package.json
const packageJsonPath = path.join(dirname(__dirname), "package.json");
const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));

program
  .name("create-mcp")
  .description("Bootstrap a new Model Context Protocol (MCP) server project")
  .version(packageJson.version)
  .argument("<project-name>", "Name of your MCP project")
  .option(
    "-t, --template <template>",
    "Template to use (default: basic-stdio, can be a local path or GitHub repo URL)",
    "basic-stdio"
  )
  .option("--no-install", "Skip installing dependencies")
  .option("--no-customize", "Skip customization prompts for built-in templates")
  .action(async (projectName, options) => {
    console.log(
      chalk.blue(`\n🚀 Creating a new MCP project: ${projectName}\n`)
    );

    // Create project directory
    const projectDir = path.resolve(process.cwd(), projectName);
    if (fs.existsSync(projectDir)) {
      const { overwrite } = await inquirer.prompt([
        {
          type: "confirm",
          name: "overwrite",
          message: `Directory ${projectName} already exists. Overwrite?`,
          default: false,
        },
      ]);

      if (!overwrite) {
        console.log(chalk.yellow("Operation cancelled."));
        process.exit(0);
      }

      fs.removeSync(projectDir);
    }

    // Determine if we're using built-in template, a custom path, or a GitHub repo
    const isGitHubRepo = options.template.includes("github.com");
    const isCustomPath =
      !isGitHubRepo &&
      !options.template.startsWith("templates/") &&
      !["basic-stdio", "basic-http"].includes(options.template);

    // Gather basic project information
    const { description, authorName } = await inquirer.prompt([
      {
        type: "input",
        name: "description",
        message: "Project description:",
        default: `${projectName} - A Model Context Protocol server`,
      },
      {
        type: "input",
        name: "authorName",
        message: "Author name:",
        default: "posidron",
      },
    ]);

    let templateResult = { templateName: "" };

    try {
      if (isGitHubRepo) {
        // Handle GitHub repository template
        templateResult = await handleGitHubTemplate(
          options.template,
          projectDir,
          {
            projectName,
            description,
            authorName,
          }
        );
      } else if (isCustomPath) {
        // Handle custom local template
        templateResult = await handleCustomTemplate(
          options.template,
          projectDir,
          {
            projectName,
            description,
            authorName,
          }
        );
      } else {
        // Handle built-in template with optional customization
        templateResult = await handleBuiltInTemplate(
          options.template,
          projectDir,
          {
            projectName,
            description,
            authorName,
            options,
          }
        );
      }

      // Install dependencies if requested
      if (options.install) {
        console.log(chalk.blue("\nInstalling dependencies..."));
        process.chdir(projectDir);
        execSync("npm install --no-fund", { stdio: "inherit" });
      }

      console.log(chalk.green("\n✅ MCP project created successfully!"));
      console.log("\nNext steps:");
      console.log(`  cd ${projectName}`);
      if (!options.install) {
        console.log("  npm install");
      }
      console.log("  npm run build");
      console.log("  npm start");

      // Print template-specific configuration instructions
      printConfigInstructions(projectName, projectDir, templateResult);
    } catch (error) {
      console.error(chalk.red(`\nError creating project: ${error.message}`));
      process.exit(1);
    }
  });

/**
 * Determine the appropriate transport type based on config instructions or template name
 */
function determineTransportType(configInstructions, templateName) {
  // First check if we have transport type in config instructions
  if (configInstructions && configInstructions.transportType) {
    return configInstructions.transportType;
  }

  // Otherwise fall back to template name-based detection
  return templateName.includes("http") ? "http" : "stdio";
}

/**
 * Handle GitHub repository template
 */
async function handleGitHubTemplate(
  repoUrl,
  projectDir,
  { projectName, description, authorName }
) {
  console.log(chalk.blue(`\nCloning template from ${repoUrl}...`));

  const tempDir = path.join(process.cwd(), `.temp-${Date.now()}`);
  const templateName = repoUrl.split("/").pop();
  let configInstructions = null;

  try {
    execSync(`git clone ${repoUrl} ${tempDir}`, { stdio: "inherit" });

    // Remove .git directory to start fresh
    fs.removeSync(path.join(tempDir, ".git"));

    // Copy template contents to project directory, excluding config-instructions.json
    fs.mkdirSync(projectDir, { recursive: true });
    fs.copySync(tempDir, projectDir, {
      filter: (src) => !src.endsWith("config-instructions.json"),
    });

    // Check if the template has a config-instructions.json file
    const templateConfigPath = path.join(tempDir, "config-instructions.json");
    if (fs.existsSync(templateConfigPath)) {
      try {
        configInstructions = JSON.parse(
          fs.readFileSync(templateConfigPath, "utf8")
        );
      } catch (error) {
        console.error(
          chalk.yellow(
            `\nWarning: Failed to read template configuration instructions: ${error.message}`
          )
        );
      }
    }

    // Clean up temp directory
    fs.removeSync(tempDir);

    // Copy prompts directory if it exists
    copyPromptsIfExist(projectDir);

    // Update project metadata
    updateProjectMetadata(projectDir, {
      projectName,
      description,
      authorName,
    });

    return {
      templateName,
      transportType: determineTransportType(configInstructions, templateName),
      configInstructions,
    };
  } catch (error) {
    console.error(chalk.red(`Failed to clone repository: ${error.message}`));
    throw error;
  }
}

/**
 * Handle custom local template
 */
async function handleCustomTemplate(
  templatePath,
  projectDir,
  { projectName, description, authorName }
) {
  const templateDir = path.resolve(process.cwd(), templatePath);
  const templateName = path.basename(templatePath);
  let configInstructions = null;

  if (!fs.existsSync(templateDir)) {
    throw new Error(`Template directory "${templatePath}" does not exist.`);
  }

  // Copy template files to project directory, excluding config-instructions.json
  fs.mkdirSync(projectDir, { recursive: true });
  fs.copySync(templateDir, projectDir, {
    filter: (src) => !src.endsWith("config-instructions.json"),
  });

  // Copy prompts directory if it exists
  copyPromptsIfExist(projectDir);

  // Update project metadata
  updateProjectMetadata(projectDir, { projectName, description, authorName });

  // Check if the template has a config-instructions.json file
  const templateConfigPath = path.join(templateDir, "config-instructions.json");
  if (fs.existsSync(templateConfigPath)) {
    try {
      configInstructions = JSON.parse(
        fs.readFileSync(templateConfigPath, "utf8")
      );
    } catch (error) {
      console.error(
        chalk.yellow(
          `\nWarning: Failed to read template configuration instructions: ${error.message}`
        )
      );
    }
  }

  return {
    templateName,
    transportType: determineTransportType(configInstructions, templateName),
    configInstructions,
  };
}

/**
 * Update basic project metadata in package.json and README.md
 */
function updateProjectMetadata(
  projectDir,
  { projectName, description, authorName }
) {
  // Update package.json
  const pkgJsonPath = path.join(projectDir, "package.json");
  if (fs.existsSync(pkgJsonPath)) {
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
    pkgJson.name = projectName;
    pkgJson.description = description;
    pkgJson.author = authorName;
    fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2));
  }

  // Update README with project-specific details
  const readmePath = path.join(projectDir, "README.md");
  if (fs.existsSync(readmePath)) {
    let readme = fs.readFileSync(readmePath, "utf8");

    // Replace occurrences of template name with project name
    const capitalizedName = projectName
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("");

    readme = readme.replace(/# .+?\n/, `# ${capitalizedName}\n`);
    readme = readme.replace(/^[^\n#]+\n/, `${description}\n`);

    // Replace sample paths in mcpServers configuration with the correct format
    readme = readme.replace(
      /"[^"]+": "[^"]+"/g,
      `"${projectName}": {
      "command": "node",
      "args": [
        "/absolute/path/to/${projectName}/dist/index.js"
      ]
    }`
    );

    fs.writeFileSync(readmePath, readme);
  }
}

/**
 * Customize template based on user preferences
 */
async function customizeTemplate(
  projectDir,
  { projectName, description, authorName }
) {
  // First update basic metadata
  updateProjectMetadata(projectDir, { projectName, description, authorName });

  // Copy prompts directory if it exists
  copyPromptsIfExist(projectDir);

  // Then ask for customization options
  const { useEslint, usePrettier } = await inquirer.prompt([
    {
      type: "confirm",
      name: "useEslint",
      message: "Would you like to use ESLint?",
      default: true,
    },
    {
      type: "confirm",
      name: "usePrettier",
      message: "Would you like to use Prettier?",
      default: true,
    },
  ]);

  // Update package.json with customizations
  const pkgJsonPath = path.join(projectDir, "package.json");
  if (fs.existsSync(pkgJsonPath)) {
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));

    // Add development dependencies based on choices
    if (useEslint) {
      pkgJson.devDependencies = {
        ...pkgJson.devDependencies,
        eslint: "^9.0.0",
        "@typescript-eslint/eslint-plugin": "^8.31.1",
        "@typescript-eslint/parser": "^8.31.1",
      };

      // Add lint scripts
      pkgJson.scripts = {
        ...pkgJson.scripts,
        lint: "eslint 'src/**/*.ts'",
        "lint:fix": "eslint 'src/**/*.ts' --fix",
      };

      // Create .eslintrc.json with modern configuration
      const eslintConfig = {
        parser: "@typescript-eslint/parser",
        extends: [
          "eslint:recommended",
          "plugin:@typescript-eslint/recommended",
        ],
        parserOptions: {
          ecmaVersion: 2022,
          sourceType: "module",
        },
        rules: {},
      };

      fs.writeFileSync(
        path.join(projectDir, ".eslintrc.json"),
        JSON.stringify(eslintConfig, null, 2)
      );
    }

    if (usePrettier) {
      pkgJson.devDependencies = {
        ...pkgJson.devDependencies,
        prettier: "^3.2.5",
      };

      if (useEslint) {
        pkgJson.devDependencies = {
          ...pkgJson.devDependencies,
          "eslint-config-prettier": "^9.1.0",
          "eslint-plugin-prettier": "^5.1.3",
        };

        // Update ESLint config to work with Prettier
        const eslintConfigPath = path.join(projectDir, ".eslintrc.json");
        if (fs.existsSync(eslintConfigPath)) {
          const eslintConfig = JSON.parse(
            fs.readFileSync(eslintConfigPath, "utf8")
          );
          eslintConfig.extends.push("plugin:prettier/recommended");
          fs.writeFileSync(
            eslintConfigPath,
            JSON.stringify(eslintConfig, null, 2)
          );
        }
      }

      // Add format script
      pkgJson.scripts = {
        ...pkgJson.scripts,
        format: "prettier --write 'src/**/*.ts'",
      };

      // Create .prettierrc
      const prettierConfig = {
        semi: true,
        trailingComma: "es5",
        singleQuote: true,
        printWidth: 100,
        tabWidth: 2,
      };

      fs.writeFileSync(
        path.join(projectDir, ".prettierrc"),
        JSON.stringify(prettierConfig, null, 2)
      );
    }

    // Save updated package.json
    fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2));
  }
}

// Replace the copyAssetsIfExist function with a new copyPromptsIfExist function
function copyPromptsIfExist(projectDir) {
  const promptsDir = path.resolve(__dirname, "..", "prompts");
  if (fs.existsSync(promptsDir)) {
    console.log(chalk.blue("\nCopying prompts directory..."));
    fs.copySync(promptsDir, path.join(projectDir, "prompts"));
  }
}

/**
 * Handle built-in template with optional customization
 */
async function handleBuiltInTemplate(
  templateName,
  projectDir,
  { projectName, description, authorName, options }
) {
  const templateDir = path.resolve(__dirname, "..", "templates", templateName);
  let configInstructions = null;

  if (!fs.existsSync(templateDir)) {
    console.error(
      chalk.red(`Built-in template "${templateName}" does not exist.`)
    );
    process.exit(1);
  }

  // Copy template files to project directory, excluding config-instructions.json
  fs.copySync(templateDir, projectDir, {
    filter: (src) => !src.endsWith("config-instructions.json"),
  });

  // Copy prompts directory if it exists
  copyPromptsIfExist(projectDir);

  // Customize template if requested
  if (options.customize) {
    await customizeTemplate(projectDir, {
      projectName,
      description,
      authorName,
    });
  } else {
    // Just update basic metadata without customizing
    updateProjectMetadata(projectDir, {
      projectName,
      description,
      authorName,
    });
  }

  // Check if the template has a config-instructions.json file
  const templateConfigPath = path.join(templateDir, "config-instructions.json");
  if (fs.existsSync(templateConfigPath)) {
    try {
      configInstructions = JSON.parse(
        fs.readFileSync(templateConfigPath, "utf8")
      );
    } catch (error) {
      console.error(
        chalk.yellow(
          `\nWarning: Failed to read template configuration instructions: ${error.message}`
        )
      );
    }
  }

  return {
    templateName,
    transportType: determineTransportType(configInstructions, templateName),
    configInstructions,
  };
}

/**
 * Print configuration instructions based on template type and custom instructions
 */
function printConfigInstructions(projectName, projectDir, templateResult) {
  const { templateName, transportType, configInstructions } = templateResult;

  console.log(chalk.blue("\nConfiguration Instructions:"));

  // If the template provides custom configuration instructions, use those
  if (configInstructions) {
    // Replace template variables in the instructions
    const processedInstructions = JSON.stringify(configInstructions)
      .replace(/\$\{projectName\}/g, projectName)
      .replace(/\$\{projectDir\}/g, projectDir);

    const instructions = JSON.parse(processedInstructions);

    // Skip the transportType key when printing instructions
    Object.entries(instructions)
      .filter(([key]) => key !== "transportType")
      .forEach(([platform, config], index) => {
        console.log(chalk.yellow(`\n${index + 1}. For ${platform}:`));

        // Print configPath if available
        if (config.configPath) {
          console.log(`   Edit config: ${config.configPath}`);
        }

        // Print instruction text if available
        if (config.instructions) {
          console.log(`   ${config.instructions}`);
        }

        // Print configuration snippet if available
        if (config.snippet) {
          console.log(`   ${config.snippet}`);
        }
      });
    return;
  }

  // Otherwise, use built-in instructions based on transport type
  if (transportType === "http") {
    // HTTP-specific configuration instructions
    console.log(chalk.yellow("\n1. For Claude Desktop:"));
    console.log(
      `   Edit config: $HOME/Library/Application\\ Support/Claude/claude_desktop_config.json`
    );
    console.log("   Add to mcpServers:");
    console.log(`   {
  "mcpServers": {
    "${projectName}": {
      "type": "sse",
      "url": "http://localhost:3000/mcp"
    }
  }
}`);

    console.log(chalk.yellow("\n2. For VS Code:"));
    console.log(
      `   Edit config: $HOME/Library/Application\\ Support/Code/User/settings.json`
    );
    console.log("   Add to settings:");
    console.log(`   "mcp": {
  "servers": {
    "${projectName}": {
      "type": "sse",
      "url": "http://localhost:3000/mcp"
    }
  }
}`);

    console.log(chalk.yellow("\n3. For Cursor IDE:"));
    console.log(`   Edit config: $HOME/.cursor/mcp.json`);
    console.log("   Add to mcpServers (same format as Claude Desktop):");
    console.log(`   {
  "mcpServers": {
    "${projectName}": {
      "type": "sse",
      "url": "http://localhost:3000/mcp"
    }
  }
}`);
  } else {
    // Default stdio configuration instructions
    console.log(chalk.yellow("\n1. For Claude Desktop:"));
    console.log(
      `   Edit config: $HOME/Library/Application\\ Support/Claude/claude_desktop_config.json`
    );
    console.log("   Add to mcpServers:");
    console.log(`   {
  "mcpServers": {
    "${projectName}": {
      "command": "node",
      "args": [
        "${path.resolve(projectDir, "dist/index.js")}"
      ]
    }
  }
}`);

    console.log(chalk.yellow("\n2. For VS Code:"));
    console.log(
      `   Edit config: $HOME/Library/Application\\ Support/Code/User/settings.json`
    );
    console.log("   Add to settings:");
    console.log(`   "mcp": {
  "servers": {
    "${projectName}": {
      "type": "stdio",
      "command": "node",
      "args": [
        "${path.resolve(projectDir, "dist/index.js")}"
      ]
    }
  }
}`);

    console.log(chalk.yellow("\n3. For Cursor IDE:"));
    console.log(`   Edit config: $HOME/.cursor/mcp.json`);
    console.log("   Add to mcpServers (same format as Claude Desktop):");
    console.log(`   {
  "mcpServers": {
    "${projectName}": {
      "command": "node",
      "args": [
        "${path.resolve(projectDir, "dist/index.js")}"
      ]
    }
  }
}`);
  }
}

program.parse();
