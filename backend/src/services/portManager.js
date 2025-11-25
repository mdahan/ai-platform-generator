import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT_FILE = path.join(__dirname, '../../data/port-assignments.json');
const PLATFORM_PORTS = [3000, 3001]; // Reserved for platform
const STARTING_PORT = 4000;

/**
 * Ensure data directory exists
 */
function ensureDataDir() {
  const dir = path.dirname(PORT_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Load port assignments from file
 * @returns {Array} Array of port assignments
 */
function loadAssignments() {
  ensureDataDir();
  if (!fs.existsSync(PORT_FILE)) {
    fs.writeFileSync(PORT_FILE, JSON.stringify([], null, 2));
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(PORT_FILE, 'utf8'));
  } catch (error) {
    console.error('[PortManager] Error loading assignments:', error);
    return [];
  }
}

/**
 * Save port assignments to file
 * @param {Array} assignments - Array of port assignments
 */
function saveAssignments(assignments) {
  ensureDataDir();
  fs.writeFileSync(PORT_FILE, JSON.stringify(assignments, null, 2));
}

/**
 * Get all currently used ports
 * @returns {Set} Set of used port numbers
 */
function getUsedPorts() {
  const assignments = loadAssignments();
  const used = new Set(PLATFORM_PORTS);

  assignments.forEach(a => {
    used.add(a.frontend);
    used.add(a.backend);
  });

  return used;
}

/**
 * Find next available port starting from a given port
 * @param {number} startFrom - Port to start searching from
 * @returns {number} Available port number
 */
function findNextPort(startFrom) {
  const used = getUsedPorts();
  let port = startFrom;

  while (used.has(port)) {
    port++;
  }

  return port;
}

/**
 * Assign ports to a new project
 * @param {string} projectId - Project ID
 * @param {string} projectName - Project name
 * @returns {Object} Port assignment { projectId, projectName, frontend, backend, assignedAt }
 */
export function assignPorts(projectId, projectName) {
  const assignments = loadAssignments();

  // Check if already assigned
  const existing = assignments.find(a => a.projectId === projectId);
  if (existing) {
    console.log(`[PortManager] Project ${projectName} already has ports assigned`);
    return existing;
  }

  // Find available ports
  const frontendPort = findNextPort(STARTING_PORT);
  const backendPort = findNextPort(frontendPort + 1);

  const assignment = {
    projectId,
    projectName,
    frontend: frontendPort,
    backend: backendPort,
    assignedAt: new Date().toISOString()
  };

  assignments.push(assignment);
  saveAssignments(assignments);

  console.log(`[PortManager] Assigned ports to ${projectName}:`);
  console.log(`  Frontend: ${frontendPort}`);
  console.log(`  Backend: ${backendPort}`);

  return assignment;
}

/**
 * Get port assignment for a project
 * @param {string} projectId - Project ID
 * @returns {Object|undefined} Port assignment or undefined
 */
export function getAssignment(projectId) {
  const assignments = loadAssignments();
  return assignments.find(a => a.projectId === projectId);
}

/**
 * Release ports when project is deleted
 * @param {string} projectId - Project ID
 */
export function releasePorts(projectId) {
  let assignments = loadAssignments();
  const before = assignments.length;
  assignments = assignments.filter(a => a.projectId !== projectId);
  const after = assignments.length;

  if (before > after) {
    saveAssignments(assignments);
    console.log(`[PortManager] Released ports for project ${projectId}`);
  }
}

/**
 * Get all port assignments
 * @returns {Array} Array of all port assignments
 */
export function getAllAssignments() {
  return loadAssignments();
}
