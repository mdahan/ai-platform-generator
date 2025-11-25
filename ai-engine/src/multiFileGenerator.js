import Anthropic from "@anthropic-ai/sdk";
import chalk from "chalk";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

// Load environment variables
dotenv.config();

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================
// LOAD TEMPLATES
// ============================================
const templatesDir = path.join(__dirname, "..", "templates");

/**
 * Load a template file and replace placeholders
 */
function loadTemplate(templateName, variables = {}) {
  const templatePath = path.join(templatesDir, templateName);
  if (!fs.existsSync(templatePath)) {
    console.log(chalk.yellow(`⚠ Template not found: ${templateName}`));
    return null;
  }

  let content = fs.readFileSync(templatePath, "utf-8");

  // Replace all {{VARIABLE}} placeholders
  for (const [key, value] of Object.entries(variables)) {
    content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }

  return content;
}

/**
 * Load the file structure map
 */
function loadFileStructure() {
  try {
    const structurePath = path.join(templatesDir, "file-structure.js");
    if (fs.existsSync(structurePath)) {
      // Use dynamic import for ES module
      return import(structurePath);
    }
  } catch (error) {
    console.log(chalk.yellow(`⚠ Could not load file structure: ${error.message}`));
  }
  return null;
}

/**
 * Generation phases for batch processing
 * Each phase generates a subset of files to avoid token limits
 */
const GENERATION_PHASES = {
  BACKEND: "backend",
  FRONTEND: "frontend",
  DATABASE: "database",
  INFRASTRUCTURE: "infrastructure",
  DOCUMENTATION: "documentation",
};

/**
 * Critical files that MUST exist for each phase
 * If missing, the phase will be retried
 */
const CRITICAL_FILES = {
  [GENERATION_PHASES.BACKEND]: [
    "backend/src/server.js",
    "backend/package.json",
    "backend/src/config/index.js",
    "backend/src/routes/index.js",
    "backend/src/middleware/auth.js",
    "backend/src/middleware/errorHandler.js",
  ],
  [GENERATION_PHASES.FRONTEND]: [
    "frontend/app/layout.tsx",
    "frontend/package.json",
    "frontend/app/page.tsx",
    "frontend/tailwind.config.js",
  ],
  [GENERATION_PHASES.DATABASE]: ["database/schema.sql"],
  [GENERATION_PHASES.INFRASTRUCTURE]: [],
  [GENERATION_PHASES.DOCUMENTATION]: [],
};

/**
 * Required packages for backend (to validate package.json)
 */
const REQUIRED_BACKEND_PACKAGES = {
  dependencies: {
    bcryptjs: "^2.4.3",
    cors: "^2.8.5",
    dotenv: "^16.3.1",
    express: "^4.18.2",
    "express-rate-limit": "^7.1.5",
    "express-validator": "^7.0.1",
    helmet: "^7.1.0",
    jsonwebtoken: "^9.0.2",
    pg: "^8.11.3",
    sequelize: "^6.35.2",
    uuid: "^9.0.1",
    winston: "^3.11.0",
  },
  devDependencies: {
    jest: "^29.7.0",
    supertest: "^6.3.3",
  },
};

/**
 * Required packages for frontend (to validate package.json)
 */
const REQUIRED_FRONTEND_PACKAGES = {
  dependencies: {
    next: "14.0.4",
    react: "^18.2.0",
    "react-dom": "^18.2.0",
    axios: "^1.6.2",
    tailwindcss: "^3.4.0",
    autoprefixer: "^10.4.16",
    postcss: "^8.4.32",
  },
  devDependencies: {
    "@types/node": "^20.10.5",
    "@types/react": "^18.2.45",
    "@types/react-dom": "^18.2.18",
    typescript: "^5.3.3",
    eslint: "^8.56.0",
    "eslint-config-next": "14.0.4",
  },
};

/**
 * System prompt for multi-file batch generation with STRICT naming rules
 */
