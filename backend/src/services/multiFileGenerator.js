import { fileURLToPath, pathToFileURL } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const AI_ENGINE_PATH = join(__dirname, "..", "..", "..", "ai-engine", "src");

/**
 * Wrapper service for the multi-file AI generator
 * Imports from ../ai-engine/src/multiFileGenerator.js
 */

let multiFileGen = null;

/**
 * Initialize the multi-file generator module
 */
async function initializeGenerator() {
  if (!multiFileGen) {
    const generatorPath = join(AI_ENGINE_PATH, "multiFileGenerator.js");
    const generatorUrl = pathToFileURL(generatorPath).href;
    const generatorModule = await import(generatorUrl);
    multiFileGen = generatorModule;
  }
}

/**
 * Generation phases available
 */
export const GENERATION_PHASES = {
  BACKEND: "backend",
  FRONTEND: "frontend",
  DATABASE: "database",
  INFRASTRUCTURE: "infrastructure",
  DOCUMENTATION: "documentation",
};

/**
 * Generate multiple files for a complete application using batch processing
 * Generates in phases to avoid token limits:
 * 1. Backend (server.js, routes, models, services, middleware)
 * 2. Frontend (Next.js pages, components, lib)
 * 3. Database (schema, migrations, seeds)
 * 4. Infrastructure (Docker, CI/CD)
 * 5. Documentation (README, API docs)
 *
 * @param {Object} config - Project configuration
 * @param {string} config.name - Project name
 * @param {string} config.description - Project description
 * @param {string[]} config.features - List of features
 * @param {string} config.industry - Industry type
 * @param {boolean} config.multiTenant - Whether multi-tenant
 * @param {string} config.authentication - Authentication type
 * @param {Function} [onProgress] - Optional progress callback
 * @returns {Promise<{files: Object<string, string>, stats: Object, phases: Object[]}>}
 */
export async function generateMultipleFiles(config, onProgress = null) {
  await initializeGenerator();

  console.log("[MultiFileGenerator] Starting batch generation for:", config.name);
  console.log("[MultiFileGenerator] Phases: backend, frontend, database, infrastructure, documentation");

  try {
    const result = await multiFileGen.generateMultipleFiles(config, onProgress);
    console.log(`[MultiFileGenerator] Complete: ${result.stats.totalFiles} files generated`);
    return result;
  } catch (error) {
    console.error("[MultiFileGenerator] Generation failed:", error.message);
    throw error;
  }
}

/**
 * Generate a single phase only (for retry or partial generation)
 * @param {string} phase - The phase to generate (backend, frontend, database, infrastructure, documentation)
 * @param {Object} config - Project configuration
 * @returns {Promise<{files: Object<string, string>, stats: Object}>}
 */
export async function generateSinglePhase(phase, config) {
  await initializeGenerator();

  console.log(`[MultiFileGenerator] Generating single phase: ${phase}`);

  try {
    const result = await multiFileGen.generateSinglePhase(phase, config);
    console.log(`[MultiFileGenerator] Phase ${phase}: ${result.stats.filesGenerated} files generated`);
    return result;
  } catch (error) {
    console.error(`[MultiFileGenerator] Phase ${phase} failed:`, error.message);
    throw error;
  }
}

/**
 * Generate specific components only (incremental generation)
 * @param {Object} config - What to generate
 * @returns {Promise<{files: Object<string, string>}>}
 */
export async function generateComponents(config) {
  await initializeGenerator();

  try {
    const result = await multiFileGen.generateComponents(config);
    return result;
  } catch (error) {
    console.error("[MultiFileGenerator] Component generation failed:", error.message);
    throw error;
  }
}

/**
 * Get critical files for a phase (for validation)
 */
export async function getCriticalFiles() {
  await initializeGenerator();
  return multiFileGen.CRITICAL_FILES;
}

/**
 * Parse multi-file response (utility function)
 */
export async function parseMultiFileResponse(response) {
  await initializeGenerator();
  return multiFileGen.parseMultiFileResponse(response);
}

export default {
  generateMultipleFiles,
  generateSinglePhase,
  generateComponents,
  getCriticalFiles,
  parseMultiFileResponse,
  GENERATION_PHASES,
};
