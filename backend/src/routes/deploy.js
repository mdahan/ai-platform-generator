import express from 'express';
import { spawn, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getAssignment } from '../services/portManager.js';
import { getProjectById, updateProject } from '../models/Project.js';

const router = express.Router();

// Get dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store running processes for each project
const runningProcesses = new Map();

/**
 * Get the generated apps directory
 */
function getGeneratedAppsDir() {
  return path.join(__dirname, '..', '..', '..', 'generated-apps');
}

/**
 * Find project folder by ID
 */
function findProjectFolder(projectId) {
  const generatedAppsDir = getGeneratedAppsDir();

  if (!fs.existsSync(generatedAppsDir)) {
    return null;
  }

  const folders = fs.readdirSync(generatedAppsDir);
  const projectFolder = folders.find(folder => folder.startsWith(projectId));

  if (projectFolder) {
    return path.join(generatedAppsDir, projectFolder);
  }

  return null;
}

/**
 * Run npm install in a directory
 */
function runNpmInstall(directory) {
  return new Promise((resolve, reject) => {
    console.log(`Running npm install in ${directory}...`);

    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const install = spawn(npmCmd, ['install'], {
      cwd: directory,
      shell: true,
      stdio: 'pipe'
    });

    let output = '';
    let errorOutput = '';

    install.stdout.on('data', (data) => {
      output += data.toString();
    });

    install.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    install.on('close', (code) => {
      if (code === 0) {
        console.log(`npm install completed in ${directory}`);
        resolve(output);
      } else {
        console.error(`npm install failed in ${directory}:`, errorOutput);
        reject(new Error(`npm install failed with code ${code}: ${errorOutput}`));
      }
    });

    install.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * POST /api/deploy/:projectId/local
 * Start the application locally
 */
router.post('/:projectId/local', async (req, res) => {
  const { projectId } = req.params;
  const { skipInstall = false } = req.body;

  try {
    // Get assigned ports from port manager
    const portAssignment = getAssignment(projectId);
    if (!portAssignment) {
      return res.status(400).json({
        success: false,
        error: 'No ports assigned to project. Generate the project first.'
      });
    }

    const backendPort = portAssignment.backend;
    const frontendPort = portAssignment.frontend;

    // Check if already running
    if (runningProcesses.has(projectId)) {
      const existing = runningProcesses.get(projectId);
      return res.json({
        success: true,
        message: 'Application is already running',
        status: 'running',
        urls: {
          frontend: `http://localhost:${existing.frontendPort}`,
          backend: `http://localhost:${existing.backendPort}`
        }
      });
    }

    // Find project folder
    const projectPath = findProjectFolder(projectId);

    if (!projectPath) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    const backendPath = path.join(projectPath, 'backend');
    const frontendPath = path.join(projectPath, 'frontend');

    // Check if backend exists
    if (!fs.existsSync(backendPath)) {
      return res.status(400).json({
        success: false,
        error: 'Backend folder not found'
      });
    }

    // Run npm install if not skipped
    if (!skipInstall) {
      try {
        if (fs.existsSync(path.join(backendPath, 'package.json'))) {
          await runNpmInstall(backendPath);
        }
        if (fs.existsSync(path.join(frontendPath, 'package.json'))) {
          await runNpmInstall(frontendPath);
        }
      } catch (installError) {
        console.error('npm install error:', installError);
        // Continue anyway - might already be installed
      }
    }

    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const processes = {
      backend: null,
      frontend: null,
      backendPort,
      frontendPort,
      startTime: Date.now(),
      logs: {
        backend: [],
        frontend: []
      }
    };

    // Start backend
    if (fs.existsSync(path.join(backendPath, 'package.json'))) {
      // Update PORT in .env if it exists
      const envPath = path.join(backendPath, '.env');
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf-8');
        envContent = envContent.replace(/^PORT=.*/m, `PORT=${backendPort}`);
        fs.writeFileSync(envPath, envContent);
      }

      processes.backend = spawn(npmCmd, ['start'], {
        cwd: backendPath,
        shell: true,
        env: { ...process.env, PORT: backendPort.toString() },
        stdio: 'pipe'
      });

      processes.backend.stdout.on('data', (data) => {
        const log = data.toString();
        console.log(`[Backend ${projectId}] ${log}`);
        processes.logs.backend.push({ time: new Date().toISOString(), message: log, type: 'stdout' });
        if (processes.logs.backend.length > 100) {
          processes.logs.backend.shift();
        }
      });

      processes.backend.stderr.on('data', (data) => {
        const log = data.toString();
        console.error(`[Backend ${projectId}] ${log}`);
        processes.logs.backend.push({ time: new Date().toISOString(), message: log, type: 'stderr' });
        if (processes.logs.backend.length > 100) {
          processes.logs.backend.shift();
        }
      });

      processes.backend.on('close', (code) => {
        console.log(`[Backend ${projectId}] Process exited with code ${code}`);
        if (runningProcesses.has(projectId)) {
          const p = runningProcesses.get(projectId);
          p.backend = null;
        }
      });
    }

    // Start frontend
    if (fs.existsSync(path.join(frontendPath, 'package.json'))) {
      processes.frontend = spawn(npmCmd, ['run', 'dev', '--', '-p', frontendPort.toString()], {
        cwd: frontendPath,
        shell: true,
        env: { ...process.env, PORT: frontendPort.toString() },
        stdio: 'pipe'
      });

      processes.frontend.stdout.on('data', (data) => {
        const log = data.toString();
        console.log(`[Frontend ${projectId}] ${log}`);
        processes.logs.frontend.push({ time: new Date().toISOString(), message: log, type: 'stdout' });
        if (processes.logs.frontend.length > 100) {
          processes.logs.frontend.shift();
        }
      });

      processes.frontend.stderr.on('data', (data) => {
        const log = data.toString();
        console.error(`[Frontend ${projectId}] ${log}`);
        processes.logs.frontend.push({ time: new Date().toISOString(), message: log, type: 'stderr' });
        if (processes.logs.frontend.length > 100) {
          processes.logs.frontend.shift();
        }
      });

      processes.frontend.on('close', (code) => {
        console.log(`[Frontend ${projectId}] Process exited with code ${code}`);
        if (runningProcesses.has(projectId)) {
          const p = runningProcesses.get(projectId);
          p.frontend = null;
        }
      });
    }

    runningProcesses.set(projectId, processes);

    // Update project status to deployed
    updateProject(projectId, { status: 'deployed' });

    // Wait a bit for servers to start
    await new Promise(resolve => setTimeout(resolve, 3000));

    res.json({
      success: true,
      message: 'Application starting...',
      status: 'starting',
      urls: {
        frontend: processes.frontend ? `http://localhost:${frontendPort}` : null,
        backend: processes.backend ? `http://localhost:${backendPort}` : null
      },
      pids: {
        backend: processes.backend?.pid,
        frontend: processes.frontend?.pid
      }
    });

  } catch (error) {
    console.error('Deploy local error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/deploy/:projectId/docker
 * Start the application with Docker
 */
router.post('/:projectId/docker', async (req, res) => {
  const { projectId } = req.params;

  try {
    const projectPath = findProjectFolder(projectId);

    if (!projectPath) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check if docker-compose.yml exists
    const composePath = path.join(projectPath, 'docker-compose.yml');
    if (!fs.existsSync(composePath)) {
      return res.status(400).json({
        success: false,
        error: 'docker-compose.yml not found in project'
      });
    }

    // Run docker-compose up
    const dockerCompose = spawn('docker-compose', ['up', '-d'], {
      cwd: projectPath,
      shell: true,
      stdio: 'pipe'
    });

    let output = '';
    let errorOutput = '';

    dockerCompose.stdout.on('data', (data) => {
      output += data.toString();
    });

    dockerCompose.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    dockerCompose.on('close', (code) => {
      if (code === 0) {
        res.json({
          success: true,
          message: 'Docker containers started',
          status: 'running',
          output,
          urls: {
            frontend: 'http://localhost:3000',
            backend: 'http://localhost:5000'
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: `docker-compose failed: ${errorOutput}`
        });
      }
    });

  } catch (error) {
    console.error('Docker deploy error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/deploy/:projectId/stop
 * Stop the running application
 */
router.post('/:projectId/stop', async (req, res) => {
  const { projectId } = req.params;
  const { stopDocker = false } = req.body;

  try {
    // Stop local processes
    if (runningProcesses.has(projectId)) {
      const processes = runningProcesses.get(projectId);

      if (processes.backend) {
        console.log(`Stopping backend process ${processes.backend.pid}`);
        if (process.platform === 'win32') {
          exec(`taskkill /PID ${processes.backend.pid} /T /F`);
        } else {
          processes.backend.kill('SIGTERM');
        }
      }

      if (processes.frontend) {
        console.log(`Stopping frontend process ${processes.frontend.pid}`);
        if (process.platform === 'win32') {
          exec(`taskkill /PID ${processes.frontend.pid} /T /F`);
        } else {
          processes.frontend.kill('SIGTERM');
        }
      }

      runningProcesses.delete(projectId);
    }

    // Stop docker containers if requested
    if (stopDocker) {
      const projectPath = findProjectFolder(projectId);
      if (projectPath && fs.existsSync(path.join(projectPath, 'docker-compose.yml'))) {
        await new Promise((resolve) => {
          exec('docker-compose down', { cwd: projectPath }, (error, stdout, stderr) => {
            if (error) {
              console.error('Docker stop error:', stderr);
            }
            resolve();
          });
        });
      }
    }

    // Update project status to stopped
    updateProject(projectId, { status: 'stopped' });

    res.json({
      success: true,
      message: 'Application stopped',
      status: 'stopped'
    });

  } catch (error) {
    console.error('Stop error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/deploy/:projectId/status
 * Get the running status of an application
 */
router.get('/:projectId/status', async (req, res) => {
  const { projectId } = req.params;

  try {
    if (runningProcesses.has(projectId)) {
      const processes = runningProcesses.get(projectId);

      res.json({
        success: true,
        status: 'running',
        urls: {
          frontend: processes.frontend ? `http://localhost:${processes.frontendPort}` : null,
          backend: processes.backend ? `http://localhost:${processes.backendPort}` : null
        },
        pids: {
          backend: processes.backend?.pid,
          frontend: processes.frontend?.pid
        },
        uptime: processes.startTime ? Date.now() - processes.startTime : 0
      });
    } else {
      res.json({
        success: true,
        status: 'stopped',
        urls: null
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/deploy/:projectId/logs
 * Get recent logs from the running application
 */
router.get('/:projectId/logs', async (req, res) => {
  const { projectId } = req.params;
  const { type = 'all' } = req.query;

  try {
    if (!runningProcesses.has(projectId)) {
      return res.json({
        success: true,
        logs: {
          backend: [],
          frontend: []
        }
      });
    }

    const processes = runningProcesses.get(projectId);

    let logs = {};
    if (type === 'backend' || type === 'all') {
      logs.backend = processes.logs.backend;
    }
    if (type === 'frontend' || type === 'all') {
      logs.frontend = processes.logs.frontend;
    }

    res.json({
      success: true,
      logs
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/deploy/running
 * Get all running applications
 */
router.get('/running', async (req, res) => {
  try {
    const running = [];

    for (const [projectId, processes] of runningProcesses) {
      running.push({
        projectId,
        urls: {
          frontend: processes.frontend ? `http://localhost:${processes.frontendPort}` : null,
          backend: processes.backend ? `http://localhost:${processes.backendPort}` : null
        },
        pids: {
          backend: processes.backend?.pid,
          frontend: processes.frontend?.pid
        },
        uptime: processes.startTime ? Date.now() - processes.startTime : 0
      });
    }

    res.json({
      success: true,
      running
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