const BATCH_SYSTEM_PROMPT = `You are an expert full-stack developer generating production-ready code.

OUTPUT FORMAT:
You MUST output code in the following structured format. Each file should be enclosed in file markers:

===FILE: path/to/file.js===
// file content here
===END FILE===

CRITICAL NAMING AND IMPORT RULES:
1. ALWAYS use "bcryptjs" for password hashing (NOT "bcrypt")
2. All imports MUST match the actual file paths exactly
3. Backend structure MUST be:
   - backend/src/server.js (main entry)
   - backend/src/config/index.js (configuration)
   - backend/src/routes/*.js (route files)
   - backend/src/controllers/*Controller.js (controllers)
   - backend/src/services/*Service.js (services)
   - backend/src/models/*.js (Sequelize models)
   - backend/src/middleware/*.js (middleware)
   - backend/src/utils/*.js (utilities)

4. IMPORT PATH RULES (relative from file location):
   - From routes: controllers use '../controllers/xController'
   - From routes: middleware use '../middleware/x'
   - From controllers: services use '../services/xService'
   - From controllers: models use '../models/X'
   - From services: models use '../models/X'
   - From any: config use '../config' or '../../config' based on depth

5. Frontend structure MUST be:
   - frontend/app/layout.tsx (root layout - REQUIRED)
   - frontend/app/page.tsx (home page)
   - frontend/app/*/page.tsx (other pages)
   - frontend/components/**/*.tsx (components)
   - frontend/lib/*.ts (utilities)
   - frontend/hooks/*.ts (custom hooks)

6. PACKAGE.JSON MUST INCLUDE:
   Backend: bcryptjs, cors, dotenv, express, express-rate-limit, express-validator, helmet, jsonwebtoken, pg, sequelize, uuid, winston
   Frontend: next, react, react-dom, axios, tailwindcss, autoprefixer, postcss, typescript

CRITICAL FILE MARKERS:
- Use the exact markers ===FILE: and ===END FILE=== with the path
- Each file must be COMPLETE and runnable - no placeholders
- Generate ALL files requested in the prompt
- Do NOT include any text before or after the file blocks
- Start with the most critical files first (e.g., server.js for backend)
- DO NOT generate .env or .env.local files - these will be created automatically with proper port assignments

CODE QUALITY:
- Proper error handling with try-catch blocks
- Input validation on all endpoints using express-validator
- JSDoc comments for functions
- CRITICAL: Every require() or import statement MUST have a corresponding file generated
- If a file imports './emailService', you MUST generate emailService.js
- Do NOT reference files that don't exist - generate ALL files that are imported
- Consistent naming (camelCase for JS, PascalCase for React components)
- Security best practices (helmet, rate limiting, sanitized inputs)
- Environment variables for configuration`;

/**
 * Build prompt for backend phase
 */
