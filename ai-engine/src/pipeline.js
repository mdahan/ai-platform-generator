import { getEngine, getAllEngines } from './engines/index.js';

/**
 * Predefined engine configuration presets
 */
const PRESETS = {
  fast: {
    name: 'Fast Generation',
    description: 'Use Cerebras for all tasks - fastest generation',
    config: {
      planning: 'cerebras',
      architecture: 'cerebras',
      database: 'cerebras',
      backend: 'cerebras',
      frontend: 'cerebras',
      testing: 'cerebras'
    }
  },
  quality: {
    name: 'Quality Generation',
    description: 'Use Claude for all tasks - highest quality',
    config: {
      planning: 'claude',
      architecture: 'claude',
      database: 'claude',
      backend: 'claude',
      frontend: 'claude',
      testing: 'claude'
    }
  },
  hybrid: {
    name: 'Hybrid Generation',
    description: 'Balance speed and quality - Claude for critical tasks, Cerebras for routine code',
    config: {
      planning: 'claude',
      architecture: 'claude',
      database: 'claude',
      backend: 'cerebras',
      frontend: 'cerebras',
      testing: 'cerebras'
    }
  }
;

/**
 * Default engine configuration for custom mode
 */
const DEFAULT_ENGINE_CONFIG = {
  planning: 'claude',
  architecture: 'claude',
  database: 'claude',
  backend: 'cerebras',
  frontend: 'cerebras',
  testing: 'cerebras'
;

/**
 * Generation pipeline that orchestrates multiple AI engines
 */
class GenerationPipeline {
  constructor(engineConfig = DEFAULT_ENGINE_CONFIG) {
    this.engineConfig = engineConfig;
    this.progressCallback = null;
  }

  /**
   * Set progress callback for real-time updates
   */
  onProgress(callback) {
    this.progressCallback = callback;
    return this;
  }

  /**
   * Report progress to callback if set
   */
  reportProgress(phase, message, data = {}) {
    if (this.progressCallback) {
      this.progressCallback({
        phase,
        message,
        timestamp: new Date().toISOString(),
        ...data
      });
    }
  }

  /**
   * Run a single generation phase with specified engine
   */
  async runPhase(phaseName, prompt, options = {}) {
    const engineName = this.engineConfig[phaseName] || 'claude';
    const engine = getEngine(engineName);

    this.reportProgress(phaseName, `Starting ${phaseName} with ${engine.name}...`, {
      engine: engineName
    });

    const startTime = Date.now();

    try {
      const result = await engine.generate(prompt, options);

      const elapsed = Date.now() - startTime;
      this.reportProgress(phaseName, `Completed ${phaseName} in ${elapsed}ms`, {
        engine: engineName,
        elapsed,
        tokens: result.tokens
      });

      return {
        ...result,
        phase: phaseName,
        engine: engineName
      ;
    } catch (error) {
      this.reportProgress(phaseName, `Error in ${phaseName}: ${error.message}`, {
        engine: engineName,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate complete project using configured engines
   */
  async generateProject(config) {
    const results = {
      phases: {},
      totalTokens: { input: 0, output: 0 },
      totalElapsed: 0,
      enginesUsed: {}
    ;

    const startTime = Date.now();

    try {
      // Phase 1: Planning
      this.reportProgress('planning', 'Creating project plan and architecture...');
      const planningResult = await this.runPhase('planning',
        this.buildPlanningPrompt(config),
        { systemPrompt: 'You are an expert software architect. Create a detailed project plan.' }
      );
      results.phases.planning = planningResult;

      // Phase 2: Database Schema
      this.reportProgress('database', 'Designing database schema...');
      const databaseResult = await this.runPhase('database',
        this.buildDatabasePrompt(config, planningResult.content),
        { systemPrompt: 'You are a database expert. Design an efficient, normalized schema.' }
      );
      results.phases.database = databaseResult;

      // Phase 3: Backend Code
      this.reportProgress('backend', 'Generating backend API code...');
      const backendResult = await this.runPhase('backend',
        this.buildBackendPrompt(config, planningResult.content, databaseResult.content),
        { systemPrompt: 'You are a backend developer. Generate clean, RESTful API code.' }
      );
      results.phases.backend = backendResult;

      // Phase 4: Frontend Code
      this.reportProgress('frontend', 'Generating frontend UI code...');
      const frontendResult = await this.runPhase('frontend',
        this.buildFrontendPrompt(config, planningResult.content, backendResult.content),
        { systemPrompt: 'You are a frontend developer. Generate modern, responsive UI code.' }
      );
      results.phases.frontend = frontendResult;

      // Phase 5: Testing
      this.reportProgress('testing', 'Generating test suites...');
      const testingResult = await this.runPhase('testing',
        this.buildTestingPrompt(config, backendResult.content, frontendResult.content),
        { systemPrompt: 'You are a QA engineer. Generate comprehensive test coverage.' }
      );
      results.phases.testing = testingResult;

      // Calculate totals
      for (const [phase, result] of Object.entries(results.phases)) {
        results.totalTokens.input += result.tokens.input;
        results.totalTokens.output += result.tokens.output;
        results.enginesUsed[result.engine] = (results.enginesUsed[result.engine] || 0) + 1;
      }

      results.totalElapsed = Date.now() - startTime;

      this.reportProgress('complete', 'Project generation completed!', {
        totalElapsed: results.totalElapsed,
        totalTokens: results.totalTokens,
        enginesUsed: results.enginesUsed
      });

      return results;

    } catch (error) {
      this.reportProgress('error', `Generation failed: ${error.message}`, {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Build prompts for each phase
   */
  buildPlanningPrompt(config) {
    return `Create a detailed plan for a ${config.industry || 'web'} application with the following requirements:

Name: ${config.name || 'Untitled Project'}
Description: ${config.description || 'No description provided'}
Features: ${config.features?.join(', ') || 'None specified'}
Multi-tenant: ${config.multiTenant ? 'Yes' : 'No'}
Authentication: ${config.authentication || 'Basic'}
Integrations: ${config.integrations?.join(', ') || 'None'}

Provide:
1. System architecture overview
2. Technology stack recommendations
3. Component breakdown
4. Data flow diagram (textual)
5. Key technical decisions`;
  }

  buildDatabasePrompt(config, plan) {
    return `Based on this project plan:

${plan}

Design a complete database schema including:
1. All necessary tables with fields and types
2. Relationships and foreign keys
3. Indexes for performance
4. Sample seed data

Use PostgreSQL syntax. Consider ${config.multiTenant ? 'multi-tenant architecture with tenant isolation' : 'single-tenant architecture'}.`;
  }

  buildBackendPrompt(config, plan, schema) {
    return `Based on this plan and database schema:

PLAN:
${plan}

SCHEMA:
${schema}

Generate a complete Node.js/Express backend with:
1. RESTful API endpoints for all features
2. Database integration with Prisma/Knex
3. ${config.authentication || 'Basic'} authentication
4. Input validation and error handling
5. API documentation

Features to implement: ${config.features?.join(', ') || 'Standard CRUD operations'}`;
  }

  buildFrontendPrompt(config, plan, backend) {
    return `Based on this plan and backend API:

PLAN:
${plan}

BACKEND API:
${backend}

Generate a complete React/Next.js frontend with:
1. Modern, responsive UI using Tailwind CSS
2. All pages and components for the features
3. API integration with the backend
4. Form validation and error handling
5. Loading states and user feedback

Features to implement: ${config.features?.join(', ') || 'Standard UI'}
Industry styling: ${config.industry || 'modern web application'}`;
  }

  buildTestingPrompt(config, backend, frontend) {
    return `Based on this backend and frontend code:

BACKEND:
${backend.substring(0, 2000)}...

FRONTEND:
${frontend.substring(0, 2000)}...

Generate comprehensive test suites:
1. Backend unit tests (Jest)
2. API integration tests
3. Frontend component tests (React Testing Library)
4. E2E tests (Playwright)
5. Test data fixtures

Cover all major features: ${config.features?.join(', ') || 'All functionality'}`;
  }

  /**
   * Get configuration info
   */
  getConfig() {
    return {
      engineConfig: this.engineConfig,
      engines: Object.entries(this.engineConfig).map(([phase, engineName]) => ({
        phase,
        engine: engineName,
        info: getEngine(engineName).getInfo()
      }))
    ;
  }

  /**
   * Estimate cost and time for generation
   */
  estimateGeneration(config) {
    const estimates = {
      phases: {},
      totalCost: 0,
      totalTime: 0,
      breakdown: []
    ;

    // Estimated token counts per phase (rough averages)
    const phaseEstimates = {
      planning: { input: 500, output: 2000, time: 30 },
      database: { input: 1000, output: 1500, time: 25 },
      backend: { input: 2000, output: 5000, time: 60 },
      frontend: { input: 2000, output: 6000, time: 70 },
      testing: { input: 3000, output: 3000, time: 40 }
    ;

    for (const [phase, estimate] of Object.entries(phaseEstimates)) {
      const engineName = this.engineConfig[phase];
      const engine = getEngine(engineName);
      const info = engine.getInfo();

      const totalTokens = estimate.input + estimate.output;
      const cost = (totalTokens / 1000) * info.costPer1kTokens;

      estimates.phases[phase] = {
        engine: engineName,
        tokens: estimate,
        cost,
        time: estimate.time
      ;

      estimates.totalCost += cost;
      estimates.totalTime += estimate.time;

      estimates.breakdown.push({
        phase,
        engine: engineName,
        speed: info.speed,
        quality: info.quality,
        cost: `$${cost.toFixed(4)}`,
        time: `~${estimate.time}s`
      });
    }

    estimates.totalCost = `$${estimates.totalCost.toFixed(4)}`;
    estimates.totalTime = `~${Math.ceil(estimates.totalTime / 60)} minutes`;

    return estimates;
  }
}

/**
 * Create pipeline from preset name
 */
function createPipelineFromPreset(presetName) {
  const preset = PRESETS[presetName];
  if (!preset) {
    throw new Error(`Unknown preset: ${presetName}. Available: ${Object.keys(PRESETS).join(', ')}`);
  }
  return new GenerationPipeline(preset.config);
}

export {
  GenerationPipeline,
  PRESETS,
  DEFAULT_ENGINE_CONFIG,
  createPipelineFromPreset,
  getAllEngines
;
