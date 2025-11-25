import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const router = express.Router();
const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * GET /api/engines - Get all available AI engines
 */
router.get("/", async (req, res) => {
  try {
    // Dynamically import the engines module
    const enginesModule = await import(join(__dirname, "..", "..", "..", "ai-engine", "src", "engines", "index.js"));
    const engines = enginesModule.getAllEngines();

    res.json({
      success: true,
      data: engines,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Engines] Error fetching engines:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "ENGINES_FETCH_ERROR",
        message: "Failed to fetch available engines",
        details: error.message,
      },
    });
  }
});

/**
 * GET /api/engines/presets - Get engine configuration presets
 */
router.get("/presets", async (req, res) => {
  try {
    const pipelineModule = await import(join(__dirname, "..", "..", "..", "ai-engine", "src", "pipeline.js"));
    const { PRESETS } = pipelineModule;

    res.json({
      success: true,
      data: PRESETS,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Engines] Error fetching presets:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "PRESETS_FETCH_ERROR",
        message: "Failed to fetch engine presets",
        details: error.message,
      },
    });
  }
});

export default router;
