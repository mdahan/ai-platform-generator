# AI Engine - Code Generator & Verifier

A proof-of-concept code generator powered by Claude AI (Anthropic). This module takes natural language prompts, generates production-ready code, and **verifies the code actually works** by executing it and running tests.

## What This Does

The AI Engine uses Claude's API to generate code based on natural language descriptions. It:

1. **Generates Code** - Accepts a text prompt and generates code via Claude API
2. **Detects Dependencies** - Scans generated code for required npm packages
3. **Creates Test Environment** - Sets up an isolated environment with dependencies
4. **Executes Code** - Runs the generated code to verify it starts correctly
5. **Runs Tests** - Makes HTTP requests to verify endpoints work as expected
6. **Reports Results** - Provides detailed pass/fail report with colored output

## Setup

### 1. Install Dependencies

```bash
cd ai-engine
npm install
```

### 2. Configure Environment

Copy the example environment file and add your API key:

```bash
cp .env.example .env
```

Edit `.env` and add your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

Get your API key from: https://console.anthropic.com/

## Usage

### Running the Full Integration Test

```bash
npm test
```

This will:
1. **Phase 1: Code Generation**
   - Send a test prompt to generate an Express API endpoint
   - Save the generated code to `generated/test-api.js`
   - Display a preview of the generated code

2. **Phase 2: Code Execution & Testing**
   - Detect required dependencies (e.g., express)
   - Create a temporary test environment
   - Install dependencies automatically
   - Start the generated server
   - Run 4 test cases against the API:
     - Valid loan application (expects 201)
     - Missing required field (expects 400)
     - Invalid amount (expects 400)
     - Missing all fields (expects 400)
   - Clean up test environment

3. **Final Report**
   - Summary of code generation status
   - Summary of execution status
   - Detailed test results (pass/fail for each test case)

### Using Individual Modules

#### Generator

```javascript
import { generateCode } from "./src/generator.js";

const code = await generateCode("Create a function that validates email addresses");
console.log(code);
```

#### Executor

```javascript
import { executeCode } from "./src/executor.js";

const result = await executeCode("./generated/my-api.js", {
  testCases: [
    {
      name: "Test endpoint",
      method: "GET",
      endpoint: "/api/health",
      expected: { status: 200 }
    }
  ],
  port: 3456,
  cleanup: true
});

console.log(result.success); // true/false
console.log(result.tests);   // detailed test results
```

#### Utilities

```javascript
import {
  detectDependencies,
  installDependencies,
  createTestEnvironment,
  makeHttpRequest
} from "./src/utils.js";

// Detect what packages code needs
const deps = detectDependencies(code);
// ['express', 'cors', 'body-parser']

// Install them in a directory
await installDependencies(deps, './test-env');

// Make HTTP requests
const response = await makeHttpRequest('POST', 'http://localhost:3000/api/users', {
  name: 'John'
});
```

## What to Expect

When you run the test, you'll see colored output:

| Color | Meaning |
|-------|---------|
| **Cyan** | Section headers |
| **Magenta** | Phase headers |
| **Blue** | Step starting |
| **Yellow** | In progress / warnings |
| **Green** | Success |
| **Red** | Errors / failures |
| **Gray** | Details / previews |

### Successful Run Example

```
════════════════════════════════════════════════════════════
   AI Engine - Full Integration Test
════════════════════════════════════════════════════════════

📋 PHASE 1: CODE GENERATION

🚀 Starting code generation...
📡 Sending request to Claude API...
✅ Response received from Claude API
✅ Code generated and saved

📋 PHASE 2: CODE EXECUTION & TESTING

Step 1: Reading generated code...
   ✅ Read 1523 characters
Step 2: Detecting dependencies...
   ✅ Found 1 dependencies: express
Step 3: Creating test environment...
Step 4: Installing dependencies...
   ✅ Dependencies installed successfully
Step 5: Starting test server...
   ✅ Test server running on port 3456
Step 6: Running 4 test case(s)...
   ✅ Valid loan application - PASSED
   ✅ Missing required field - PASSED
   ✅ Invalid amount - PASSED
   ✅ Missing all fields - PASSED

📋 FINAL REPORT

📝 Code Generation:
   ✅ SUCCESS

⚡ Code Execution:
   ✅ SUCCESS

🧪 Test Results:
   ✅ 4/4 tests passed

🎉 ALL PHASES COMPLETED SUCCESSFULLY!
   The generated code works correctly.
```

## Project Structure

```
ai-engine/
├── src/
│   ├── generator.js    # Claude API integration for code generation
│   ├── executor.js     # Code execution and testing pipeline
│   └── utils.js        # Helper functions (dependency detection, HTTP, etc.)
├── generated/          # Output directory for generated code
├── test-environments/  # Temporary test environments (auto-cleaned)
├── test.js             # Full integration test
├── package.json        # Dependencies and scripts
├── .env.example        # Environment template
└── README.md           # This file
```

## Test Case Format

Test cases are defined as objects with the following structure:

```javascript
{
  name: "Human-readable test name",
  method: "POST",              // HTTP method
  endpoint: "/api/endpoint",   // API endpoint to test
  body: { key: "value" },      // Request body (for POST/PUT)
  expected: {
    status: 201,               // Expected HTTP status code
    hasFields: ["id", "name"], // Fields that must exist in response
    matches: { key: "value" }  // Exact values to match in response
  }
}
```

## Error Handling

The engine handles common errors:

- **Missing API key** - Prompts you to create a .env file
- **Invalid API key** - 401 authentication error
- **Rate limiting** - 429 too many requests
- **Server errors** - 500 internal server errors
- **Dependency installation failures** - Reports which packages failed
- **Server startup failures** - Shows error output from the generated code
- **Test failures** - Detailed report of what was expected vs received

## License

MIT
