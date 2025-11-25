import { Router } from "express";
import {
  createProject,
  getProjectsByUser,
  getProjectById,
  updateProject,
  deleteProject,
} from "../models/Project.js";
import { listProjectFiles, readProjectFile } from "../services/fileSystem.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";

const router = Router();

/**
 * POST /api/projects
 * Create a new project
 */
router.post("/", optionalAuth, async (req, res) => {
  try {
    const { name, description, industry, features, integrations, multiTenant, authentication } =
      req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_NAME",
          message: "Project name is required",
        },
      });
    }

    const project = createProject({
      name,
      description,
      industry,
      features,
      integrations,
      multiTenant,
      authentication,
      userId: req.user.id,
    });

    res.status(201).json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error("[Projects] Create error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "CREATE_FAILED",
        message: error.message,
      },
    });
  }
});

/**
 * GET /api/projects
 * List all projects for the current user
 */
router.get("/", optionalAuth, async (req, res) => {
  try {
    const projects = getProjectsByUser(req.user.id);

    res.json({
      success: true,
      data: {
        items: projects,
        total: projects.length,
      },
    });
  } catch (error) {
    console.error("[Projects] List error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "LIST_FAILED",
        message: error.message,
      },
    });
  }
});

/**
 * GET /api/projects/:id
 * Get a specific project by ID
 */
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const project = getProjectById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Project not found",
        },
      });
    }

    // Check ownership (skip for anonymous)
    if (req.user.id !== "anonymous" && project.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "You do not have access to this project",
        },
      });
    }

    res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error("[Projects] Get error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "GET_FAILED",
        message: error.message,
      },
    });
  }
});

/**
 * PATCH /api/projects/:id
 * Update a project
 */
router.patch("/:id", optionalAuth, async (req, res) => {
  try {
    const project = getProjectById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Project not found",
        },
      });
    }

    // Check ownership
    if (req.user.id !== "anonymous" && project.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "You do not have access to this project",
        },
      });
    }

    const allowedUpdates = ["name", "description", "config", "status"];
    const updates = {};

    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    const updatedProject = updateProject(req.params.id, updates);

    res.json({
      success: true,
      data: updatedProject,
    });
  } catch (error) {
    console.error("[Projects] Update error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "UPDATE_FAILED",
        message: error.message,
      },
    });
  }
});

/**
 * DELETE /api/projects/:id
 * Delete a project (stops running app, deletes files, removes from database)
 */
router.delete("/:id", optionalAuth, async (req, res) => {
  try {
    const project = getProjectById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Project not found",
        },
      });
    }

    // Check ownership
    if (req.user.id !== "anonymous" && project.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "You do not have access to this project",
        },
      });
    }

    // Stop the running app if it exists
    try {
      const stopResponse = await fetch(`http://localhost:${process.env.PORT || 3001}/api/deploy/${req.params.id}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (stopResponse.ok) {
        console.log(`[Projects] Stopped running app for project ${req.params.id}`);
      }
    } catch (stopError) {
      // App might not be running, that's ok
      console.log(`[Projects] App was not running for project ${req.params.id}`);
    }

    // Delete the project (this now also deletes files)
    await deleteProject(req.params.id);

    res.json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    console.error("[Projects] Delete error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "DELETE_FAILED",
        message: error.message,
      },
    });
  }
});

/**
 * GET /api/projects/:id/files
 * List files in a project
 */
router.get("/:id/files", optionalAuth, async (req, res) => {
  try {
    const project = getProjectById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Project not found",
        },
      });
    }

    const files = await listProjectFiles(req.params.id);

    res.json({
      success: true,
      data: files,
    });
  } catch (error) {
    console.error("[Projects] List files error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "LIST_FILES_FAILED",
        message: error.message,
      },
    });
  }
});

/**
 * GET /api/projects/:id/files/:filename
 * Get a specific file content
 */
router.get("/:id/files/:filename", optionalAuth, async (req, res) => {
  try {
    const project = getProjectById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Project not found",
        },
      });
    }

    const content = await readProjectFile(req.params.id, req.params.filename);

    if (content === null) {
      return res.status(404).json({
        success: false,
        error: {
          code: "FILE_NOT_FOUND",
          message: "File not found",
        },
      });
    }

    res.json({
      success: true,
      data: {
        filename: req.params.filename,
        content,
      },
    });
  } catch (error) {
    console.error("[Projects] Get file error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "GET_FILE_FAILED",
        message: error.message,
      },
    });
  }
});

export default router;
