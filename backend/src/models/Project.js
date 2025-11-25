import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { releasePorts } from "../services/portManager.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data file path for persistence
const DATA_DIR = path.join(__dirname, "..", "..", "data");
const PROJECTS_FILE = path.join(DATA_DIR, "projects.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load projects from file
function loadProjects() {
  try {
    if (fs.existsSync(PROJECTS_FILE)) {
      const data = fs.readFileSync(PROJECTS_FILE, "utf8");
      const projectsArray = JSON.parse(data);
      const map = new Map();
      projectsArray.forEach((p) => map.set(p.id, p));
      return map;
    }
  } catch (error) {
    console.error("[Projects] Error loading projects:", error);
  }
  return new Map();
}

// Save projects to file
function saveProjects() {
  try {
    const projectsArray = Array.from(projects.values());
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projectsArray, null, 2));
  } catch (error) {
    console.error("[Projects] Error saving projects:", error);
  }
}

// In-memory storage with persistence
const projects = loadProjects();

/**
 * Project status enum
 */
export const ProjectStatus = {
  DRAFT: "draft",
  GENERATING: "generating",
  TESTING: "testing",
  DEPLOYED: "deployed",
  FAILED: "failed",
};

/**
 * Create a new project
 * @param {Object} data - Project data
 * @returns {Object} - Created project
 */
export function createProject(data) {
  const id = uuidv4();
  const now = new Date().toISOString();

  const project = {
    id,
    name: data.name || "Untitled Project",
    slug: null, // Set after generation with slugified name
    description: data.description || "",
    status: ProjectStatus.DRAFT,
    config: {
      industry: data.industry || null,
      features: data.features || [],
      integrations: data.integrations || [],
      multiTenant: data.multiTenant || false,
      authentication: data.authentication || "basic",
    },
    generationPrompt: data.generationPrompt || null,
    outputPath: null,
    generatedFiles: [], // List of relative file paths
    generationStats: null, // Stats from generation (tokens, lines, etc.)
    testResults: null,
    error: null,
    ports: null, // { frontend: number, backend: number }
    urls: null, // { frontend: string, backend: string, health: string }
    createdAt: now,
    updatedAt: now,
    userId: data.userId || "anonymous",
  };

  projects.set(id, project);
  saveProjects();
  return project;
}

/**
 * Get all projects for a user
 * @param {string} userId - User ID
 * @returns {Object[]} - Array of projects
 */
export function getProjectsByUser(userId) {
  const userProjects = [];
  for (const project of projects.values()) {
    if (project.userId === userId || userId === "anonymous") {
      userProjects.push(project);
    }
  }
  return userProjects.sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
  );
}

/**
 * Get a project by ID
 * @param {string} id - Project ID
 * @returns {Object|null} - Project or null
 */
export function getProjectById(id) {
  return projects.get(id) || null;
}

/**
 * Update a project
 * @param {string} id - Project ID
 * @param {Object} updates - Fields to update
 * @returns {Object|null} - Updated project or null
 */
export function updateProject(id, updates) {
  const project = projects.get(id);
  if (!project) {
    return null;
  }

  const updatedProject = {
    ...project,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  // Don't allow overwriting id or createdAt
  updatedProject.id = project.id;
  updatedProject.createdAt = project.createdAt;

  projects.set(id, updatedProject);
  saveProjects();
  return updatedProject;
}

/**
 * Delete a project and its generated files
 * @param {string} id - Project ID
 * @returns {Promise<boolean>} - Whether the project was deleted
 */
export async function deleteProject(id) {
  const project = projects.get(id);
  if (!project) {
    return false;
  }

  // Delete from database
  const result = projects.delete(id);

  // Delete generated files folder if it exists
  if (project.outputPath && fs.existsSync(project.outputPath)) {
    try {
      console.log(`[Projects] Deleting folder: ${project.outputPath}`);
      fs.rmSync(project.outputPath, { recursive: true, force: true });
      console.log(`[Projects] Successfully deleted folder for project ${id}`);
    } catch (error) {
      console.error(`[Projects] Error deleting folder for project ${id}:`, error);
      // Continue even if folder deletion fails
    }
  }

  // Release port assignments
  releasePorts(id);

  if (result) saveProjects();
  return result;
}

/**
 * Get all projects (admin only)
 * @returns {Object[]} - Array of all projects
 */
export function getAllProjects() {
  return Array.from(projects.values()).sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
  );
}

export default {
  ProjectStatus,
  createProject,
  getProjectsByUser,
  getProjectById,
  updateProject,
  deleteProject,
  getAllProjects,
};
