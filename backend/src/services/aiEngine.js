import { fileURLToPath, pathToFileURL } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const AI_ENGINE_PATH = join(__dirname, "..", "..", "..", "ai-engine", "src");

/**
 * Wrapper service for the AI Engine
 * Imports and calls the existing AI engine from ../ai-engine/src/generator.js
 */

let generator = null;
let executor = null;

/**
 * Initialize the AI engine modules
 * Uses pathToFileURL to convert Windows paths to file:// URLs
 */
async function initializeEngine() {
  if (!generator) {
    const generatorPath = join(AI_ENGINE_PATH, "generator.js");
    const generatorUrl = pathToFileURL(generatorPath).href;
    const generatorModule = await import(generatorUrl);
    generator = generatorModule;
  }
  if (!executor) {
    const executorPath = join(AI_ENGINE_PATH, "executor.js");
    const executorUrl = pathToFileURL(executorPath).href;
    const executorModule = await import(executorUrl);
    executor = executorModule;
  }
}

/**
 * Build a comprehensive prompt for the AI based on project config
 * @param {Object} config - Project configuration from wizard
 * @returns {string} - Formatted prompt for Claude
 */
function buildPrompt(config) {
  const {
    name,
    description,
    industry,
    features = [],
    integrations = [],
    multiTenant = false,
    authentication = "basic",
  } = config;

  let prompt = `Create a production-ready Node.js Express API application with the following specifications:

APPLICATION NAME: ${name}

DESCRIPTION:
${description}

`;

  if (industry) {
    prompt += `INDUSTRY: ${industry}\n\n`;
  }

  if (features.length > 0) {
    prompt += `REQUIRED FEATURES:\n`;
    features.forEach((feature, i) => {
      prompt += `${i + 1}. ${feature}\n`;
    });
    prompt += "\n";
  }

  if (integrations.length > 0) {
    prompt += `INTEGRATIONS:\n`;
    integrations.forEach((integration, i) => {
      prompt += `${i + 1}. ${integration}\n`;
    });
    prompt += "\n";
  }

  if (multiTenant) {
    prompt += `MULTI-TENANT ARCHITECTURE:
- Implement tenant isolation using tenant_id
- All database queries must filter by tenant
- Support tenant-specific configurations
- Secure data separation between tenants

`;
  }

  prompt += `AUTHENTICATION: ${authentication}

TECHNICAL REQUIREMENTS:
1. Use Express.js for the API framework
2. Use CommonJS (require/module.exports) syntax
3. Include comprehensive input validation
4. Return JSON responses with consistent structure
5. Include error handling middleware
6. Add health check endpoint at GET /health
7. Log requests and errors
8. Include in-memory storage (database will be added later)

The API should be complete and runnable with 'node server.js'.
Start the server on port 3000 or use process.env.PORT.

Generate a single server.js file that includes all the functionality.`;

  return prompt;
}

/**
 * Generate code using the AI engine
 * @param {Object} config - Project configuration
 * @returns {Promise<Object>} - Generation result
 */
export async function generate(config) {
  await initializeEngine();

  const prompt = buildPrompt(config);
  console.log("[AIEngine] Starting generation with prompt length:", prompt.length);

  try {
    const code = await generator.generateCode(prompt);
    return {
      success: true,
      code,
      prompt,
    };
  } catch (error) {
    console.error("[AIEngine] Generation failed:", error.message);
    return {
      success: false,
      error: error.message,
      prompt,
    };
  }
}

/**
 * Test generated code using the AI engine executor
 * @param {string} codeFilePath - Path to the generated code file
 * @param {Object[]} testCases - Array of test cases
 * @returns {Promise<Object>} - Test results
 */
export async function testCode(codeFilePath, testCases = []) {
  await initializeEngine();

  // Default test case if none provided
  const defaultTests = [
    {
      name: "Health check",
      method: "GET",
      endpoint: "/health",
      expected: {
        status: 200,
      },
    },
  ];

  const tests = testCases.length > 0 ? testCases : defaultTests;

  try {
    const result = await executor.executeCode(codeFilePath, {
      testCases: tests,
      port: 3456 + Math.floor(Math.random() * 1000), // Random port to avoid conflicts
      cleanup: true,
    });

    return {
      success: result.success,
      tests: result.tests,
      steps: result.steps,
      duration: result.duration,
      error: result.error,
    };
  } catch (error) {
    console.error("[AIEngine] Testing failed:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

export default { generate, testCode, buildPrompt };
