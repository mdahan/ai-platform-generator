import { Router } from "express";
import {
  getProjectById,
  updateProject,
  ProjectStatus,
} from "../models/Project.js";
import { testCode } from "../services/aiEngine.js";
import {
  generateMultipleFiles,
  generateSinglePhase,
  GENERATION_PHASES,
} from "../services/multiFileGenerator.js";
import {
  createProjectStructure,
  saveMultipleFiles,
  saveProjectMetadata,
  createBackendPackageJson,
  createFrontendPackageJson,
  slugify,
} from "../services/fileSystem.js";
import { optionalAuth } from "../middleware/auth.js";
import { assignPorts } from "../services/portManager.js";
import { writeFile } from "fs/promises";
import { join } from "path";

const router = Router();

// Track active generations with their SSE clients
const activeGenerations = new Map();

// Batch generation phases with weights for progress calculation
const BATCH_PHASES = [
  { id: "setup", label: "Setting up project structure", weight: 5 },
  { id: "backend", label: "Generating backend API", weight: 30 },
  { id: "frontend", label: "Building frontend components", weight: 25 },
  { id: "database", label: "Creating database schema", weight: 15 },
  { id: "infrastructure", label: "Setting up infrastructure", weight: 10 },
  { id: "documentation", label: "Writing documentation", weight: 10 },
  { id: "finalizing", label: "Finalizing project", weight: 5 },
];

/**
 * Send SSE event to all connected clients for a project
 */
function sendProgressUpdate(projectId, eventData) {
  const generation = activeGenerations.get(projectId);
  if (generation && generation.clients) {
    const data = JSON.stringify(eventData);
    generation.clients.forEach((client) => {
      client.write(`data: ${data}\n\n`);
    });
  }
}

/**
 * Helper to add a log entry and send it to clients
 */
function addLog(projectId, message, type = "info") {
  const generation = activeGenerations.get(projectId);
  if (generation) {
    const logEntry = {
      timestamp: Date.now(),
      message,
      type, // info, success, warning, error, thinking
    };
    generation.logs.push(logEntry);
    sendProgressUpdate(projectId, { type: "log", log: logEntry });
  }
  console.log(`[Generate:${projectId.slice(0, 8)}] ${message}`);
}

/**
 * Update a phase status and recalculate progress
 */
function updatePhase(projectId, phaseId, status, filesCount = 0) {
  const generation = activeGenerations.get(projectId);
  if (!generation) return;

  const phase = generation.phases.find((p) => p.id === phaseId);
  if (phase) {
    phase.status = status;
    if (filesCount > 0) {
      phase.filesGenerated = filesCount;
    }

    // Recalculate progress
    let completedWeight = 0;
    let inProgressWeight = 0;
    generation.phases.forEach((p) => {
      if (p.status === "completed") {
        completedWeight += p.weight;
      } else if (p.status === "in_progress") {
        inProgressWeight += p.weight * 0.5;
      }
    });
    generation.progress = Math.min(100, completedWeight + inProgressWeight);

    sendProgressUpdate(projectId, {
      type: "phase",
      phaseId,
      status,
      filesGenerated: filesCount,
      progress: generation.progress,
      phases: generation.phases,
    });
  }
}

/**
 * Update generation stats
 */
function updateStats(projectId, updates) {
  const generation = activeGenerations.get(projectId);
  if (generation) {
    Object.assign(generation.stats, updates);
    sendProgressUpdate(projectId, { type: "stats", stats: generation.stats });
  }
}

/**
 * POST /api/generate
 * Start code generation for a project using batch generation
 */
