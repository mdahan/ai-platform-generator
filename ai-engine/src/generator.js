import Anthropic from "@anthropic-ai/sdk";
import chalk from "chalk";
import dotenv from "dotenv";
import { buildPrompt, SYSTEM_PROMPT } from "../prompts/system-prompt.js";

// Load environment variables
dotenv.config();

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Configuration options for code generation
 * @typedef {Object} GenerationOptions
 * @property {boolean} [includeTests=false] - Whether to generate unit tests
 * @property {boolean} [includeDocker=false] - Whether to include Docker configuration
 * @property {string} [database='postgresql'] - Database type: 'postgresql', 'mysql', 'mongodb'
 * @property {boolean} [useSystemPrompt=true] - Whether to use the enhanced system prompt
 * @property {number} [maxTokens=8192] - Maximum tokens for the response
 */

/**
 * Generates code using Claude AI based on the provided prompt
 *
 * @param {string} prompt - The prompt describing what code to generate
 * @param {GenerationOptions} [options={}] - Configuration options for generation
 * @returns {Promise<string>} - The generated code as a string
 *
 * @example
 * // Basic usage
 * const code = await generateCode("Create a REST API for managing users");
 *
 * @example
 * // With options
 * const code = await generateCode("Create a REST API for managing users", {
 *   includeTests: true,
 *   includeDocker: true,
 *   database: 'postgresql'
 * });
 */
export async function generateCode(prompt, options = {}) {
  const {
    includeTests = false,
    includeDocker = false,
    database = "postgresql",
    useSystemPrompt = true,
    maxTokens = 16384, // Increased to handle larger applications
  } = options;

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Please create a .env file with your API key."
    );
  }

  if (!prompt || typeof prompt !== "string") {
    throw new Error("Prompt must be a non-empty string");
  }

  console.log(chalk.blue("🚀 Starting code generation..."));
  console.log(chalk.gray(`   Prompt: "${prompt.substring(0, 100)}..."`));
  console.log(
    chalk.gray(`   Options: tests=${includeTests}, docker=${includeDocker}, db=${database}`)
  );

  try {
    console.log(chalk.yellow("📡 Sending request to Claude API..."));

    // Build the full prompt with system instructions
    let fullPrompt;
    if (useSystemPrompt) {
      fullPrompt = buildPrompt(prompt, {
        includeTests,
        includeDocker,
        database,
      });
      console.log(chalk.gray("   Using enhanced system prompt for better code quality"));
    } else {
      // Legacy mode - simple prompt without system instructions
      fullPrompt = `You are an expert code generator. Generate clean, well-commented, production-ready code based on the following request.

IMPORTANT RULES:
- Use CommonJS syntax (require/module.exports), NOT ES modules (import/export)
- This is for Node.js with Express
- Only output the raw code, no markdown code blocks, no explanations before or after
- Do not wrap the code in \`\`\`javascript or any other markers

${prompt}`;
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      messages: [
        {
          role: "user",
          content: fullPrompt,
        },
      ],
    });

    console.log(chalk.green("✅ Response received from Claude API"));

    // Extract text content from the response
    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude API");
    }

    const generatedCode = content.text;
    console.log(
      chalk.green(`✨ Generated ${generatedCode.length} characters of code`)
    );

    // Log token usage for monitoring
    if (message.usage) {
      console.log(
        chalk.gray(
          `   Tokens used: ${message.usage.input_tokens} input, ${message.usage.output_tokens} output`
        )
      );
    }

    return generatedCode;
  } catch (error) {
    if (error.status === 401) {
      console.log(chalk.red("❌ Authentication failed"));
      throw new Error(
        "Invalid API key. Please check your ANTHROPIC_API_KEY in .env file."
      );
    }

    if (error.status === 429) {
      console.log(chalk.red("❌ Rate limit exceeded"));
      throw new Error(
        "Rate limit exceeded. Please wait a moment and try again."
      );
    }

    if (error.status === 500) {
      console.log(chalk.red("❌ Server error"));
      throw new Error("Claude API server error. Please try again later.");
    }

    console.log(chalk.red(`❌ Error: ${error.message}`));
    throw new Error(`Code generation failed: ${error.message}`);
  }
}

/**
 * Gets the current system prompt being used for generation.
 * Useful for debugging and understanding what instructions are being sent.
 *
 * @returns {string} The current system prompt
 */
export function getSystemPrompt() {
  return SYSTEM_PROMPT;
}

/**
 * Generates a preview of the full prompt that would be sent to Claude.
 * Useful for debugging and testing prompt changes.
 *
 * @param {string} userPrompt - The user's requirements
 * @param {GenerationOptions} [options={}] - Generation options
 * @returns {string} The complete prompt that would be sent
 */
export function previewPrompt(userPrompt, options = {}) {
  return buildPrompt(userPrompt, options);
}

export default { generateCode, getSystemPrompt, previewPrompt };