function buildBackendPrompt(config) {
  const { name, description, features = [], multiTenant, authentication } = config;

  return `Generate COMPLETE backend files for: ${name}
Description: ${description}

CRITICAL: Follow these EXACT file paths and naming conventions!

GENERATE THESE FILES IN ORDER (most critical first):

1. backend/package.json - MUST include ALL these dependencies:
   {
     "dependencies": {
       "bcryptjs": "^2.4.3",
       "cors": "^2.8.5",
       "dotenv": "^16.3.1",
       "express": "^4.18.2",
       "express-rate-limit": "^7.1.5",
       "express-validator": "^7.0.1",
       "helmet": "^7.1.0",
       "jsonwebtoken": "^9.0.2",
       "pg": "^8.11.3",
       "sequelize": "^6.35.2",
       "uuid": "^9.0.1",
       "winston": "^3.11.0"
     }
   }

2. backend/src/server.js - Express entry point with:
   - const express = require('express');
   - const helmet = require('helmet');
   - const cors = require('cors');
   - const rateLimit = require('express-rate-limit');
   - const config = require('./config');
   - const routes = require('./routes');
   - const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
   - Express setup with all middleware
   - Routes mounted at /api
   - Error handling middleware
   - Graceful shutdown
   - Server listening on config.server.port

3. backend/src/config/index.js - Configuration loading from .env:
   - require('dotenv').config() at top
   - module.exports = { server: {port, env}, database: {...}, jwt: {...} }

4. backend/src/middleware/errorHandler.js - Error handling:
   - exports.errorHandler = (err, req, res, next) => {...}
   - exports.notFoundHandler = (req, res, next) => {...}
   - exports.asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

5. backend/src/middleware/auth.js - JWT auth middleware:
   - const jwt = require('jsonwebtoken');
   - const config = require('../config');
   - exports.authenticate = (req, res, next) => {...}
   - exports.authorize = (...roles) => (req, res, next) => {...}

6. backend/src/routes/index.js - Route aggregator:
   - const authRoutes = require('./auth');
   - router.use('/auth', authRoutes);

7. backend/src/routes/auth.js - Auth routes:
   - const { body } = require('express-validator');
   - const authController = require('../controllers/authController');

8. backend/src/controllers/authController.js:
   - const authService = require('../services/authService');
   - exports.register, exports.login, exports.me

9. backend/src/services/authService.js:
   - const bcrypt = require('bcryptjs'); // NOTE: bcryptjs NOT bcrypt!
   - const jwt = require('jsonwebtoken');
   - const User = require('../models/User');
   - const config = require('../config');

10. backend/src/models/index.js - Sequelize setup:
    - const { Sequelize } = require('sequelize');
    - const config = require('../config');

11. backend/src/models/User.js - User model:
    - const { DataTypes } = require('sequelize');

12. backend/src/utils/logger.js - Winston logger

${multiTenant ? "13. backend/src/middleware/tenantContext.js - Multi-tenant isolation" : ""}

${features.map((f, i) => {
    const featureLower = f.toLowerCase().replace(/\s+/g, "");
    return `
Feature: ${f}
- backend/src/routes/${featureLower}.js
- backend/src/controllers/${featureLower}Controller.js
- backend/src/services/${featureLower}Service.js
- backend/src/models/${f.replace(/\s+/g, "")}.js`;
  }).join("\n")}

Features: ${features.join(", ")}
${multiTenant ? "Multi-tenant: Yes - use organization_id on all models" : ""}
Authentication: ${authentication || "JWT"}

CRITICAL REMINDERS:
- Use 'bcryptjs' everywhere (NOT 'bcrypt')
- All imports must match actual file paths
- Start with package.json and server.js!`;
}

/**
 * Build prompt for frontend phase
 */
function buildFrontendPrompt(config) {
  const { name, description, features = [] } = config;

  return `Generate COMPLETE Next.js 14 frontend files for: ${name}
Description: ${description}

CRITICAL: Follow these EXACT file paths and naming conventions!

GENERATE THESE FILES IN ORDER:

1. frontend/package.json - MUST include ALL these dependencies:
   {
     "dependencies": {
       "next": "14.0.4",
       "react": "^18.2.0",
       "react-dom": "^18.2.0",
       "axios": "^1.6.2",
       "tailwindcss": "^3.4.0",
       "autoprefixer": "^10.4.16",
       "postcss": "^8.4.32"
     },
     "devDependencies": {
       "@types/node": "^20.10.5",
       "@types/react": "^18.2.45",
       "@types/react-dom": "^18.2.18",
       "typescript": "^5.3.3",
       "eslint": "^8.56.0",
       "eslint-config-next": "14.0.4"
     }
   }

2. frontend/app/layout.tsx - Root layout (REQUIRED!):
   - import type { Metadata } from 'next'
   - import { Inter } from 'next/font/google'
   - import './globals.css'
   - export const metadata: Metadata = {...}
   - export default function RootLayout({ children })

3. frontend/app/globals.css - Global styles:
   - @tailwind base;
   - @tailwind components;
   - @tailwind utilities;

4. frontend/app/page.tsx - Landing page with hero section

5. frontend/tailwind.config.js - Tailwind configuration

6. frontend/next.config.js - Next.js configuration

7. frontend/tsconfig.json - TypeScript configuration

8. frontend/postcss.config.js - PostCSS configuration

9. frontend/app/login/page.tsx - Login page with form

10. frontend/app/register/page.tsx - Registration page

11. frontend/app/dashboard/page.tsx - Main dashboard

${features.map((f, i) => `${12 + i}. frontend/app/${f.toLowerCase().replace(/\s+/g, "-")}/page.tsx`).join("\n")}

Components:
- frontend/components/ui/Button.tsx
- frontend/components/ui/Input.tsx
- frontend/components/ui/Card.tsx
- frontend/components/layout/Navbar.tsx
- frontend/components/layout/Sidebar.tsx

Lib:
- frontend/lib/api.ts - API client with axios
- frontend/lib/auth.ts - Auth utilities

Use TypeScript and Tailwind CSS. Make components interactive and styled.
IMPORTANT: Generate layout.tsx FIRST - it is REQUIRED for Next.js!`;
}

