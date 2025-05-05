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

    try {
      if (isGitHubRepo) {
        // Handle GitHub repository template
        await handleGitHubTemplate(options.template, projectDir, {
          projectName,
          description,
          authorName,
        });
      } else if (isCustomPath) {
        // Handle custom local template
        await handleCustomTemplate(options.template, projectDir, {
          projectName,
          description,
          authorName,
        });
      } else {
        // Handle built-in template with optional customization
        const templateName = options.template;
        const templateDir = path.resolve(
          __dirname,
          "..",
          "templates",
          templateName
        );

        if (!fs.existsSync(templateDir)) {
          console.error(
            chalk.red(`Built-in template "${templateName}" does not exist.`)
          );
          process.exit(1);
        }

        // Copy template files to project directory
        fs.copySync(templateDir, projectDir);

        // Copy assets directory if it exists
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
      }

      // Install dependencies if requested
      if (options.install) {
        console.log(chalk.blue("\nInstalling dependencies..."));
        process.chdir(projectDir);
        execSync("npm install", { stdio: "inherit" });
      }

      console.log(chalk.green("\n✅ MCP project created successfully!"));
      console.log("\nNext steps:");
      console.log(`  cd ${projectName}`);
      if (!options.install) {
        console.log("  npm install");
      }
      console.log("  npm run build");
      console.log("  npm start");
      console.log("\nThen configure in your Claude Desktop config:");
      console.log(
        `  $HOME/Library/Application\\ Support/Claude/claude_desktop_config.json`
      );
      console.log("\nOr for VS Code:");
      console.log(
        `  $HOME/Library/Application\\ Support/Code/User/settings.json`
      );
      console.log('  In the "mcp.servers" section:');
      console.log(`  "mcp": {
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
      console.log("\nOr for Cursor IDE:");
      console.log(`  $HOME/.cursor/mcp.json`);
      console.log("\nFor Claude Desktop and Cursor, add to mcpServers:");
      console.log(`{
  "mcpServers": {
    "${projectName}": {
      "command": "node",
      "args": [
        "${path.resolve(projectDir, "dist/index.js")}"
      ]
    }
  }
}`);
    } catch (error) {
      console.error(chalk.red(`\nError creating project: ${error.message}`));
      process.exit(1);
    }
  });

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
  try {
    execSync(`git clone ${repoUrl} ${tempDir}`, { stdio: "inherit" });

    // Remove .git directory to start fresh
    fs.removeSync(path.join(tempDir, ".git"));

    // Copy template contents to project directory
    fs.mkdirSync(projectDir, { recursive: true });
    fs.copySync(tempDir, projectDir);

    // Clean up temp directory
    fs.removeSync(tempDir);

    // Copy assets directory if it exists
    copyPromptsIfExist(projectDir);

    // Update project metadata
    updateProjectMetadata(projectDir, { projectName, description, authorName });
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

  if (!fs.existsSync(templateDir)) {
    throw new Error(`Template directory "${templatePath}" does not exist.`);
  }

  // Copy template files to project directory
  fs.mkdirSync(projectDir, { recursive: true });
  fs.copySync(templateDir, projectDir);

  // Copy assets directory if it exists
  copyPromptsIfExist(projectDir);

  // Update project metadata
  updateProjectMetadata(projectDir, { projectName, description, authorName });
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

  // Copy assets directory if it exists
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
        eslint: "^8.56.0",
        "@typescript-eslint/eslint-plugin": "^7.2.0",
        "@typescript-eslint/parser": "^7.2.0",
      };

      // Add lint scripts
      pkgJson.scripts = {
        ...pkgJson.scripts,
        lint: "eslint 'src/**/*.ts'",
        "lint:fix": "eslint 'src/**/*.ts' --fix",
      };

      // Create .eslintrc.json
      const eslintConfig = {
        parser: "@typescript-eslint/parser",
        extends: [
          "eslint:recommended",
          "plugin:@typescript-eslint/recommended",
        ],
        parserOptions: {
          ecmaVersion: 2020,
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

/**
 * Create HTTP server template file
 */
function createHttpServerTemplate(projectDir) {
  console.log(chalk.blue("\nHTTP transport already included in template."));
}

// Replace the copyAssetsIfExist function with a new copyPromptsIfExist function
function copyPromptsIfExist(projectDir) {
  const promptsDir = path.resolve(__dirname, "..", "prompts");
  if (fs.existsSync(promptsDir)) {
    console.log(chalk.blue("\nCopying prompts directory..."));
    fs.copySync(promptsDir, path.join(projectDir, "prompts"));
  }
}

program.parse();
