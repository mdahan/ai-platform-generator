import { mkdir, writeFile, readdir, rm, readFile, stat } from "fs/promises";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, relative } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const GENERATED_APPS_PATH = join(__dirname, "..", "..", "..", "generated-apps");

/**
 * Convert project name to URL-friendly slug
 * @param {string} name - Project name
 * @returns {string} - Slugified name
 */
export function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);
}

/**
 * Ensure the generated-apps directory exists
 */
async function ensureGeneratedAppsDir() {
  if (!existsSync(GENERATED_APPS_PATH)) {
    await mkdir(GENERATED_APPS_PATH, { recursive: true });
  }
}

/**
 * Get the path for a project's generated files
 * @param {string} projectId - Project ID
 * @param {string} [projectSlug] - Optional project slug for readable folder name
 * @returns {string} - Full path to project directory
 */
export function getProjectPath(projectId, projectSlug = null) {
  if (projectSlug) {
    return join(GENERATED_APPS_PATH, `${projectId}-${projectSlug}`);
  }
  // Check if folder with slug exists
  if (existsSync(GENERATED_APPS_PATH)) {
    const folders = require("fs").readdirSync(GENERATED_APPS_PATH);
    const match = folders.find((f) => f.startsWith(projectId));
    if (match) {
      return join(GENERATED_APPS_PATH, match);
    }
  }
  return join(GENERATED_APPS_PATH, projectId);
}

/**
 * Standard project folder structure
 */
const PROJECT_STRUCTURE = [
  "backend/src/routes",
  "backend/src/models",
  "backend/src/middleware",
  "backend/src/services",
  "backend/src/utils",
  "backend/src/config",
  "frontend/app",
  "frontend/components",
  "frontend/lib",
  "database/migrations",
  "database/seeds",
  "infrastructure",
  "tests/unit",
  "tests/integration",
  "docs",
];

/**
 * Create full project directory structure
 * @param {string} projectId - Project ID
 * @param {string} projectName - Project name for folder naming
 * @returns {Promise<{path: string, folders: string[]}>} - Created structure info
 */
export async function createProjectStructure(projectId, projectName) {
  await ensureGeneratedAppsDir();

  const projectSlug = slugify(projectName);
  const projectPath = getProjectPath(projectId, projectSlug);

  // Create main project folder
  if (!existsSync(projectPath)) {
    await mkdir(projectPath, { recursive: true });
  }

  // Create all subfolders
  const createdFolders = [];
  for (const folder of PROJECT_STRUCTURE) {
    const folderPath = join(projectPath, folder);
    if (!existsSync(folderPath)) {
      await mkdir(folderPath, { recursive: true });
      createdFolders.push(folder);
    }
  }

  console.log(`[FileSystem] Created project structure at ${projectPath}`);
  console.log(`[FileSystem] Created ${createdFolders.length} folders`);

  return {
    path: projectPath,
    slug: projectSlug,
    folders: createdFolders,
  };
}

/**
 * Create a directory for a project (legacy support)
 * @param {string} projectId - Project ID
 * @returns {Promise<string>} - Path to created directory
 */
export async function createProjectDirectory(projectId) {
  await ensureGeneratedAppsDir();
  const projectPath = getProjectPath(projectId);

  if (!existsSync(projectPath)) {
    await mkdir(projectPath, { recursive: true });
  }

  return projectPath;
}

/**
 * Save a file to any path within a project
 * Creates intermediate directories as needed
 * @param {string} projectPath - Base project path
 * @param {string} relativePath - Relative path within project (e.g., 'backend/src/server.js')
 * @param {string} content - File content
 * @returns {Promise<string>} - Full path to saved file
 */
export async function saveFile(projectPath, relativePath, content) {
  const filePath = join(projectPath, relativePath);
  const dirPath = dirname(filePath);

  // Ensure directory exists
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }

  await writeFile(filePath, content, "utf-8");
  console.log(`[FileSystem] Saved ${relativePath}`);

  return filePath;
}