/**
 * Build prompt for database phase
 */
function buildDatabasePrompt(config) {
  const { name, features = [], multiTenant } = config;

  return `Generate COMPLETE PostgreSQL database files for: ${name}

GENERATE THESE FILES:

1. database/schema.sql - Complete database schema with:
   - All tables with proper data types
   - Primary keys (UUID)
   - Foreign key relationships
   - Indexes on frequently queried columns
   - Created_at and updated_at timestamps
   ${multiTenant ? "- organization_id on all tenant tables" : ""}
   ${multiTenant ? "- Row-Level Security (RLS) policies" : ""}

2. database/migrations/001_initial.sql - Initial migration:
   - CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   - CREATE TABLE statements
   - CREATE INDEX statements
   ${multiTenant ? "- RLS policies" : ""}
   - Proper migration header comment

3. database/seeds/001_demo_data.sql - Demo/seed data:
   - Sample users (use bcrypt hashed passwords)
   ${multiTenant ? "- Sample organizations" : ""}
   - Sample data for features

Tables needed:
- users (id, email, password_hash, name, role, ${multiTenant ? "organization_id, " : ""}created_at, updated_at)
${multiTenant ? "- organizations (id, name, slug, plan, created_at, updated_at)" : ""}
${features.map(f => `- ${f.toLowerCase().replace(/\s+/g, "_")} (with appropriate columns)`).join("\n")}

Include proper constraints, NOT NULL where required, DEFAULT values.`;
}

/**
 * Build prompt for infrastructure phase
 */
function buildInfrastructurePrompt(config) {
  const { name } = config;

  return `Generate infrastructure files for: ${name}

GENERATE THESE FILES:

1. docker-compose.yml:
   - backend service (Node.js on port 5000)
   - frontend service (Next.js on port 3000)
   - postgres service (port 5432)
   - Proper networking
   - Volume mounts
   - Environment variables

2. backend/Dockerfile:
   - FROM node:20-alpine
   - WORKDIR /app
   - COPY package*.json ./
   - RUN npm ci --only=production
   - COPY . .
   - USER node
   - EXPOSE 5000
   - CMD ["node", "src/server.js"]

3. frontend/Dockerfile:
   - FROM node:20-alpine
   - WORKDIR /app
   - COPY package*.json ./
   - RUN npm ci
   - COPY . .
   - RUN npm run build
   - USER node
   - EXPOSE 3000
   - CMD ["npm", "start"]

4. .github/workflows/ci.yml:
   - Lint job
   - Test job
   - Build job

5. .gitignore:
   - node_modules
   - .env
   - .next
   - dist
   - *.log`;
}

/**
 * Build prompt for documentation phase
 */
function buildDocumentationPrompt(config) {
  const { name, description, features = [] } = config;

  return `Generate documentation files for: ${name}
Description: ${description}

GENERATE THESE FILES:

1. README.md:
   - Project title and description
   - Features list
   - Tech stack (Node.js, Express, Next.js, PostgreSQL, Sequelize)
   - Prerequisites (Node.js 18+, PostgreSQL 14+)
   - Quick start guide:
     1. Clone the repository
     2. Install dependencies: cd backend && npm install && cd ../frontend && npm install
     3. Set up environment: cp backend/.env.example backend/.env
     4. Start database: docker-compose up -d postgres
     5. Run migrations: npm run migrate
     6. Start development: npm run dev (in both backend and frontend)
   - Project structure
   - API overview
   - Environment variables

2. docs/API.md:
   - Authentication endpoints (POST /api/auth/register, POST /api/auth/login, GET /api/auth/me)
   - All feature endpoints with request/response examples
   - Error codes

Features: ${features.join(", ")}

Make documentation comprehensive and developer-friendly.`;
}

/**
 * Get the prompt builder for a phase
 */
