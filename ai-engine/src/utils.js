import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import chalk from "chalk";

const execAsync = promisify(exec);

/**
 * Common Node.js built-in modules that don't need to be installed
 */
const BUILTIN_MODULES = new Set([
  "fs",
  "path",
  "http",
  "https",
  "url",
  "util",
  "os",
  "crypto",
  "events",
  "stream",
  "buffer",
  "querystring",
  "child_process",
  "cluster",
  "dgram",
  "dns",
  "net",
  "readline",
  "tls",
  "tty",
  "zlib",
  "assert",
  "console",
  "process",
  "timers",
  "vm",
]);

/**
 * Detects dependencies from require() and import statements in code
 * @param {string} code - The source code to analyze
 * @returns {string[]} - Array of package names to install
 */
export function detectDependencies(code) {
  const dependencies = new Set();

  // Match require('package') or require("package")
  const requireRegex = /require\s*\(\s*['"]([^'"./][^'"]*)['"]\s*\)/g;
  let match;
  while ((match = requireRegex.exec(code)) !== null) {
    const pkg = match[1].split("/")[0]; // Handle scoped packages and subpaths
    if (!BUILTIN_MODULES.has(pkg)) {
      dependencies.add(pkg);
    }
  }

  // Match import ... from 'package' or import ... from "package"
  const importRegex = /import\s+.*?\s+from\s+['"]([^'"./][^'"]*)['"]/g;
  while ((match = importRegex.exec(code)) !== null) {
    const pkg = match[1].split("/")[0];
    if (!BUILTIN_MODULES.has(pkg)) {
      dependencies.add(pkg);
    }
  }

  // Match import 'package' (side-effect imports)
  const sideEffectImportRegex = /import\s+['"]([^'"./][^'"]*)['"]/g;
  while ((match = sideEffectImportRegex.exec(code)) !== null) {
    const pkg = match[1].split("/")[0];
    if (!BUILTIN_MODULES.has(pkg)) {
      dependencies.add(pkg);
    }
  }

  return Array.from(dependencies);
}

/**
 * Installs npm dependencies in a specified directory
 * @param {string[]} deps - Array of package names to install
 * @param {string} targetDir - Directory to install packages in
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function installDependencies(deps, targetDir) {
  if (deps.length === 0) {
    console.log(chalk.gray("   No external dependencies to install"));
    return { success: true };
  }

  console.log(chalk.yellow(`📦 Installing dependencies: ${deps.join(", ")}`));

  try {
    // Create package.json - use CommonJS (no type: module)
    const packageJson = {
      name: "test-environment",
      version: "1.0.0",
      dependencies: {},
    };

    await writeFile(
      join(targetDir, "package.json"),
      JSON.stringify(packageJson, null, 2)
    );

    // Install dependencies
    const depsString = deps.join(" ");
    const { stderr } = await execAsync(`npm install ${depsString}`, {
      cwd: targetDir,
      timeout: 60000, // 60 second timeout
    });

    if (stderr && !stderr.includes("npm warn") && !stderr.includes("npm WARN")) {
      console.log(chalk.yellow(`   Warning: ${stderr}`));
    }

    console.log(chalk.green(`✅ Dependencies installed successfully`));
    return { success: true };
  } catch (error) {
    console.log(chalk.red(`❌ Failed to install dependencies: ${error.message}`));
    return { success: false, error: error.message };
  }
}

/**
 * Creates a temporary test environment directory
 * @param {string} baseDir - Base directory for test environments
 * @returns {Promise<string>} - Path to the created test environment
 */
export async function createTestEnvironment(baseDir) {
  const testId = `test-${Date.now()}`;
  const testDir = join(baseDir, testId);

  await mkdir(testDir, { recursive: true });
  console.log(chalk.gray(`   Created test environment: ${testDir}`));

  return testDir;
}

/**
 * Cleans up a test environment directory
 * @param {string} testDir - Path to the test environment to clean up
 */
export async function cleanupTestEnvironment(testDir) {
  try {
    await rm(testDir, { recursive: true, force: true });
    console.log(chalk.gray(`   Cleaned up test environment`));
  } catch (error) {
    console.log(chalk.yellow(`   Warning: Could not clean up ${testDir}`));
  }
}

/**
 * Creates and starts an Express server with the generated code
 * @param {string} code - The generated Express code
 * @param {string} testDir - Directory to run the server in
 * @param {number} port - Port to run the server on
 * @returns {Promise<{server: ChildProcess, port: number, success: boolean, error?: string}>}
 */
export async function createTestServer(code, testDir, port = 3456) {
  const { spawn } = await import("child_process");

  // Strip markdown code blocks if present (Claude sometimes adds them)
  let cleanCode = code.trim();
  if (cleanCode.startsWith("```")) {
    // Remove opening code fence (```javascript, ```js, etc.)
    cleanCode = cleanCode.replace(/^```[\w]*\n?/, "");
    // Remove closing code fence
    cleanCode = cleanCode.replace(/\n?```$/, "");
  }

  // Wrap the code to start the server (CommonJS compatible)
  const wrappedCode = `
${cleanCode}

// Auto-start server for testing
var TEST_PORT = process.env.TEST_PORT || ${port};

// Find the Express app - it might be named 'app' or exported via module.exports
var expressApp = typeof app !== 'undefined' ? app : null;
if (!expressApp && typeof module !== 'undefined' && module.exports) {
  expressApp = module.exports.app || module.exports;
}

if (expressApp && typeof expressApp.listen === 'function') {
  var server = expressApp.listen(TEST_PORT, function() {
    console.log('TEST_SERVER_READY:' + TEST_PORT);
  });

  // Handle graceful shutdown
  process.on('SIGTERM', function() {
    server.close(function() {
      process.exit(0);
    });
  });
} else {
  console.error('TEST_SERVER_ERROR: No Express app found. Make sure you define an "app" variable.');
  process.exit(1);
}
`;

  const serverFile = join(testDir, "server.js");
  await writeFile(serverFile, wrappedCode);

  return new Promise((resolve) => {
    console.log(chalk.yellow(`🚀 Starting test server on port ${port}...`));

    const serverProcess = spawn("node", ["server.js"], {
      cwd: testDir,
      env: { ...process.env, TEST_PORT: port.toString() },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let started = false;
    let errorOutput = "";

    const timeout = setTimeout(() => {
      if (!started) {
        serverProcess.kill();
        resolve({
          server: null,
          port,
          success: false,
          error: `Server failed to start within 10 seconds. Error: ${errorOutput}`,
        });
      }
    }, 10000);

    serverProcess.stdout.on("data", (data) => {
      const output = data.toString();
      if (output.includes("TEST_SERVER_READY")) {
        started = true;
        clearTimeout(timeout);
        console.log(chalk.green(`✅ Test server running on port ${port}`));
        resolve({ server: serverProcess, port, success: true });
      }
    });

    serverProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    serverProcess.on("error", (error) => {
      clearTimeout(timeout);
      resolve({
        server: null,
        port,
        success: false,
        error: error.message,
      });
    });

    serverProcess.on("exit", (code) => {
      if (!started) {
        clearTimeout(timeout);
        resolve({
          server: null,
          port,
          success: false,
          error: `Server exited with code ${code}. Error: ${errorOutput}`,
        });
      }
    });
  });
}

/**
 * Makes an HTTP request to test an endpoint
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {string} url - Full URL to request
 * @param {object} body - Request body (for POST, PUT, etc.)
 * @returns {Promise<{status: number, data: any, error?: string}>}
 */
export async function makeHttpRequest(method, url, body = null) {
  try {
    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json().catch(() => null);

    return {
      status: response.status,
      data,
      success: true,
    };
  } catch (error) {
    return {
      status: 0,
      data: null,
      success: false,
      error: error.message,
    };
  }
}

export default {
  detectDependencies,
  installDependencies,
  createTestEnvironment,
  cleanupTestEnvironment,
  createTestServer,
  makeHttpRequest,
};
