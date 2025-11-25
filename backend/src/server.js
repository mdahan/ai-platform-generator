import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import projectsRouter from "./routes/projects.js";
import generateRouter from "./routes/generate.js";
import deployRouter from "./routes/deploy.js";
import enginesRouter from "./routes/engines.js";
import filesRouter from "./routes/files.js";

// Load environment variables
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env") });

// Also try to load from ai-engine's .env for the API key
dotenv.config({ path: join(__dirname, "..", "..", "ai-engine", ".env") });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API info
app.get("/api", (req, res) => {
  res.json({
    name: "AI Platform Backend",
    version: "1.0.0",
    endpoints: {
      health: "GET /health",
      projects: {
        list: "GET /api/projects",
        create: "POST /api/projects",
        get: "GET /api/projects/:id",
        update: "PATCH /api/projects/:id",
        delete: "DELETE /api/projects/:id",
        files: "GET /api/projects/:id/files",
        file: "GET /api/projects/:id/files/:filename",
      },
      engines: {
        list: "GET /api/engines",
        presets: "GET /api/engines/presets",
      },
      generate: {
        start: "POST /api/generate",
        sync: "POST /api/generate/sync",
        status: "GET /api/generate/:projectId/status",
        cancel: "POST /api/generate/:projectId/cancel",
      },
      deploy: {
        local: "POST /api/deploy/:projectId/local",
        docker: "POST /api/deploy/:projectId/docker",
        stop: "POST /api/deploy/:projectId/stop",
        status: "GET /api/deploy/:projectId/status",
        logs: "GET /api/deploy/:projectId/logs",
        running: "GET /api/deploy/running",
      },
    },
  });
});

// Routes
app.use("/api/projects", projectsRouter);
app.use("/api/generate", generateRouter);
app.use("/api/deploy", deployRouter);
app.use("/api/engines", enginesRouter);
app.use("/api/files", filesRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("[Server] Error:", err);
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || "INTERNAL_ERROR",
      message: err.message || "An unexpected error occurred",
    },
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║          AI Platform Backend Server                       ║
╠═══════════════════════════════════════════════════════════╣
║  Status:  Running                                         ║
║  Port:    ${PORT}                                            ║
║  Time:    ${new Date().toISOString()}            ║
╠═══════════════════════════════════════════════════════════╣
║  Endpoints:                                               ║
║    GET  /health           - Health check                  ║
║    GET  /api              - API info                      ║
║    *    /api/projects     - Project management            ║
║    *    /api/generate     - Code generation               ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;