router.post("/", optionalAuth, async (req, res) => {
  try {
    const { projectId, prompt, config } = req.body;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_PROJECT_ID",
          message: "Project ID is required",
        },
      });
    }

    const project = getProjectById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: {
          code: "PROJECT_NOT_FOUND",
          message: "Project not found",
        },
      });
    }

    if (project.status === ProjectStatus.GENERATING) {
      return res.status(409).json({
        success: false,
        error: {
          code: "ALREADY_GENERATING",
          message: "Project is already being generated",
        },
      });
    }

    const generationConfig = {
      name: project.name,
      description: prompt || project.description,
      industry: config?.industry || project.config?.industry,
      features: config?.features || project.config?.features || [],
      integrations: config?.integrations || project.config?.integrations || [],
      multiTenant: config?.multiTenant ?? project.config?.multiTenant ?? false,
      authentication: config?.authentication || project.config?.authentication || "basic",
    };

    updateProject(projectId, {
      status: ProjectStatus.GENERATING,
      generationPrompt: generationConfig.description,
    });

    // Initialize active generation tracking
    activeGenerations.set(projectId, {
      startTime: Date.now(),
      status: "generating",
      clients: [],
      phases: BATCH_PHASES.map((p) => ({ ...p, status: "pending", filesGenerated: 0 })),
      progress: 0,
      logs: [],
      stats: {
        backendFiles: 0,
        frontendFiles: 0,
        databaseFiles: 0,
        infraFiles: 0,
        docFiles: 0,
        totalFiles: 0,
        totalLines: 0,
      },
    });

    res.status(202).json({
      success: true,
      message: "Batch generation started",
      data: {
        projectId,
        status: ProjectStatus.GENERATING,
        phases: BATCH_PHASES.map((p) => p.id),
      },
    });

    // Run batch generation in background with progress updates
    runBatchGeneration(projectId, generationConfig);
  } catch (error) {
    console.error("[Generate] Start error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "GENERATION_START_FAILED",
        message: error.message,
      },
    });
  }
});

/**
 * GET /api/generate/:projectId/stream
 * Server-Sent Events endpoint for real-time generation progress
 */
router.get("/:projectId/stream", optionalAuth, (req, res) => {
  const { projectId } = req.params;

  const project = getProjectById(projectId);
  if (!project) {
    return res.status(404).json({
      success: false,
      error: { code: "PROJECT_NOT_FOUND", message: "Project not found" },
    });
  }

  // Set up SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: "connected", projectId })}\n\n`);

  // Get or create generation tracking
  let generation = activeGenerations.get(projectId);
  if (!generation) {
    generation = {
      startTime: Date.now(),
      status: project.status === ProjectStatus.GENERATING ? "generating" : "idle",
      clients: [],
      phases: BATCH_PHASES.map((p) => ({ ...p, status: "pending", filesGenerated: 0 })),
      progress: 0,
      logs: [],
      stats: {
        backendFiles: 0,
        frontendFiles: 0,
        databaseFiles: 0,
        infraFiles: 0,
        docFiles: 0,
        totalFiles: 0,
        totalLines: 0,
      },
    };
    activeGenerations.set(projectId, generation);
  }

  // Add this client to the list
  generation.clients.push(res);

  // Send current state
  res.write(
    `data: ${JSON.stringify({
      type: "state",
      phases: generation.phases,
      progress: generation.progress,
      logs: generation.logs.slice(-50),
      stats: generation.stats,
      status: generation.status,
    })}\n\n`
  );

  // Handle client disconnect
  req.on("close", () => {
    const gen = activeGenerations.get(projectId);
    if (gen) {
      gen.clients = gen.clients.filter((c) => c !== res);
    }
  });
});

/**
 * POST /api/generate/sync
 * Synchronous generation - waits for completion
 */
router.post("/sync", optionalAuth, async (req, res) => {
  try {
    const { projectId, prompt, config } = req.body;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_PROJECT_ID",
          message: "Project ID is required",
        },
      });
    }

    const project = getProjectById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: {
          code: "PROJECT_NOT_FOUND",
          message: "Project not found",
        },
      });
    }

    const generationConfig = {
      name: project.name,
      description: prompt || project.description,
      industry: config?.industry || project.config?.industry,
      features: config?.features || project.config?.features || [],
      integrations: config?.integrations || project.config?.integrations || [],
      multiTenant: config?.multiTenant ?? project.config?.multiTenant ?? false,
      authentication: config?.authentication || project.config?.authentication || "basic",
    };

    updateProject(projectId, { status: ProjectStatus.GENERATING });

    // Initialize tracking for sync mode
    activeGenerations.set(projectId, {
      startTime: Date.now(),
      status: "generating",
      clients: [],
      phases: BATCH_PHASES.map((p) => ({ ...p, status: "pending", filesGenerated: 0 })),
      progress: 0,
      logs: [],
      stats: {
        backendFiles: 0,
        frontendFiles: 0,
        databaseFiles: 0,
        infraFiles: 0,
        docFiles: 0,
        totalFiles: 0,
        totalLines: 0,
      },
    });

    const result = await runBatchGeneration(projectId, generationConfig);
    const updatedProject = getProjectById(projectId);

    res.json({
      success: result.success,
      data: {
        project: updatedProject,
        generation: result,
      },
    });
  } catch (error) {
    console.error("[Generate] Sync error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "GENERATION_FAILED",
        message: error.message,
      },
    });
  }
});

