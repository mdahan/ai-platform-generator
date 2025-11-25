/**
 * Test script for the enhanced system prompt
 *
 * This script tests the code generation with the new system prompt
 * to verify improved code quality.
 *
 * Usage:
 *   node test-system-prompt.js
 */

import { generateCode, getSystemPrompt, previewPrompt } from "./src/generator.js";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function testSystemPrompt() {
  console.log(chalk.blue.bold("\n=== System Prompt Test ===\n"));

  // Show current system prompt
  console.log(chalk.yellow("Current System Prompt (first 500 chars):"));
  console.log(chalk.gray(getSystemPrompt().substring(0, 500) + "...\n"));

  // Preview the full prompt
  const testUserPrompt = "Create a simple todo API with CRUD operations";
  console.log(chalk.yellow("Preview full prompt for:"), chalk.white(testUserPrompt));
  console.log(chalk.gray("---"));
  const fullPrompt = previewPrompt(testUserPrompt, {
    includeTests: false,
    includeDocker: false,
    database: "postgresql",
  });
  console.log(chalk.gray(fullPrompt.substring(0, 800) + "...\n"));
  console.log(chalk.gray(`Total prompt length: ${fullPrompt.length} characters\n`));

  // Generate code with the new system prompt
  console.log(chalk.blue.bold("=== Generating Code ===\n"));

  try {
    const generatedCode = await generateCode(
      "Create a simple health check endpoint that returns server status, uptime, and memory usage",
      {
        useSystemPrompt: true,
        maxTokens: 4096,
      }
    );

    // Save generated code
    const outputPath = path.join(__dirname, "generated", "test-system-prompt-output.js");
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, generatedCode);

    console.log(chalk.green(`\nGenerated code saved to: ${outputPath}`));
    console.log(chalk.yellow("\nGenerated Code Preview (first 1500 chars):"));
    console.log(chalk.gray("---"));
    console.log(generatedCode.substring(0, 1500));
    console.log(chalk.gray("---"));

    // Analyze code quality
    console.log(chalk.blue.bold("\n=== Code Quality Analysis ===\n"));

    const hasJSDoc = generatedCode.includes("/**") && generatedCode.includes("@param");
    const hasTryCatch = generatedCode.includes("try") && generatedCode.includes("catch");
    const hasErrorHandling = generatedCode.includes("error") || generatedCode.includes("Error");
    const hasComments = (generatedCode.match(/\/\//g) || []).length > 2;
    const hasHealthEndpoint = generatedCode.includes("/health");

    console.log(chalk.white("Quality Checks:"));
    console.log(`  ${hasJSDoc ? chalk.green("✓") : chalk.red("✗")} JSDoc comments present`);
    console.log(`  ${hasTryCatch ? chalk.green("✓") : chalk.red("✗")} Try-catch error handling`);
    console.log(`  ${hasErrorHandling ? chalk.green("✓") : chalk.red("✗")} Error handling logic`);
    console.log(`  ${hasComments ? chalk.green("✓") : chalk.red("✗")} Inline comments present`);
    console.log(`  ${hasHealthEndpoint ? chalk.green("✓") : chalk.red("✗")} Health endpoint included`);

    const score = [hasJSDoc, hasTryCatch, hasErrorHandling, hasComments, hasHealthEndpoint].filter(Boolean).length;
    console.log(chalk.blue(`\nQuality Score: ${score}/5`));

    if (score >= 4) {
      console.log(chalk.green.bold("\n✓ System prompt is working well!"));
    } else if (score >= 2) {
      console.log(chalk.yellow.bold("\n⚠ System prompt could be improved"));
    } else {
      console.log(chalk.red.bold("\n✗ System prompt needs adjustment"));
    }

  } catch (error) {
    console.log(chalk.red(`\nError: ${error.message}`));
    console.log(chalk.gray("Make sure ANTHROPIC_API_KEY is set in .env file"));
  }
}

testSystemPrompt();