function getPromptBuilder(phase) {
  switch (phase) {
    case GENERATION_PHASES.BACKEND:
      return buildBackendPrompt;
    case GENERATION_PHASES.FRONTEND:
      return buildFrontendPrompt;
    case GENERATION_PHASES.DATABASE:
      return buildDatabasePrompt;
    case GENERATION_PHASES.INFRASTRUCTURE:
      return buildInfrastructurePrompt;
    case GENERATION_PHASES.DOCUMENTATION:
      return buildDocumentationPrompt;
    default:
      throw new Error(`Unknown phase: ${phase}`);
  }
}

/**
 * Parse the multi-file response from Claude
 * @param {string} response - Raw response from Claude
 * @returns {Object<string, string>} - Map of file paths to content
 */
function parseMultiFileResponse(response) {
  const files = {};
  const fileRegex = /===FILE:\s*([^\s=]+)\s*===\n([\s\S]*?)===END FILE===/g;

  let match;
  while ((match = fileRegex.exec(response)) !== null) {
    const filePath = match[1].trim();
    const content = match[2].trim();
    files[filePath] = content;
  }

  return files;
}

/**
 * Validate that critical files exist for a phase
 * @param {string} phase - The generation phase
 * @param {Object} files - Generated files map
 * @returns {{valid: boolean, missing: string[]}}
 */
function validatePhaseFiles(phase, files) {
  const criticalFiles = CRITICAL_FILES[phase] || [];
  const missing = criticalFiles.filter((f) => !files[f]);

  return {
    valid: missing.length === 0,
    missing,
  };
}

// ============================================
// POST-GENERATION VALIDATION AND AUTO-FIX
// ============================================

/**
 * Validate and fix generated files
 * @param {Object} files - Generated files map
 * @param {Object} config - Project configuration
 * @returns {{files: Object, fixes: string[]}}
 */