/**
 * Save generated code to a project directory (legacy support)
 * @param {string} projectId - Project ID
 * @param {string} filename - Name of the file (e.g., 'server.js')
 * @param {string} content - File content
 * @returns {Promise<string>} - Full path to saved file
 */
export async function saveGeneratedFile(projectId, filename, content) {
  const projectPath = await createProjectDirectory(projectId);
  const filePath = join(projectPath, filename);

  await writeFile(filePath, content, "utf-8");
  console.log(`[FileSystem] Saved ${filename} to ${projectPath}`);

  return filePath;
}

/**
 * Save multiple files to a project
 * @param {string} projectPath - Base project path
 * @param {Object<string, string>} files - Map of relative path to content
 * @returns {Promise<string[]>} - List of saved file paths
 */
export async function saveMultipleFiles(projectPath, files) {
  const savedPaths = [];

  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = await saveFile(projectPath, relativePath, content);
    savedPaths.push(relativePath);
  }

  console.log(`[FileSystem] Saved ${savedPaths.length} files to ${projectPath}`);
  return savedPaths;
}

/**
 * Save project metadata
 * @param {string} projectId - Project ID
 * @param {Object} metadata - Project metadata
 */
export async function saveProjectMetadata(projectId, metadata) {
  const projectPath = getProjectPath(projectId, metadata.slug);
  const metaPath = join(projectPath, "project.json");

  // Ensure directory exists
  if (!existsSync(projectPath)) {
    await mkdir(projectPath, { recursive: true });
  }

  await writeFile(metaPath, JSON.stringify(metadata, null, 2), "utf-8");
  console.log(`[FileSystem] Saved metadata to ${metaPath}`);

  return metaPath;
}

/**
 * Read project metadata
 * @param {string} projectId - Project ID
 * @returns {Promise<Object|null>} - Project metadata or null
 */
export async function readProjectMetadata(projectId) {
  const projectPath = getProjectPath(projectId);
  const metaPath = join(projectPath, "project.json");

  if (!existsSync(metaPath)) {
    return null;
  }

  const content = await readFile(metaPath, "utf-8");
  return JSON.parse(content);
}

/**
 * Recursively list all files in a directory
 * @param {string} dir - Directory path
 * @param {string} basePath - Base path for relative paths
 * @returns {Promise<Object[]>} - Array of file info objects
 */
async function listFilesRecursive(dir, basePath = dir) {
  const files = [];

  if (!existsSync(dir)) {
    return files;
  }

  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relativePath = relative(basePath, fullPath);

    if (entry.isDirectory()) {
      // Skip node_modules and other common excludes
      if (entry.name === "node_modules" || entry.name === ".git") {
        continue;
      }
      const subFiles = await listFilesRecursive(fullPath, basePath);
      files.push(...subFiles);
    } else {
      const stats = await stat(fullPath);
      files.push({
        name: entry.name,
        path: relativePath,
        fullPath: fullPath,
        size: stats.size,
        modifiedAt: stats.mtime.toISOString(),
      });
    }
  }

  return files;
}

/**
 * List all files in a project directory (recursively)
 * @param {string} projectId - Project ID
 * @returns {Promise<Object[]>} - Array of file info objects
 */
export async function listProjectFiles(projectId) {
  const projectPath = getProjectPath(projectId);
  return await listFilesRecursive(projectPath);
}

/**
 * Read a file from a project
 * @param {string} projectId - Project ID
 * @param {string} relativePath - Relative path to file
 * @returns {Promise<string|null>} - File content or null
 */
export async function readProjectFile(projectId, relativePath) {
  const projectPath = getProjectPath(projectId);
  const filePath = join(projectPath, relativePath);

  if (!existsSync(filePath)) {
    return null;
  }

  return await readFile(filePath, "utf-8");
}

/**
 * Delete a project directory and all its contents
 * @param {string} projectId - Project ID
 * @returns {Promise<boolean>} - Whether deletion was successful
 */
