import { readFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import {
  detectDependencies,
  installDependencies,
  createTestEnvironment,
  cleanupTestEnvironment,
  createTestServer,
  makeHttpRequest,
} from "./utils.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_ENV_BASE = join(__dirname, "..", "test-environments");

/**
 * Result of executing generated code
 * @typedef {Object} ExecutionResult
 * @property {boolean} success - Whether the execution was successful
 * @property {string[]} steps - List of steps that were executed
 * @property {Object[]} tests - Results of any tests that were run
 * @property {string} [error] - Error message if execution failed
 * @property {number} duration - Total execution time in ms
 */

/**
 * Executes generated code to verify it works
 * @param {string} codeFilePath - Path to the generated code file
 * @param {Object} options - Execution options
 * @param {Object[]} options.testCases - Array of test cases to run
 * @param {number} options.port - Port to run test server on
 * @param {boolean} options.cleanup - Whether to cleanup test environment after
 * @returns {Promise<ExecutionResult>}
 */
export async function executeCode(codeFilePath, options = {}) {
  const {
    testCases = [],
    port = 3456,
    cleanup = true,
  } = options;

  const startTime = Date.now();
  const steps = [];
  const testResults = [];
  let testDir = null;
  let serverProcess = null;

  console.log(chalk.cyan("\n" + "═".repeat(60)));
  console.log(chalk.cyan.bold("   Code Executor - Verification Pipeline"));
  console.log(chalk.cyan("═".repeat(60) + "\n"));

  try {
    // Step 1: Read the generated code
    console.log(chalk.blue("Step 1: Reading generated code..."));
    const code = await readFile(codeFilePath, "utf-8");
    steps.push({ step: "Read code", success: true });
    console.log(chalk.green(`   ✅ Read ${code.length} characters`));

    // Step 2: Detect dependencies
    console.log(chalk.blue("\nStep 2: Detecting dependencies..."));
    const dependencies = detectDependencies(code);
    steps.push({ step: "Detect dependencies", success: true, dependencies });
    console.log(chalk.green(`   ✅ Found ${dependencies.length} dependencies: ${dependencies.join(", ") || "none"}`));

    // Step 3: Create test environment
    console.log(chalk.blue("\nStep 3: Creating test environment..."));
    testDir = await createTestEnvironment(TEST_ENV_BASE);
    steps.push({ step: "Create test environment", success: true, path: testDir });

    // Step 4: Install dependencies
    console.log(chalk.blue("\nStep 4: Installing dependencies..."));
    const installResult = await installDependencies(dependencies, testDir);
    if (!installResult.success) {
      throw new Error(`Failed to install dependencies: ${installResult.error}`);
    }
    steps.push({ step: "Install dependencies", success: true });

    // Step 5: Start the test server
    console.log(chalk.blue("\nStep 5: Starting test server..."));
    const serverResult = await createTestServer(code, testDir, port);
    if (!serverResult.success) {
      throw new Error(`Failed to start server: ${serverResult.error}`);
    }
    serverProcess = serverResult.server;
    steps.push({ step: "Start server", success: true, port: serverResult.port });

    // Give the server a moment to fully initialize
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Step 6: Run test cases
    if (testCases.length > 0) {
      console.log(chalk.blue(`\nStep 6: Running ${testCases.length} test case(s)...`));

      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        console.log(chalk.yellow(`\n   Test ${i + 1}: ${testCase.name}`));

        const url = `http://localhost:${port}${testCase.endpoint}`;
        console.log(chalk.gray(`   ${testCase.method} ${url}`));
        if (testCase.body) {
          console.log(chalk.gray(`   Body: ${JSON.stringify(testCase.body)}`));
        }

        const response = await makeHttpRequest(testCase.method, url, testCase.body);

        const testResult = {
          name: testCase.name,
          method: testCase.method,
          endpoint: testCase.endpoint,
          body: testCase.body,
          response: {
            status: response.status,
            data: response.data,
          },
          expected: testCase.expected,
          passed: false,
        };

        // Validate response
        if (response.success) {
          let passed = true;
          const failures = [];

          // Check status code if expected
          if (testCase.expected.status && response.status !== testCase.expected.status) {
            passed = false;
            failures.push(`Expected status ${testCase.expected.status}, got ${response.status}`);
          }

          // Check if response has required fields (check top level and common nested objects)
          if (testCase.expected.hasFields && response.data) {
            for (const field of testCase.expected.hasFields) {
              // Check top level first
              let found = field in response.data;

              // If not found at top level, check common nested objects (data, loan, result, etc.)
              if (!found) {
                const nestedKeys = ["data", "loan", "result", "payload", "body"];
                for (const nestedKey of nestedKeys) {
                  if (response.data[nestedKey] && typeof response.data[nestedKey] === "object") {
                    if (field in response.data[nestedKey]) {
                      found = true;
                      break;
                    }
                  }
                }
              }

              if (!found) {
                passed = false;
                failures.push(`Missing expected field: ${field}`);
              }
            }
          }

          // Check if response matches expected values
          if (testCase.expected.matches && response.data) {
            for (const [key, value] of Object.entries(testCase.expected.matches)) {
              if (response.data[key] !== value) {
                passed = false;
                failures.push(`Expected ${key}=${value}, got ${response.data[key]}`);
              }
            }
          }

          testResult.passed = passed;
          testResult.failures = failures;

          if (passed) {
            console.log(chalk.green(`   ✅ PASSED`));
            console.log(chalk.gray(`   Response: ${JSON.stringify(response.data)}`));
          } else {
            console.log(chalk.red(`   ❌ FAILED`));
            failures.forEach((f) => console.log(chalk.red(`      - ${f}`)));
          }
        } else {
          testResult.passed = false;
          testResult.error = response.error;
          console.log(chalk.red(`   ❌ FAILED: ${response.error}`));
        }

        testResults.push(testResult);
      }

      steps.push({
        step: "Run tests",
        success: testResults.every((t) => t.passed),
        passed: testResults.filter((t) => t.passed).length,
        total: testResults.length,
      });
    }

    // Summary
    const duration = Date.now() - startTime;
    const allTestsPassed = testResults.every((t) => t.passed);

    console.log(chalk.cyan("\n" + "═".repeat(60)));
    if (allTestsPassed && testResults.length > 0) {
      console.log(chalk.green.bold("   ✅ ALL TESTS PASSED"));
    } else if (testResults.length === 0) {
      console.log(chalk.yellow.bold("   ⚠️  NO TESTS RUN (server started successfully)"));
    } else {
      console.log(chalk.red.bold("   ❌ SOME TESTS FAILED"));
    }
    console.log(chalk.cyan("═".repeat(60)));
    console.log(chalk.gray(`   Duration: ${duration}ms`));

    return {
      success: allTestsPassed || testResults.length === 0,
      steps,
      tests: testResults,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(chalk.red(`\n❌ Execution failed: ${error.message}`));

    return {
      success: false,
      steps,
      tests: testResults,
      error: error.message,
      duration,
    };
  } finally {
    // Cleanup
    if (serverProcess) {
      console.log(chalk.gray("\n   Stopping test server..."));
      serverProcess.kill("SIGTERM");
      // Give it a moment to shut down gracefully
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (cleanup && testDir) {
      await cleanupTestEnvironment(testDir);
    }
  }
}

export default { executeCode };