function validateAndFixFiles(files, config) {
  const fixes = [];
  const fixedFiles = { ...files };

  // 1. Fix package.json - ensure all required dependencies
  if (fixedFiles["backend/package.json"]) {
    const result = fixBackendPackageJson(fixedFiles["backend/package.json"], config);
    fixedFiles["backend/package.json"] = result.content;
    fixes.push(...result.fixes);
  }

  if (fixedFiles["frontend/package.json"]) {
    const result = fixFrontendPackageJson(fixedFiles["frontend/package.json"], config);
    fixedFiles["frontend/package.json"] = result.content;
    fixes.push(...result.fixes);
  }

  // 2. Fix bcrypt -> bcryptjs in all backend files
  for (const [filePath, content] of Object.entries(fixedFiles)) {
    if (filePath.startsWith("backend/") && filePath.endsWith(".js")) {
      if (content.includes("require('bcrypt')") || content.includes('require("bcrypt")')) {
        fixedFiles[filePath] = content
          .replace(/require\(['"]bcrypt['"]\)/g, "require('bcryptjs')");
        fixes.push(`Fixed bcrypt -> bcryptjs in ${filePath}`);
      }
    }
  }

  // 3. Validate import paths
  const importFixes = validateAndFixImports(fixedFiles);
  fixes.push(...importFixes);

  // 4. DO NOT generate .env files here
  // The generation route (backend/src/routes/generate.js) handles .env file creation
  // with proper dynamic port assignment. This prevents hardcoded ports.
  // If .env files are included in AI-generated files, they will be REMOVED here.
  delete fixedFiles["backend/.env"];
  delete fixedFiles["backend/.env.example"];
  delete fixedFiles["frontend/.env.local"];

  return { files: fixedFiles, fixes };
}

/**
 * Fix backend package.json to ensure all required dependencies
 */
function fixBackendPackageJson(content, config) {
  const fixes = [];

  try {
    const pkg = JSON.parse(content);

    // Ensure name and version
    if (!pkg.name) {
      pkg.name = `${config.name.toLowerCase().replace(/\s+/g, "-")}-backend`;
      fixes.push("Added package name");
    }

    if (!pkg.version) {
      pkg.version = "1.0.0";
    }

    // Ensure main entry point
    if (!pkg.main) {
      pkg.main = "src/server.js";
      fixes.push("Added main entry point");
    }

    // Ensure scripts
    if (!pkg.scripts) {
      pkg.scripts = {};
    }
    if (!pkg.scripts.start) {
      pkg.scripts.start = "node src/server.js";
      fixes.push("Added start script");
    }
    if (!pkg.scripts.dev) {
      pkg.scripts.dev = "node --watch src/server.js";
      fixes.push("Added dev script");
    }

    // Ensure all required dependencies
    if (!pkg.dependencies) {
      pkg.dependencies = {};
    }

    for (const [dep, version] of Object.entries(REQUIRED_BACKEND_PACKAGES.dependencies)) {
      if (!pkg.dependencies[dep]) {
        pkg.dependencies[dep] = version;
        fixes.push(`Added missing dependency: ${dep}`);
      }
    }

    // Remove bcrypt if exists and ensure bcryptjs
    if (pkg.dependencies.bcrypt) {
      delete pkg.dependencies.bcrypt;
      fixes.push("Removed bcrypt (using bcryptjs instead)");
    }

    // Ensure dev dependencies
    if (!pkg.devDependencies) {
      pkg.devDependencies = {};
    }

    for (const [dep, version] of Object.entries(REQUIRED_BACKEND_PACKAGES.devDependencies)) {
      if (!pkg.devDependencies[dep]) {
        pkg.devDependencies[dep] = version;
        fixes.push(`Added missing devDependency: ${dep}`);
      }
    }

    return { content: JSON.stringify(pkg, null, 2), fixes };
  } catch (error) {
    console.log(chalk.yellow(`⚠ Could not parse backend package.json: ${error.message}`));
    return { content, fixes };
  }
}

/**
 * Fix frontend package.json to ensure all required dependencies
 */
function fixFrontendPackageJson(content, config) {
  const fixes = [];

  try {
    const pkg = JSON.parse(content);

    // Ensure name
    if (!pkg.name) {
      pkg.name = `${config.name.toLowerCase().replace(/\s+/g, "-")}-frontend`;
      fixes.push("Added package name");
    }

    // Ensure scripts
    if (!pkg.scripts) {
      pkg.scripts = {};
    }
    if (!pkg.scripts.dev) {
      pkg.scripts.dev = "next dev";
      fixes.push("Added dev script");
    }
    if (!pkg.scripts.build) {
      pkg.scripts.build = "next build";
      fixes.push("Added build script");
    }
    if (!pkg.scripts.start) {
      pkg.scripts.start = "next start";
      fixes.push("Added start script");
    }

    // Ensure all required dependencies
    if (!pkg.dependencies) {
      pkg.dependencies = {};
    }

    for (const [dep, version] of Object.entries(REQUIRED_FRONTEND_PACKAGES.dependencies)) {
      if (!pkg.dependencies[dep]) {
        pkg.dependencies[dep] = version;
        fixes.push(`Added missing dependency: ${dep}`);
      }
    }

    // Ensure dev dependencies
    if (!pkg.devDependencies) {
      pkg.devDependencies = {};
    }

    for (const [dep, version] of Object.entries(REQUIRED_FRONTEND_PACKAGES.devDependencies)) {
      if (!pkg.devDependencies[dep]) {
        pkg.devDependencies[dep] = version;
        fixes.push(`Added missing devDependency: ${dep}`);
      }
    }

    return { content: JSON.stringify(pkg, null, 2), fixes };
  } catch (error) {
    console.log(chalk.yellow(`⚠ Could not parse frontend package.json: ${error.message}`));
    return { content, fixes };
  }
}

/**
 * Validate and fix import paths in generated files
 */
function validateAndFixImports(files) {
  const fixes = [];

  // Build a map of what files exist
  const existingFiles = new Set(Object.keys(files));

  // Check each JS file for imports
  for (const [filePath, content] of Object.entries(files)) {
    if (!filePath.endsWith(".js") && !filePath.endsWith(".ts")) continue;

    // Find all require statements
    const requireRegex = /require\(['"](\.\.?\/[^'"]+)['"]\)/g;
    let match;

    while ((match = requireRegex.exec(content)) !== null) {
      const importPath = match[1];
      const resolvedPath = resolveImportPath(filePath, importPath);

      // Check if the imported file exists (with various extensions)
      const possiblePaths = [
        resolvedPath,
        resolvedPath + ".js",
        resolvedPath + "/index.js",
      ];

      const exists = possiblePaths.some((p) => existingFiles.has(p));

      if (!exists) {
        fixes.push(`Warning: ${filePath} imports '${importPath}' but file not found at ${resolvedPath}`);
      }
    }
  }

  return fixes;
}

/**
 * Resolve a relative import path
 */
function resolveImportPath(fromFile, importPath) {
  const fromDir = path.dirname(fromFile);
  const resolved = path.posix.normalize(path.posix.join(fromDir, importPath));
  return resolved;
}

/**
 * Generate backend .env file
 */
function generateBackendEnv(config) {
  const projectName = config.name.toLowerCase().replace(/\s+/g, "_");
  const jwtSecret = crypto.randomBytes(32).toString("hex");
  const refreshSecret = crypto.randomBytes(32).toString("hex");

  return `# Server Configuration
PORT=5000
NODE_ENV=development
HOST=localhost

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=${projectName}_db
DB_USERNAME=postgres
DB_PASSWORD=password

# JWT Configuration
JWT_SECRET=${jwtSecret}
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=${refreshSecret}
JWT_REFRESH_EXPIRES_IN=30d

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
CORS_CREDENTIALS=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=info
`;
}

/**
 * Generate frontend .env.local file
 */
function generateFrontendEnv(config) {
  return `# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# App Configuration
NEXT_PUBLIC_APP_NAME=${config.name}
NEXT_PUBLIC_APP_ENV=development
`;
}

/**
 * Generate files for a single phase
 * @param {string} phase - The generation phase
 * @param {Object} config - Project configuration
 * @param {number} retryCount - Number of retries (default 0)
 * @returns {Promise<{files: Object, stats: Object}>}
 */
async function generatePhase(phase, config, retryCount = 0) {
  const promptBuilder = getPromptBuilder(phase);
  const prompt = promptBuilder(config);

  console.log(chalk.blue(`📦 Generating ${phase} phase...`));

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 16384,
      system: BATCH_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    const files = parseMultiFileResponse(content.text);

    // Validate critical files
    const validation = validatePhaseFiles(phase, files);

    if (!validation.valid && retryCount < 2) {
      console.log(chalk.yellow(`⚠ Missing critical files: ${validation.missing.join(", ")}`));
      console.log(chalk.yellow(`   Retrying ${phase} phase (attempt ${retryCount + 2}/3)...`));
      return generatePhase(phase, config, retryCount + 1);
    }

    if (!validation.valid) {
      console.log(chalk.red(`❌ Failed to generate critical files after 3 attempts`));
    }

    const stats = {
      phase,
      filesGenerated: Object.keys(files).length,
      lines: Object.values(files).reduce((sum, c) => sum + c.split("\n").length, 0),
      inputTokens: message.usage?.input_tokens || 0,
      outputTokens: message.usage?.output_tokens || 0,
    };

    console.log(chalk.green(`✅ ${phase}: ${stats.filesGenerated} files, ${stats.lines} lines`));

    return { files, stats };
  } catch (error) {
    console.log(chalk.red(`❌ ${phase} phase failed: ${error.message}`));
    throw error;
  }
}

/**
 * Progress callback type
 * @callback ProgressCallback
 * @param {Object} progress - Progress information
 */

/**
 * Generate multiple files for a complete application using batch processing
 * Generates in phases to avoid token limits
 *
 * @param {Object} config - Project configuration
 * @param {ProgressCallback} [onProgress] - Optional progress callback
 * @returns {Promise<{files: Object<string, string>, stats: Object, phases: Object[]}>}
 */
export async function generateMultipleFiles(config, onProgress = null) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  console.log(chalk.blue("🚀 Starting batch multi-file generation..."));
  console.log(chalk.gray(`   Project: ${config.name}`));
  console.log(chalk.gray(`   Features: ${config.features?.join(", ") || "None"}`));

  const phases = [
    GENERATION_PHASES.BACKEND,
    GENERATION_PHASES.FRONTEND,
    GENERATION_PHASES.DATABASE,
    GENERATION_PHASES.INFRASTRUCTURE,
    GENERATION_PHASES.DOCUMENTATION,
  ];

  const allFiles = {};
  const phaseStats = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];

    // Report progress
    if (onProgress) {
      onProgress({
        phase,
        status: "generating",
        filesGenerated: Object.keys(allFiles).length,
        phaseIndex: i,
        totalPhases: phases.length,
      });
    }

    try {
      const result = await generatePhase(phase, config);

      // Merge files
      Object.assign(allFiles, result.files);
      phaseStats.push(result.stats);
      totalInputTokens += result.stats.inputTokens;
      totalOutputTokens += result.stats.outputTokens;

      // Report completion
      if (onProgress) {
        onProgress({
          phase,
          status: "completed",
          filesGenerated: Object.keys(allFiles).length,
          phaseIndex: i,
          totalPhases: phases.length,
        });
      }
    } catch (error) {
      console.log(chalk.red(`❌ Phase ${phase} failed: ${error.message}`));

      if (onProgress) {
        onProgress({
          phase,
          status: "failed",
          error: error.message,
          phaseIndex: i,
          totalPhases: phases.length,
        });
      }

      // Continue with other phases even if one fails
      phaseStats.push({
        phase,
        filesGenerated: 0,
        error: error.message,
      });
    }
  }

  // POST-GENERATION VALIDATION AND AUTO-FIX
  console.log(chalk.blue("\n🔧 Running post-generation validation and fixes..."));
  const { files: fixedFiles, fixes } = validateAndFixFiles(allFiles, config);

  if (fixes.length > 0) {
    console.log(chalk.green(`✅ Applied ${fixes.length} fixes:`));
    fixes.forEach((fix) => console.log(chalk.gray(`   - ${fix}`)));
  } else {
    console.log(chalk.green("✅ No fixes needed"));
  }

  const stats = {
    totalFiles: Object.keys(fixedFiles).length,
    totalLines: Object.values(fixedFiles).reduce((sum, c) => sum + c.split("\n").length, 0),
    totalChars: Object.values(fixedFiles).reduce((sum, c) => sum + c.length, 0),
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    phases: phaseStats,
    fixes: fixes,
    filesByFolder: {},
  };

  // Count files by folder
  for (const filePath of Object.keys(fixedFiles)) {
    const folder = filePath.split("/")[0];
    stats.filesByFolder[folder] = (stats.filesByFolder[folder] || 0) + 1;
  }

  console.log(chalk.green(`\n✨ Batch generation complete!`));
  console.log(chalk.green(`   Total: ${stats.totalFiles} files, ${stats.totalLines} lines`));
  console.log(chalk.gray(`   Tokens: ${stats.inputTokens} in, ${stats.outputTokens} out`));

  return { files: fixedFiles, stats, phases: phaseStats };
}