/**
 * POST /api/generate/:projectId/phase/:phase
 * Regenerate a specific phase only
 */
router.post("/:projectId/phase/:phase", optionalAuth, async (req, res) => {
  try {
    const { projectId, phase } = req.params;

    const project = getProjectById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: { code: "PROJECT_NOT_FOUND", message: "Project not found" },
      });
    }

    const validPhases = Object.values(GENERATION_PHASES);
    if (!validPhases.includes(phase)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_PHASE",
          message: `Invalid phase. Valid phases: ${validPhases.join(", ")}`,
        },
      });
    }

    const config = {
      name: project.name,
      description: project.description,
      features: project.config?.features || [],
      multiTenant: project.config?.multiTenant || false,
      authentication: project.config?.authentication || "basic",
    };

    addLog(projectId, `🔄 Regenerating ${phase} phase...`, "info");

    const result = await generateSinglePhase(phase, config);

    if (project.outputPath) {
      const savedFiles = await saveMultipleFiles(project.outputPath, result.files);
      addLog(projectId, `💾 Saved ${savedFiles.length} files for ${phase} phase`, "success");

      res.json({
        success: true,
        data: {
          phase,
          filesGenerated: savedFiles,
          stats: result.stats,
        },
      });
    } else {
      res.json({
        success: true,
        data: {
          phase,
          files: result.files,
          stats: result.stats,
        },
      });
    }
  } catch (error) {
    console.error("[Generate] Phase regeneration error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "PHASE_GENERATION_FAILED",
        message: error.message,
      },
    });
  }
});

/**
 * GET /api/generate/:projectId/status
 */
router.get("/:projectId/status", optionalAuth, async (req, res) => {
  try {
    const project = getProjectById(req.params.projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: {
          code: "PROJECT_NOT_FOUND",
          message: "Project not found",
        },
      });
    }

    const activeGen = activeGenerations.get(req.params.projectId);

    res.json({
      success: true,
      data: {
        projectId: project.id,
        status: project.status,
        isActive: !!activeGen,
        progress: activeGen?.progress || 0,
        phases: activeGen?.phases || [],
        stats: activeGen?.stats || {},
        error: project.error,
        outputPath: project.outputPath,
        generatedFiles: project.generatedFiles,
        testResults: project.testResults,
      },
    });
  } catch (error) {
    console.error("[Generate] Status error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "STATUS_CHECK_FAILED",
        message: error.message,
      },
    });
  }
});

/**
 * POST /api/generate/:projectId/cancel
 */
router.post("/:projectId/cancel", optionalAuth, async (req, res) => {
  try {
    const project = getProjectById(req.params.projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: {
          code: "PROJECT_NOT_FOUND",
          message: "Project not found",
        },
      });
    }

    if (project.status !== ProjectStatus.GENERATING) {
      return res.status(400).json({
        success: false,
        error: {
          code: "NOT_GENERATING",
          message: "Project is not currently generating",
        },
      });
    }

    // Notify clients of cancellation
    sendProgressUpdate(req.params.projectId, {
      type: "cancelled",
      message: "Generation cancelled by user",
    });

    activeGenerations.delete(req.params.projectId);

    updateProject(req.params.projectId, {
      status: ProjectStatus.DRAFT,
      error: "Generation cancelled by user",
    });

    res.json({
      success: true,
      message: "Generation cancelled",
    });
  } catch (error) {
    console.error("[Generate] Cancel error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "CANCEL_FAILED",
        message: error.message,
      },
    });
  }
});

/**
 * Run batch generation with real-time phase progress updates
 * Generates each phase separately to avoid token limits
 */
