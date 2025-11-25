import { spawn } from 'child_process';
import { getAssignment } from './portManager.js';
import { getProjectById, updateProject } from '../models/Project.js';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

const execPromise = promisify(exec);

// Store running processes
const runningApps = new Map();

/**
 * Wait for a server to be ready by polling
 * @param {string} url - URL to check
 * @param {number} timeout - Timeout in milliseconds
 */
async function waitForServer(url, timeout = 30000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return true;
      }
    } catch (error) {
      // Server not ready yet, continue polling
    }

    // Wait 1 second before next attempt
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error(`Server at ${url} did not start within ${timeout}ms`);
}

/**
 * Deploy a project locally
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Deployment result
 */
export async function deployLocal(projectId) {
  const project = getProjectById(projectId);
  if (!project) {
    throw new Error('Project not found');
  }

  const ports = getAssignment(projectId);
  if (!ports) {
    throw new Error('No ports assigned to project');
  }

  // Check if already running
  if (runningApps.has(projectId)) {
    console.log(`[Deploy] Project ${project.name} is already running`);
    return {
      success: true,
      message: 'Already running',
      urls: {
        frontend: `http://localhost:${ports.frontend}`,
        backend: `http://localhost:${ports.backend}`,
        health: `http://localhost:${ports.backend}/health`
      }
    };
  }

  console.log(`[Deploy] Starting ${project.name}...`);
  console.log(`  Frontend: http://localhost:${ports.frontend}`);
  console.log(`  Backend: http://localhost:${ports.backend}`);

  const projectPath = project.outputPath || project.path;
  const backendPath = path.join(projectPath, 'backend');
  const frontendPath = path.join(projectPath, 'frontend');

  try {
    // Install dependencies
    console.log('[Deploy] Installing backend dependencies...');
    await execPromise('npm install', { cwd: backendPath });

    console.log('[Deploy] Installing frontend dependencies...');
    await execPromise('npm install', { cwd: frontendPath });

    // Start backend
    console.log('[Deploy] Starting backend server...');
    const backendProcess = spawn('npm', ['start'], {
      cwd: backendPath,
      env: {
        ...process.env,
        PORT: ports.backend.toString()
      },
      shell: true,
      stdio: 'pipe'
    });

    let backendOutput = '';
    backendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      backendOutput += output;
      console.log(`[Backend ${projectId}] ${output}`);
    });

    backendProcess.stderr.on('data', (data) => {
      console.error(`[Backend ${projectId} ERROR] ${data.toString()}`);
    });

    backendProcess.on('exit', (code) => {
      console.log(`[Backend ${projectId}] Process exited with code ${code}`);
      runningApps.delete(projectId);
    });

    // Start frontend
    console.log('[Deploy] Starting frontend server...');
    const frontendProcess = spawn('npm', ['run', 'dev'], {
      cwd: frontendPath,
      env: {
        ...process.env,
        PORT: ports.frontend.toString()
      },
      shell: true,
      stdio: 'pipe'
    });

    let frontendOutput = '';
    frontendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      frontendOutput += output;
      console.log(`[Frontend ${projectId}] ${output}`);
    });

    frontendProcess.stderr.on('data', (data) => {
      console.error(`[Frontend ${projectId} ERROR] ${data.toString()}`);
    });

    frontendProcess.on('exit', (code) => {
      console.log(`[Frontend ${projectId}] Process exited with code ${code}`);
    });

    // Store processes
    runningApps.set(projectId, {
      backend: backendProcess,
      frontend: frontendProcess,
      ports,
      startedAt: new Date(),
      logs: {
        backend: backendOutput,
        frontend: frontendOutput
      }
    });

    // Wait for servers to be ready
    console.log('[Deploy] Waiting for servers to be ready...');
    try {
      await waitForServer(`http://localhost:${ports.backend}/health`, 30000);
      console.log('[Deploy] Backend is ready');
    } catch (error) {
      console.log('[Deploy] Backend health check timeout (may be normal if no /health endpoint)');
    }

    try {
      await waitForServer(`http://localhost:${ports.frontend}`, 30000);
      console.log('[Deploy] Frontend is ready');
    } catch (error) {
      console.log('[Deploy] Frontend startup timeout (may still be building)');
    }

    // Update project status
    updateProject(projectId, { status: 'deployed' });

    console.log(`[Deploy] Successfully deployed ${project.name}`);

    return {
      success: true,
      message: 'Deployed successfully',
      urls: {
        frontend: `http://localhost:${ports.frontend}`,
        backend: `http://localhost:${ports.backend}`,
        health: `http://localhost:${ports.backend}/health`
      }
    };
  } catch (error) {
    console.error(`[Deploy] Error deploying ${project.name}:`, error);

    // Clean up any running processes
    if (runningApps.has(projectId)) {
      const app = runningApps.get(projectId);
      app.backend?.kill();
      app.frontend?.kill();
      runningApps.delete(projectId);
    }

    throw error;
  }
}

/**
 * Stop a running app
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Result
 */
export async function stopApp(projectId) {
  const app = runningApps.get(projectId);

  if (!app) {
    console.log(`[Deploy] App ${projectId} is not running`);
    return { success: true, message: 'App was not running' };
  }

  console.log(`[Deploy] Stopping app ${projectId}...`);

  // Kill processes
  if (app.backend) {
    app.backend.kill('SIGTERM');
    // Force kill after 5 seconds if still running
    setTimeout(() => {
      if (!app.backend.killed) {
        app.backend.kill('SIGKILL');
      }
    }, 5000);
  }

  if (app.frontend) {
    app.frontend.kill('SIGTERM');
    setTimeout(() => {
      if (!app.frontend.killed) {
        app.frontend.kill('SIGKILL');
      }
    }, 5000);
  }

  runningApps.delete(projectId);
  updateProject(projectId, { status: 'stopped' });

  console.log(`[Deploy] Stopped app ${projectId}`);

  return { success: true, message: 'App stopped' };
}

/**
 * Restart a running app
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Result
 */
export async function restartApp(projectId) {
  console.log(`[Deploy] Restarting app ${projectId}...`);
  await stopApp(projectId);

  // Wait a moment for ports to be released
  await new Promise(resolve => setTimeout(resolve, 2000));

  return await deployLocal(projectId);
}

/**
 * Get app deployment status
 * @param {string} projectId - Project ID
 * @returns {string} Status: 'running' or 'stopped'
 */
export function getAppStatus(projectId) {
  return runningApps.has(projectId) ? 'running' : 'stopped';
}

/**
 * Get logs for a running app
 * @param {string} projectId - Project ID
 * @returns {Object|null} Logs object or null
 */
export function getAppLogs(projectId) {
  const app = runningApps.get(projectId);
  return app ? app.logs : null;
}

/**
 * Get all running apps
 * @returns {Array} Array of running app info
 */
export function getRunningApps() {
  const apps = [];
  for (const [projectId, app] of runningApps.entries()) {
    apps.push({
      projectId,
      ports: app.ports,
      startedAt: app.startedAt,
      urls: {
        frontend: `http://localhost:${app.ports.frontend}`,
        backend: `http://localhost:${app.ports.backend}`
      }
    });
  }
  return apps;
}