/**
 * Generate files for a single phase only (for retry or partial generation)
 * @param {string} phase - The phase to generate
 * @param {Object} config - Project configuration
 * @returns {Promise<{files: Object, stats: Object}>}
 */
export async function generateSinglePhase(phase, config) {
  if (!Object.values(GENERATION_PHASES).includes(phase)) {
    throw new Error(`Invalid phase: ${phase}. Valid phases: ${Object.values(GENERATION_PHASES).join(", ")}`);
  }

  const result = await generatePhase(phase, config);

  // Apply fixes to the single phase result
  const { files: fixedFiles, fixes } = validateAndFixFiles(result.files, config);

  if (fixes.length > 0) {
    console.log(chalk.green(`✅ Applied ${fixes.length} fixes to ${phase} phase`));
  }

  return { files: fixedFiles, stats: result.stats, fixes };
}

/**
 * Generate files for specific components only (incremental generation)
 * @param {Object} config - What to generate
 * @returns {Promise<{files: Object<string, string>}>}
 */
export async function generateComponents(config) {
  const { components, projectName, description } = config;

  const prompt = `Generate ONLY the following components for the "${projectName}" application:

Components to generate: ${components.join(", ")}

Application context: ${description}

Use the same file format with ===FILE: path=== markers.
Generate complete, working code for just these components.`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    system: BATCH_SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  const files = parseMultiFileResponse(content.text);

  return { files };
}

export {
  GENERATION_PHASES,
  CRITICAL_FILES,
  parseMultiFileResponse,
  validatePhaseFiles,
  validateAndFixFiles,
  generateBackendEnv,
  generateFrontendEnv,
};

export default {
  generateMultipleFiles,
  generateSinglePhase,
  generateComponents,
  parseMultiFileResponse,
  validateAndFixFiles,
  GENERATION_PHASES,
  CRITICAL_FILES,
};