export async function deleteProjectDirectory(projectId) {
  const projectPath = getProjectPath(projectId);

  if (!existsSync(projectPath)) {
    return false;
  }

  await rm(projectPath, { recursive: true, force: true });
  console.log(`[FileSystem] Deleted project directory: ${projectPath}`);

  return true;
}

/**
 * Create backend package.json
 * @param {string} projectPath - Project path
 * @param {string} name - Project name
 * @param {string[]} dependencies - List of npm dependencies
 */
export async function createBackendPackageJson(projectPath, name, dependencies = []) {
  const packageJson = {
    name: `${slugify(name)}-backend`,
    version: "1.0.0",
    description: `Backend API for ${name} - Generated by AI Platform`,
    main: "src/server.js",
    scripts: {
      start: "node src/server.js",
      dev: "node --watch src/server.js",
      test: "jest",
    },
    dependencies: {
      express: "^4.18.2",
      cors: "^2.8.5",
      helmet: "^7.1.0",
      "express-rate-limit": "^7.1.5",
      jsonwebtoken: "^9.0.2",
      bcrypt: "^5.1.1",
      uuid: "^9.0.1",
      dotenv: "^16.3.1",
    },
    devDependencies: {
      jest: "^29.7.0",
      supertest: "^6.3.3",
    },
  };

  // Add extra dependencies
  for (const dep of dependencies) {
    if (!packageJson.dependencies[dep]) {
      packageJson.dependencies[dep] = "latest";
    }
  }

  const packagePath = join(projectPath, "backend", "package.json");
  await saveFile(projectPath, "backend/package.json", JSON.stringify(packageJson, null, 2));

  return packagePath;
}

/**
 * Create frontend package.json
 * @param {string} projectPath - Project path
 * @param {string} name - Project name
 */
export async function createFrontendPackageJson(projectPath, name) {
  const packageJson = {
    name: `${slugify(name)}-frontend`,
    version: "1.0.0",
    description: `Frontend for ${name} - Generated by AI Platform`,
    scripts: {
      dev: "next dev",
      build: "next build",
      start: "next start",
      lint: "next lint",
    },
    dependencies: {
      next: "^14.0.4",
      react: "^18.2.0",
      "react-dom": "^18.2.0",
    },
    devDependencies: {
      typescript: "^5.3.3",
      "@types/node": "^20.10.5",
      "@types/react": "^18.2.45",
      tailwindcss: "^3.4.0",
      autoprefixer: "^10.4.16",
      postcss: "^8.4.32",
    },
  };

  await saveFile(projectPath, "frontend/package.json", JSON.stringify(packageJson, null, 2));
}

/**
 * Create a package.json for a project (legacy support)
 * @param {string} projectId - Project ID
 * @param {string} name - Project name
 * @param {string[]} dependencies - List of npm dependencies
 */
export async function createPackageJson(projectId, name, dependencies = []) {
  const projectPath = await createProjectDirectory(projectId);

  const packageJson = {
    name: name.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
    version: "1.0.0",
    description: `Generated by AI Platform`,
    main: "server.js",
    scripts: {
      start: "node server.js",
      dev: "node --watch server.js",
    },
    dependencies: {},
  };

  // Add default dependencies
  const defaultDeps = ["express", "cors"];
  const allDeps = [...new Set([...defaultDeps, ...dependencies])];

  for (const dep of allDeps) {
    packageJson.dependencies[dep] = "latest";
  }

  const packagePath = join(projectPath, "package.json");
  await writeFile(packagePath, JSON.stringify(packageJson, null, 2), "utf-8");

  return packagePath;
}

export default {
  slugify,
  getProjectPath,
  createProjectStructure,
  createProjectDirectory,
  saveFile,
  saveGeneratedFile,
  saveMultipleFiles,
  saveProjectMetadata,
  readProjectMetadata,
  listProjectFiles,
  readProjectFile,
  deleteProjectDirectory,
  createBackendPackageJson,
  createFrontendPackageJson,
  createPackageJson,
};