async function runBatchGeneration(projectId, config) {
  const startTime = Date.now();
  const allFiles = {};
  const phaseResults = [];

  try {
    console.log(`[Generate] Starting batch generation for project ${projectId}`);

    // Phase 0: Setup - Create project folder structure
    updatePhase(projectId, "setup", "in_progress");
    addLog(projectId, "📁 Creating project folder structure...", "info");

    const projectStructure = await createProjectStructure(projectId, config.name);
    const projectPath = projectStructure.path;
    const projectSlug = projectStructure.slug;

    addLog(projectId, `📂 Project path: ${projectPath}`, "info");
    updatePhase(projectId, "setup", "completed");

    // Phase 1: Backend
    updatePhase(projectId, "backend", "in_progress");
    addLog(projectId, "🏗️ Generating backend API (Phase 1/5)...", "thinking");
    addLog(projectId, "⏳ This may take 30-60 seconds...", "info");

    try {
      const backendResult = await generateSinglePhase(GENERATION_PHASES.BACKEND, config);
      const backendFiles = Object.keys(backendResult.files);

      Object.assign(allFiles, backendResult.files);
      phaseResults.push({ phase: "backend", ...backendResult.stats });

      addLog(projectId, `✅ Backend: ${backendFiles.length} files generated`, "success");

      // Check for critical files
      const hasServerJs = backendFiles.some((f) => f.includes("server.js"));
      if (!hasServerJs) {
        addLog(projectId, "⚠️ Warning: server.js not found in backend", "warning");
      }

      updateStats(projectId, {
        backendFiles: backendFiles.length,
        totalFiles: Object.keys(allFiles).length,
        totalLines: backendResult.stats.lines,
      });
      updatePhase(projectId, "backend", "completed", backendFiles.length);
    } catch (error) {
      addLog(projectId, `❌ Backend generation failed: ${error.message}`, "error");
      updatePhase(projectId, "backend", "failed");
      phaseResults.push({ phase: "backend", error: error.message });
    }

    // Phase 2: Frontend
    updatePhase(projectId, "frontend", "in_progress");
    addLog(projectId, "🎨 Generating frontend components (Phase 2/5)...", "thinking");
    addLog(projectId, "⏳ This may take 30-60 seconds...", "info");

    try {
      const frontendResult = await generateSinglePhase(GENERATION_PHASES.FRONTEND, config);
      const frontendFiles = Object.keys(frontendResult.files);

      Object.assign(allFiles, frontendResult.files);
      phaseResults.push({ phase: "frontend", ...frontendResult.stats });

      addLog(projectId, `✅ Frontend: ${frontendFiles.length} files generated`, "success");

      // Check for critical files
      const hasLayout = frontendFiles.some((f) => f.includes("layout.tsx"));
      if (!hasLayout) {
        addLog(projectId, "⚠️ Warning: layout.tsx not found in frontend", "warning");
      }

      updateStats(projectId, {
        frontendFiles: frontendFiles.length,
        totalFiles: Object.keys(allFiles).length,
        totalLines: phaseResults.reduce((sum, p) => sum + (p.lines || 0), 0),
      });
      updatePhase(projectId, "frontend", "completed", frontendFiles.length);
    } catch (error) {
      addLog(projectId, `❌ Frontend generation failed: ${error.message}`, "error");
      updatePhase(projectId, "frontend", "failed");
      phaseResults.push({ phase: "frontend", error: error.message });
    }

    // Phase 3: Database
    updatePhase(projectId, "database", "in_progress");
    addLog(projectId, "🗄️ Generating database schema (Phase 3/5)...", "thinking");

    try {
      const dbResult = await generateSinglePhase(GENERATION_PHASES.DATABASE, config);
      const dbFiles = Object.keys(dbResult.files);

      Object.assign(allFiles, dbResult.files);
      phaseResults.push({ phase: "database", ...dbResult.stats });

      addLog(projectId, `✅ Database: ${dbFiles.length} files generated`, "success");
      updateStats(projectId, {
        databaseFiles: dbFiles.length,
        totalFiles: Object.keys(allFiles).length,
      });
      updatePhase(projectId, "database", "completed", dbFiles.length);
    } catch (error) {
      addLog(projectId, `❌ Database generation failed: ${error.message}`, "error");
      updatePhase(projectId, "database", "failed");
      phaseResults.push({ phase: "database", error: error.message });
    }

    // Phase 4: Infrastructure
    updatePhase(projectId, "infrastructure", "in_progress");
    addLog(projectId, "⚙️ Setting up infrastructure (Phase 4/5)...", "thinking");

    try {
      const infraResult = await generateSinglePhase(GENERATION_PHASES.INFRASTRUCTURE, config);
      const infraFiles = Object.keys(infraResult.files);

      Object.assign(allFiles, infraResult.files);
      phaseResults.push({ phase: "infrastructure", ...infraResult.stats });

      addLog(projectId, `✅ Infrastructure: ${infraFiles.length} files generated`, "success");
      updateStats(projectId, {
        infraFiles: infraFiles.length,
        totalFiles: Object.keys(allFiles).length,
      });
      updatePhase(projectId, "infrastructure", "completed", infraFiles.length);
    } catch (error) {
      addLog(projectId, `❌ Infrastructure generation failed: ${error.message}`, "error");
      updatePhase(projectId, "infrastructure", "failed");
      phaseResults.push({ phase: "infrastructure", error: error.message });
    }

    // Phase 5: Documentation
    updatePhase(projectId, "documentation", "in_progress");
    addLog(projectId, "📚 Writing documentation (Phase 5/5)...", "thinking");

    try {
      const docsResult = await generateSinglePhase(GENERATION_PHASES.DOCUMENTATION, config);
      const docsFiles = Object.keys(docsResult.files);

      Object.assign(allFiles, docsResult.files);
      phaseResults.push({ phase: "documentation", ...docsResult.stats });

      addLog(projectId, `✅ Documentation: ${docsFiles.length} files generated`, "success");
      updateStats(projectId, {
        docFiles: docsFiles.length,
        totalFiles: Object.keys(allFiles).length,
      });
      updatePhase(projectId, "documentation", "completed", docsFiles.length);
    } catch (error) {
      addLog(projectId, `❌ Documentation generation failed: ${error.message}`, "error");
      updatePhase(projectId, "documentation", "failed");
      phaseResults.push({ phase: "documentation", error: error.message });
    }

    // Phase 6: Finalizing - Save files and validate
    updatePhase(projectId, "finalizing", "in_progress");
    addLog(projectId, "🎯 Finalizing project...", "thinking");

    if (Object.keys(allFiles).length === 0) {
      throw new Error("No files were generated across all phases");
    }

    // Save all generated files
    addLog(projectId, `💾 Saving ${Object.keys(allFiles).length} generated files...`, "info");
    const savedFiles = await saveMultipleFiles(projectPath, allFiles);

    // Create package.json files if not already generated
    const generatedFilePaths = Object.keys(allFiles);
    if (!generatedFilePaths.some((f) => f === "backend/package.json")) {
      await createBackendPackageJson(projectPath, config.name);
      savedFiles.push("backend/package.json");
      addLog(projectId, "📦 Created backend/package.json", "info");
    }
    if (!generatedFilePaths.some((f) => f === "frontend/package.json")) {
      await createFrontendPackageJson(projectPath, config.name);
      savedFiles.push("frontend/package.json");
      addLog(projectId, "📦 Created frontend/package.json", "info");
    }

    // Assign ports and create .env files
    addLog(projectId, "🔌 Assigning ports for deployment...", "info");
    const ports = assignPorts(projectId, config.name);

    const backendEnv = `PORT=${ports.backend}
NODE_ENV=development
FRONTEND_URL=http://localhost:${ports.frontend}

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=${slugify(config.name)}_dev
DB_USERNAME=postgres
DB_PASSWORD=postgres

# JWT
JWT_SECRET=dev-secret-${projectId}-change-in-production
JWT_EXPIRES_IN=24h

# CORS
CORS_ORIGIN=http://localhost:${ports.frontend}
`;

    const frontendEnv = `NEXT_PUBLIC_API_URL=http://localhost:${ports.backend}
PORT=${ports.frontend}
`;

    await writeFile(join(projectPath, "backend", ".env"), backendEnv);
    await writeFile(join(projectPath, "frontend", ".env.local"), frontendEnv);
    savedFiles.push("backend/.env", "frontend/.env.local");
    addLog(projectId, `✅ Ports assigned: Frontend ${ports.frontend}, Backend ${ports.backend}`, "success");

    // Calculate final stats
    const totalLines = phaseResults.reduce((sum, p) => sum + (p.lines || 0), 0);
    const totalTokens = phaseResults.reduce((sum, p) => sum + (p.inputTokens || 0) + (p.outputTokens || 0), 0);

    const finalStats = {
      totalFiles: savedFiles.length,
      totalLines,
      totalTokens,
      phases: phaseResults,
      filesByFolder: {},
    };

    // Count files by folder
    for (const filePath of savedFiles) {
      const folder = filePath.split("/")[0];
      finalStats.filesByFolder[folder] = (finalStats.filesByFolder[folder] || 0) + 1;
    }

    // Save project metadata
    await saveProjectMetadata(projectId, {
      projectId,
      slug: projectSlug,
      name: config.name,
      description: config.description,
      generatedAt: new Date().toISOString(),
      config,
      stats: finalStats,
      files: savedFiles,
    });
    savedFiles.push("project.json");

    // Update project with generated files list, ports, and URLs
    updateProject(projectId, {
      status: ProjectStatus.TESTING,
      slug: projectSlug,
      outputPath: projectPath,
      generatedFiles: savedFiles,
      generationStats: finalStats,
      ports,
      urls: {
        frontend: `http://localhost:${ports.frontend}`,
        backend: `http://localhost:${ports.backend}`,
        health: `http://localhost:${ports.backend}/health`,
      },
    });

    // Find and test the main server file
    const serverFile = savedFiles.find(
      (f) => f.endsWith("server.js") || f.includes("backend/src/server.js")
    );

    let testResult = { success: true };

    if (serverFile) {
      addLog(projectId, "🧪 Running tests on generated code...", "thinking");
      const { join } = await import("path");
      const serverFilePath = join(projectPath, serverFile);
      testResult = await testCode(serverFilePath);

      if (testResult.success) {
        addLog(projectId, "✅ Code validation passed", "success");
      } else {
        addLog(projectId, `⚠️ Code validation warning: ${testResult.error}`, "warning");
      }
    } else {
      addLog(projectId, "⏭️ No server.js found, skipping code validation", "info");
    }

    updatePhase(projectId, "finalizing", "completed");

    // Determine final status
    const failedPhases = phaseResults.filter((p) => p.error);
    const finalStatus =
      failedPhases.length === 0 && testResult.success
        ? ProjectStatus.DEPLOYED
        : failedPhases.length === phaseResults.length
          ? ProjectStatus.FAILED
          : ProjectStatus.DEPLOYED; // Partial success is still deployed

    updateProject(projectId, {
      status: finalStatus,
      testResults: testResult,
      error: failedPhases.length > 0 ? `${failedPhases.length} phase(s) had errors` : null,
    });

    const duration = Date.now() - startTime;

    addLog(
      projectId,
      `🎉 Project generated in ${Math.round(duration / 1000)}s!`,
      "success"
    );
    addLog(
      projectId,
      `📦 Total: ${savedFiles.length} files, ${totalLines} lines of code`,
      "success"
    );

    if (failedPhases.length > 0) {
      addLog(
        projectId,
        `⚠️ ${failedPhases.length} phase(s) had errors and may need regeneration`,
        "warning"
      );
    }

    // Send completion event
    sendProgressUpdate(projectId, {
      type: "complete",
      success: finalStatus === ProjectStatus.DEPLOYED,
      duration,
      outputPath: projectPath,
      filesGenerated: savedFiles,
      stats: finalStats,
      phaseResults,
    });

    // Clean up after delay
    setTimeout(() => {
      activeGenerations.delete(projectId);
    }, 5000);

    return {
      success: finalStatus === ProjectStatus.DEPLOYED,
      duration,
      outputPath: projectPath,
      filesGenerated: savedFiles,
      stats: finalStats,
      phaseResults,
      testResults: testResult,
    };
  } catch (error) {
    console.error(`[Generate] Error for project ${projectId}:`, error);

    addLog(projectId, `❌ Error: ${error.message}`, "error");

    updateProject(projectId, {
      status: ProjectStatus.FAILED,
      error: error.message,
    });

    sendProgressUpdate(projectId, {
      type: "error",
      error: error.message,
    });

    activeGenerations.delete(projectId);

    return {
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
    };
  }
}

export default router;
