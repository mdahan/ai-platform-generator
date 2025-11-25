import express from 'express';
import { readFile, writeFile } from 'fs/promises';
import { join, relative, normalize } from 'path';
import { fileURLToPath } from 'url';
import { getProjectById } from '../models/Project.js';
import fs from 'fs';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..', '..', '..');

/**
 * GET /api/files/:projectId/read
 * Read a file from the project
 */
router.get('/:projectId/read', async (req, res) => {
  const { projectId } = req.params;
  const { path: filePath } = req.query;

  try {
    const project = getProjectById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: 'File path is required'
      });
    }

    // Security: ensure the file path is within the project directory
    const projectPath = project.outputPath;
    const fullPath = join(projectPath, filePath);
    const normalizedPath = normalize(fullPath);

    if (!normalizedPath.startsWith(normalize(projectPath))) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: Path outside project directory'
      });
    }

    // Check if file exists
    if (!fs.existsSync(normalizedPath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Read file
    const content = await readFile(normalizedPath, 'utf-8');

    res.json({
      success: true,
      content,
      path: filePath
    });

  } catch (error) {
    console.error('File read error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/files/:projectId/write
 * Write content to a file
 */
router.post('/:projectId/write', async (req, res) => {
  const { projectId } = req.params;
  const { path: filePath, content } = req.body;

  try {
    const project = getProjectById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    if (!filePath || content === undefined) {
      return res.status(400).json({
        success: false,
        error: 'File path and content are required'
      });
    }

    // Security: ensure the file path is within the project directory
    const projectPath = project.outputPath;
    const fullPath = join(projectPath, filePath);
    const normalizedPath = normalize(fullPath);

    if (!normalizedPath.startsWith(normalize(projectPath))) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: Path outside project directory'
      });
    }

    // Write file
    await writeFile(normalizedPath, content, 'utf-8');

    res.json({
      success: true,
      message: 'File saved successfully',
      path: filePath
    });

  } catch (error) {
    console.error('File write error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/files/:projectId/list
 * List all files in the project
 */
router.get('/:projectId/list', async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = getProjectById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    res.json({
      success: true,
      files: project.generatedFiles || []
    });

  } catch (error) {
    console.error('File list error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
