"use client";

import Link from "next/link";
import React, { useEffect, useState, useRef } from "react";
import { useWizard } from "@/lib/wizardContext";

const STEPS = ["Describe", "Configure", "Generate", "Deploy"];
const INDUSTRIES = ["SaaS", "E-commerce", "Healthcare", "Finance", "Education", "Other"];

function ConnectionStatus({ isConnected, onTest }: { isConnected: boolean; onTest: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
      <span className="text-sm text-slate-500 dark:text-slate-400">
        {isConnected ? "Backend connected" : "Backend disconnected"}
      </span>
      <button onClick={onTest} className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
        Test
      </button>
    </div>
  );
}

function ProgressSteps({ currentStep }: { currentStep: number }) {
  return (
    <div className="mb-12">
      <div className="flex items-center justify-between">
        {STEPS.map((stepName, index) => (
          <div key={stepName} className="flex items-center">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
              index + 1 < currentStep ? "bg-green-500 text-white" : index + 1 === currentStep ? "bg-indigo-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-500"
            }`}>
              {index + 1 < currentStep ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              ) : index + 1}
            </div>
            <span className={`ml-2 text-sm font-medium hidden sm:inline ${index + 1 === currentStep ? "text-indigo-600" : index + 1 < currentStep ? "text-green-600" : "text-slate-500"}`}>
              {stepName}
            </span>
            {index < STEPS.length - 1 && <div className={`w-8 sm:w-16 lg:w-24 h-0.5 mx-2 ${index + 1 < currentStep ? "bg-green-500" : "bg-slate-200 dark:bg-slate-700"}`} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function Step1Describe() {
  const { data, updateData, createProject, isLoading, error, setStep, isConnected, checkConnection } = useWizard();
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => { checkConnection(); }, [checkConnection]);

  const handleSubmit = async () => {
    setLocalError(null);
    if (!data.appName.trim()) { setLocalError("Please enter an application name"); return; }
    if (!data.description.trim()) { setLocalError("Please describe your application"); return; }
    const project = await createProject();
    if (project) setStep(2);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Describe Your Application</h1>
          <p className="text-slate-600 dark:text-slate-300">Tell us what you want to build.</p>
        </div>
        <ConnectionStatus isConnected={isConnected} onTest={checkConnection} />
      </div>
      {(error || localError) && <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300">{error || localError}</div>}
      <div className="space-y-6">
        <div>
          <label htmlFor="appName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Application Name *</label>
          <input type="text" id="appName" value={data.appName} onChange={(e) => updateData({ appName: e.target.value })} placeholder="e.g., Customer Portal" className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Describe Your Application *</label>
          <textarea id="description" rows={6} value={data.description} onChange={(e) => updateData({ description: e.target.value })} placeholder="I need a REST API with CRUD operations..." className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 resize-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Industry (Optional)</label>
          <div className="flex flex-wrap gap-2">
            {INDUSTRIES.map((industry) => (
              <button key={industry} type="button" onClick={() => updateData({ industry: data.industry === industry ? "" : industry })} className={`px-4 py-2 rounded-lg border transition-colors ${data.industry === industry ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"}`}>
                {industry}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-8 flex justify-end">
        <button onClick={handleSubmit} disabled={isLoading || !isConnected} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-semibold transition-colors">
          {isLoading ? (<><svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Creating...</>) : (<>Continue<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg></>)}
        </button>
      </div>
    </div>
  );
}

function Step2Configure() {
  const { data, updateData, project, setStep } = useWizard();
  const features = ["User Authentication", "Role-Based Access", "REST API", "Data Validation", "Error Handling", "Logging", "Health Checks"];
  const toggleFeature = (f: string) => updateData({ features: data.features.includes(f) ? data.features.filter((x) => x !== f) : [...data.features, f] });

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-700">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Configure Features</h1>
      <p className="text-slate-600 dark:text-slate-300 mb-6">Select features for your application.</p>
      {project && <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-300">Project: <strong>{project.name}</strong></div>}

      {/* Features Section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Application Features</h2>
        <div className="grid grid-cols-2 gap-3">
          {features.map((f) => (
            <button key={f} onClick={() => toggleFeature(f)} className={`p-3 rounded-xl border text-left ${data.features.includes(f) ? "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 text-indigo-700" : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"}`}>
              <div className="flex items-center gap-2"><div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${data.features.includes(f) ? "bg-indigo-600 border-indigo-600" : "border-slate-300"}`}>{data.features.includes(f) && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}</div>{f}</div>
            </button>
          ))}
        </div>
        <label className="flex items-center gap-3 cursor-pointer mt-4"><input type="checkbox" checked={data.multiTenant} onChange={(e) => updateData({ multiTenant: e.target.checked })} className="w-5 h-5 rounded border-slate-300 text-indigo-600" /><span className="text-slate-700 dark:text-slate-300">Enable Multi-Tenant Architecture</span></label>
      </div>

      <div className="flex justify-between">
        <button onClick={() => setStep(1)} className="px-6 py-3 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700">Back</button>
        <button onClick={() => setStep(3)} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold">Continue<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg></button>
      </div>
    </div>
  );
}

// Feature descriptions for the summary
const FEATURE_DESCRIPTIONS: Record<string, string> = {
  "User Authentication": "JWT-based login/signup system with secure password hashing",
  "Role-Based Access": "Admin, Manager, User role permissions with route protection",
  "REST API": "RESTful endpoints with proper HTTP methods and status codes",
  "Data Validation": "Input validation on all endpoints using Zod schemas",
  "Error Handling": "Try-catch blocks with structured error responses",
  "Logging": "Structured JSON logging with Winston and request tracing",
  "Health Checks": "/health and /ready endpoints for monitoring",
  "Multi-Tenant": "Organization-based data isolation with PostgreSQL RLS",
};

// What will be generated
const GENERATION_OUTPUTS = [
  { name: "Frontend", desc: "React/Next.js with Tailwind CSS", icon: "layout" },
  { name: "Backend API", desc: "Node.js/Express with TypeScript", icon: "server" },
  { name: "Database Schema", desc: "PostgreSQL with Row-Level Security", icon: "database" },
  { name: "Authentication System", desc: "JWT + bcrypt", icon: "shield" },
  { name: "API Documentation", desc: "OpenAPI/Swagger", icon: "file-text" },
  { name: "Unit Tests", desc: "Jest", icon: "check-circle" },
  { name: "Integration Tests", desc: "Supertest", icon: "check-circle" },
  { name: "Docker Configuration", desc: "docker-compose.yml", icon: "box" },
  { name: "CI/CD Pipeline", desc: "GitHub Actions", icon: "git-branch" },
  { name: "Environment Config", desc: ".env.example", icon: "settings" },
  { name: "README & Docs", desc: "Complete documentation", icon: "book" },
];

// Generation phases matching backend
const GENERATION_PHASES = [
  { id: "analyzing", label: "Analyzing requirements" },
  { id: "database", label: "Generating database schema" },
  { id: "backend", label: "Creating backend API" },
  { id: "frontend", label: "Building frontend components" },
  { id: "auth", label: "Setting up authentication" },
  { id: "multitenancy", label: "Configuring multi-tenancy" },
  { id: "tests", label: "Writing tests" },
  { id: "docs", label: "Creating documentation" },
  { id: "cicd", label: "Setting up CI/CD" },
  { id: "finalizing", label: "Finalizing project" },
];

// Calculate dynamic estimates based on selected features
function calculateEstimates(config: { features: string[]; multiTenant: boolean }) {
  let baseTime = 10; // minutes
  let baseFiles = 15;
  let baseLines = 1500;

  // Add time/complexity for each feature
  if (config.features.includes("User Authentication")) {
    baseTime += 3;
    baseFiles += 5;
    baseLines += 400;
  }
  if (config.features.includes("Role-Based Access")) {
    baseTime += 2;
    baseFiles += 3;
    baseLines += 300;
  }
  if (config.features.includes("REST API")) {
    baseTime += 2;
    baseFiles += 4;
    baseLines += 350;
  }
  if (config.features.includes("Data Validation")) {
    baseTime += 1;
    baseFiles += 2;
    baseLines += 200;
  }
  if (config.features.includes("Error Handling")) {
    baseTime += 1;
    baseFiles += 2;
    baseLines += 150;
  }
  if (config.features.includes("Logging")) {
    baseTime += 1;
    baseFiles += 2;
    baseLines += 150;
  }
  if (config.features.includes("Health Checks")) {
    baseTime += 1;
    baseFiles += 1;
    baseLines += 100;
  }
  if (config.multiTenant) {
    baseTime += 5;
    baseFiles += 8;
    baseLines += 600;
  }

  return {
    time: `${baseTime}-${baseTime + 10} min`,
    files: `~${baseFiles}-${baseFiles + 15}`,
    lines: `~${baseLines.toLocaleString()}-${(baseLines + 1000).toLocaleString()}`,
  };
}

interface LogEntry {
  id: string;
  type: "info" | "success" | "thinking" | "error" | "warning";
  message: string;
  timestamp: Date;
}

interface PhaseStatus {
  id: string;
  status: "pending" | "in_progress" | "completed" | "error";
  label: string;
}

interface GenerationStats {
  tablesCreated: number;
  filesGenerated: number;
  linesOfCode: number;
}

function Step3Generate() {
  const { data, project, startGeneration, isLoading, error, setStep, setError } = useWizard();
  const [started, setStarted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phases, setPhases] = useState<PhaseStatus[]>(
    GENERATION_PHASES.map((p) => ({ ...p, status: "pending" as const }))
  );
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<GenerationStats>({ tablesCreated: 0, filesGenerated: 0, linesOfCode: 0 });
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // State for elapsed time display
  const [elapsedTime, setElapsedTime] = useState(0);

  // Update elapsed time every second
  useEffect(() => {
    if (!startTime) return;
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  // Format elapsed time as mm:ss
  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate estimated time remaining
  const getTimeRemaining = () => {
    if (!startTime || progress === 0) return "Calculating...";
    const elapsed = (Date.now() - startTime.getTime()) / 1000;
    const estimated = (elapsed / progress) * 100;
    const remaining = Math.max(0, estimated - elapsed);
    if (remaining < 60) return `~${Math.ceil(remaining)}s remaining`;
    return `~${Math.ceil(remaining / 60)}m ${Math.ceil(remaining % 60)}s remaining`;
  };

  const handleGenerate = async () => {
    setStarted(true);
    setStartTime(new Date());
    setGenerationError(null);
    setLogs([]);
    setProgress(0);
    setPhases(GENERATION_PHASES.map((p) => ({ ...p, status: "pending" as const })));
    setStats({ tablesCreated: 0, filesGenerated: 0, linesOfCode: 0 });

    // Connect to SSE endpoint for real-time updates
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
    const eventSource = new EventSource(`${baseUrl}/generate/${project?.id}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "connected":
            setLogs((prev) => [...prev, {
              id: crypto.randomUUID(),
              type: "info",
              message: "Connected to generation server",
              timestamp: new Date(),
            }]);
            break;

          case "state":
            // Initial state sync from backend
            if (data.phases) {
              setPhases(data.phases.map((p: { id: string; label: string; status: string }) => ({
                id: p.id,
                label: p.label,
                status: p.status as PhaseStatus["status"],
              })));
            }
            if (data.progress) setProgress(data.progress);
            if (data.stats) {
              setStats({
                tablesCreated: data.stats.tables || 0,
                filesGenerated: (data.stats.backendFiles || 0) + (data.stats.frontendFiles || 0) + (data.stats.testFiles || 0),
                linesOfCode: data.stats.linesOfCode || 0,
              });
            }
            break;

          case "phase":
            // Phase update from backend - format: { phaseId, status, progress, phases }
            if (data.phases) {
              setPhases(data.phases.map((p: { id: string; label: string; status: string }) => ({
                id: p.id,
                label: p.label,
                status: p.status as PhaseStatus["status"],
              })));
            }
            if (data.progress !== undefined) setProgress(data.progress);
            break;

          case "log":
            // Log entry from backend - format: { log: { timestamp, message, type } }
            if (data.log) {
              setLogs((prev) => [...prev, {
                id: crypto.randomUUID(),
                type: (data.log.type || "info") as LogEntry["type"],
                message: data.log.message,
                timestamp: new Date(data.log.timestamp),
              }]);
            }
            break;

          case "stats":
            if (data.stats) {
              setStats({
                tablesCreated: data.stats.tables || 0,
                filesGenerated: (data.stats.backendFiles || 0) + (data.stats.frontendFiles || 0) + (data.stats.testFiles || 0),
                linesOfCode: data.stats.linesOfCode || 0,
              });
            }
            break;

          case "complete":
            setProgress(100);
            setPhases((prev) => prev.map((p) => ({ ...p, status: "completed" as const })));
            setLogs((prev) => [...prev, {
              id: crypto.randomUUID(),
              type: "success",
              message: `Generation completed in ${Math.round((data.duration || 0) / 1000)}s!`,
              timestamp: new Date(),
            }]);
            eventSource.close();
            setTimeout(() => setStep(4), 1500);
            break;

          case "error":
            setGenerationError(data.error || data.message || "Generation failed");
            eventSource.close();
            break;

          case "cancelled":
            setGenerationError("Generation was cancelled");
            eventSource.close();
            break;
        }
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      // Fallback: try the regular generation API
      startGenerationFallback();
    };

    // Also trigger the actual generation
    const ok = await startGeneration();
    if (!ok && !generationError) {
      eventSource.close();
      setGenerationError(error || "Generation failed");
    }
  };

  // Fallback for when SSE doesn't work
  const startGenerationFallback = async () => {
    // Simulate progress locally if SSE fails
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.random() * 8;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
      }
      setProgress(Math.min(currentProgress, 95));

      // Simulate phase updates
      const phaseIndex = Math.floor((currentProgress / 100) * GENERATION_PHASES.length);
      setPhases((prev) =>
        prev.map((p, i) => ({
          ...p,
          status: i < phaseIndex ? "completed" : i === phaseIndex ? "in_progress" : "pending",
        }))
      );
    }, 800);

    const ok = await startGeneration();
    clearInterval(interval);

    if (ok) {
      setProgress(100);
      setPhases((prev) => prev.map((p) => ({ ...p, status: "completed" })));
      setTimeout(() => setStep(4), 1000);
    } else {
      setGenerationError(error || "Generation failed");
    }
  };

  const handleRetry = () => {
    setGenerationError(null);
    setError(null);
    handleGenerate();
  };

  // Icon component for reusability
  const Icon = ({ name, className = "w-5 h-5" }: { name: string; className?: string }) => {
    const icons: Record<string, JSX.Element> = {
      layout: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />,
      server: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />,
      database: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />,
      shield: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />,
      "file-text": <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
      "check-circle": <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
      box: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />,
      "git-branch": <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />,
      settings: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />,
      book: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />,
    };
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">{icons[name]}</svg>;
  };

  // Get log icon based on type
  const getLogIcon = (type: LogEntry["type"]) => {
    switch (type) {
      case "success":
        return <span className="text-green-500">✓</span>;
      case "thinking":
        return <span className="text-purple-500 animate-pulse">🧠</span>;
      case "error":
        return <span className="text-red-500">✗</span>;
      case "warning":
        return <span className="text-amber-500">⚠</span>;
      default:
        return <span className="text-blue-500">→</span>;
    }
  };

  // Get log text color based on type
  const getLogColor = (type: LogEntry["type"]) => {
    switch (type) {
      case "success":
        return "text-green-400";
      case "thinking":
        return "text-purple-400";
      case "error":
        return "text-red-400";
      case "warning":
        return "text-amber-400";
      default:
        return "text-slate-400";
    }
  };

  if (started) {
    return (
      <div className="space-y-6">
        {/* Header with progress */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="animate-spin w-8 h-8 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Generating {project?.name}</h1>
                <p className="text-slate-600 dark:text-slate-400">AI is building your production-ready application</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{Math.round(progress)}%</div>
              <div className="text-sm text-slate-500">{getTimeRemaining()}</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="relative">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500 ease-out relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </div>
            </div>
            {/* Glowing effect */}
            <div
              className="absolute top-0 h-4 w-8 bg-white/50 blur-sm rounded-full transition-all duration-500"
              style={{ left: `calc(${Math.min(progress, 96)}% - 16px)` }}
            />
          </div>
        </div>

        {/* Error state */}
        {generationError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-800 dark:text-red-300">Generation Failed</h3>
                <p className="text-red-700 dark:text-red-400 mt-1">{generationError}</p>
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={handleRetry}
                    className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Retry Generation
                  </button>
                  <button
                    onClick={() => { setStarted(false); setGenerationError(null); }}
                    className="px-4 py-2 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg font-medium transition-colors"
                  >
                    Back to Review
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main content: Phases + Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Generation Phases */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Generation Phases
            </h2>
            <div className="space-y-3">
              {phases.map((phase) => (
                <div key={phase.id} className="flex items-center gap-3">
                  {/* Status icon */}
                  <div className="w-6 h-6 flex items-center justify-center">
                    {phase.status === "completed" ? (
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : phase.status === "in_progress" ? (
                      <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                        <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      </div>
                    ) : phase.status === "error" ? (
                      <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-slate-300 dark:border-slate-600" />
                    )}
                  </div>
                  {/* Phase label */}
                  <span className={`flex-1 ${
                    phase.status === "completed" ? "text-green-600 dark:text-green-400" :
                    phase.status === "in_progress" ? "text-indigo-600 dark:text-indigo-400 font-medium" :
                    phase.status === "error" ? "text-red-600 dark:text-red-400" :
                    "text-slate-500 dark:text-slate-400"
                  }`}>
                    {phase.label}
                  </span>
                  {phase.status === "in_progress" && (
                    <span className="text-xs text-indigo-500 animate-pulse">Processing...</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* AI Thinking Stream */}
          <div className="bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-700">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="animate-pulse">🧠</span>
              AI Thinking Stream
            </h2>
            <div
              ref={logContainerRef}
              className="h-64 overflow-y-auto font-mono text-sm space-y-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800"
            >
              {logs.length === 0 ? (
                <div className="text-slate-500 italic">Waiting for AI to start...</div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2">
                    <span className="text-slate-600 text-xs w-16 flex-shrink-0">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                    <span className="flex-shrink-0">{getLogIcon(log.type)}</span>
                    <span className={getLogColor(log.type)}>{log.message}</span>
                  </div>
                ))
              )}
              {/* Blinking cursor */}
              <div className="flex items-center gap-1 text-indigo-400">
                <span className="animate-pulse">▌</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Progress Stats - Always visible */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Live Progress
          </h2>
          <div className="grid grid-cols-4 gap-4">
            {/* Time Elapsed */}
            <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-100 dark:border-amber-800">
              <div className="text-3xl font-bold text-amber-600 dark:text-amber-400 font-mono">{formatElapsedTime(elapsedTime)}</div>
              <div className="text-sm text-amber-700 dark:text-amber-300 mt-1">Time Elapsed</div>
            </div>
            {/* Files Generated */}
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl border border-purple-100 dark:border-purple-800">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.filesGenerated}</div>
              <div className="text-sm text-purple-700 dark:text-purple-300 mt-1">Files Generated</div>
            </div>
            {/* Lines of Code */}
            <div className="text-center p-4 bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 rounded-xl border border-pink-100 dark:border-pink-800">
              <div className="text-3xl font-bold text-pink-600 dark:text-pink-400">{stats.linesOfCode.toLocaleString()}</div>
              <div className="text-sm text-pink-700 dark:text-pink-300 mt-1">Lines Written</div>
            </div>
            {/* Tables Created */}
            <div className="text-center p-4 bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-900/20 dark:to-teal-900/20 rounded-xl border border-cyan-100 dark:border-cyan-800">
              <div className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">{stats.tablesCreated}</div>
              <div className="text-sm text-cyan-700 dark:text-cyan-300 mt-1">Tables Created</div>
            </div>
          </div>
        </div>

        {/* Fun facts while waiting */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-6 border border-indigo-100 dark:border-indigo-800">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-xl">💡</span>
            </div>
            <div>
              <h3 className="font-medium text-indigo-900 dark:text-indigo-300">Did you know?</h3>
              <p className="text-sm text-indigo-700 dark:text-indigo-400 mt-1">
                The AI is generating production-ready code with proper error handling, validation, tests, and documentation.
                This would typically take a developer several days to write manually!
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Review & Generate</h1>
        <p className="text-slate-600 dark:text-slate-300">Review your configuration before generating production-ready code.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Project Overview */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Project Overview</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-start gap-4">
            <span className="text-sm text-slate-500 dark:text-slate-400 w-24 flex-shrink-0">Name</span>
            <span className="text-slate-900 dark:text-white font-medium">{data.appName || project?.name}</span>
          </div>
          {data.industry && (
            <div className="flex items-start gap-4">
              <span className="text-sm text-slate-500 dark:text-slate-400 w-24 flex-shrink-0">Industry</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300">
                {data.industry}
              </span>
            </div>
          )}
          <div className="flex items-start gap-4">
            <span className="text-sm text-slate-500 dark:text-slate-400 w-24 flex-shrink-0">Description</span>
            <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{data.description}</p>
          </div>
        </div>
      </div>

      {/* Selected Features */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Selected Features</h2>
          <span className="ml-auto text-sm text-slate-500">{data.features.length + (data.multiTenant ? 1 : 0)} features</span>
        </div>
        <div className="space-y-2">
          {data.features.map((feature) => (
            <div key={feature} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <span className="font-medium text-slate-900 dark:text-white">{feature}</span>
                <p className="text-sm text-slate-500 dark:text-slate-400">{FEATURE_DESCRIPTIONS[feature]}</p>
              </div>
            </div>
          ))}
          {data.multiTenant && (
            <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <span className="font-medium text-slate-900 dark:text-white">Multi-Tenant Architecture</span>
                <p className="text-sm text-slate-500 dark:text-slate-400">{FEATURE_DESCRIPTIONS["Multi-Tenant"]}</p>
              </div>
            </div>
          )}
          {data.features.length === 0 && !data.multiTenant && (
            <p className="text-slate-500 dark:text-slate-400 text-sm italic">No additional features selected</p>
          )}
        </div>
      </div>

      {/* What Will Be Generated */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">What Will Be Generated</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {GENERATION_OUTPUTS.map((output) => (
            <div key={output.name} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
              <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon name={output.icon} className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{output.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{output.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Estimates & Output Location */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Estimates */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Estimates</h2>
          </div>
          {(() => {
            const estimates = calculateEstimates(data);
            return (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Generation Time</span>
                  <span className="font-medium text-slate-900 dark:text-white">{estimates.time}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Lines of Code</span>
                  <span className="font-medium text-slate-900 dark:text-white">{estimates.lines}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Files Generated</span>
                  <span className="font-medium text-slate-900 dark:text-white">{estimates.files}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                  Estimates vary based on AI response time and selected features
                </p>
              </div>
            );
          })()}
        </div>

        {/* Output Location */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-900/50 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Output Location</h2>
          </div>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-slate-600 dark:text-slate-400">Local Folder</span>
              <p className="font-mono text-sm text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-700 rounded px-2 py-1 mt-1 break-all">
                /generated-apps/{project?.id || "[project-id]"}
              </p>
            </div>
            <div>
              <span className="text-sm text-slate-600 dark:text-slate-400">GitHub Repository</span>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Will be created on request</p>
            </div>
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <h3 className="text-xl font-bold text-white mb-1">Ready to Generate?</h3>
            <p className="text-indigo-100">AI will create your complete application based on the configuration above.</p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="inline-flex items-center gap-3 bg-white hover:bg-indigo-50 disabled:bg-white/80 disabled:cursor-not-allowed text-indigo-600 px-8 py-4 rounded-xl font-bold text-lg shadow-lg transition-all hover:shadow-xl hover:scale-105"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Start Generation
          </button>
        </div>
      </div>

      {/* Back button */}
      <div className="flex justify-start">
        <button
          onClick={() => setStep(2)}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
          </svg>
          Back to Configure
        </button>
      </div>
    </div>
  );
}

interface DeploymentStatus {
  status: 'stopped' | 'starting' | 'running' | 'error';
  urls: { frontend: string | null; backend: string | null } | null;
  pids?: { frontend: number | null; backend: number | null };
  error?: string;
}

function Step4Deploy() {
  const { project, reset, setStep } = useWizard();
  const isSuccess = project?.status === "deployed";
  const isFailed = project?.status === "failed";

  // Deployment state
  const [deployMethod, setDeployMethod] = useState<'local' | 'docker' | null>(null);
  const [deployStatus, setDeployStatus] = useState<DeploymentStatus>({ status: 'stopped', urls: null });
  const [isDeploying, setIsDeploying] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<{ backend: string[]; frontend: string[] }>({ backend: [], frontend: [] });

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  // Check deployment status on mount
  useEffect(() => {
    if (project?.id) {
      checkDeploymentStatus();
    }
  }, [project?.id]);

  const checkDeploymentStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/deploy/${project?.id}/status`);
      const data = await res.json();
      if (data.success) {
        setDeployStatus({
          status: data.status,
          urls: data.urls,
          pids: data.pids
        });
      }
    } catch {
      // Ignore errors - just means no deployment running
    }
  };

  const [installPhase, setInstallPhase] = useState<string>('');

  const handleDeployLocal = async () => {
    if (!project?.id) return;
    setIsDeploying(true);
    setDeployMethod('local');
    setDeployStatus({ status: 'starting', urls: null });
    setInstallPhase('Installing dependencies...');

    try {
      const res = await fetch(`${API_URL}/deploy/${project.id}/local`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backendPort: 5000,
          frontendPort: 3000,
          skipInstall: false
        })
      });

      const data = await res.json();

      if (data.success) {
        setInstallPhase('');
        // If status is 'starting', poll until running
        if (data.status === 'starting') {
          setDeployStatus({
            status: 'starting',
            urls: data.urls,
            pids: data.pids
          });
          // Poll for actual running status
          const pollStatus = setInterval(async () => {
            try {
              const statusRes = await fetch(`${API_URL}/deploy/${project.id}/status`);
              const statusData = await statusRes.json();
              if (statusData.success && statusData.status === 'running') {
                clearInterval(pollStatus);
                setDeployStatus({
                  status: 'running',
                  urls: statusData.urls,
                  pids: statusData.pids
                });
                setIsDeploying(false);
              }
            } catch {
              // Keep polling
            }
          }, 2000);
          // Stop polling after 30 seconds
          setTimeout(() => {
            clearInterval(pollStatus);
            setIsDeploying(false);
          }, 30000);
          return;
        }
        setDeployStatus({
          status: 'running',
          urls: data.urls,
          pids: data.pids
        });
      } else {
        setInstallPhase('');
        setDeployStatus({
          status: 'error',
          urls: null,
          error: data.error
        });
      }
    } catch (error) {
      setInstallPhase('');
      setDeployStatus({
        status: 'error',
        urls: null,
        error: error instanceof Error ? error.message : 'Failed to start deployment'
      });
    } finally {
      if (installPhase) setInstallPhase('');
      setIsDeploying(false);
    }
  };

  const handleDeployDocker = async () => {
    if (!project?.id) return;
    setIsDeploying(true);
    setDeployMethod('docker');
    setDeployStatus({ status: 'starting', urls: null });

    try {
      const res = await fetch(`${API_URL}/deploy/${project.id}/docker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await res.json();

      if (data.success) {
        setDeployStatus({
          status: 'running',
          urls: data.urls
        });
      } else {
        setDeployStatus({
          status: 'error',
          urls: null,
          error: data.error
        });
      }
    } catch (error) {
      setDeployStatus({
        status: 'error',
        urls: null,
        error: error instanceof Error ? error.message : 'Failed to start Docker deployment'
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const handleStop = async () => {
    if (!project?.id) return;
    setIsDeploying(true);

    try {
      await fetch(`${API_URL}/deploy/${project.id}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stopDocker: deployMethod === 'docker' })
      });

      setDeployStatus({ status: 'stopped', urls: null });
      setDeployMethod(null);
    } catch (error) {
      console.error('Stop error:', error);
    } finally {
      setIsDeploying(false);
    }
  };

  const fetchLogs = async () => {
    if (!project?.id) return;
    try {
      const res = await fetch(`${API_URL}/deploy/${project.id}/logs`);
      const data = await res.json();
      if (data.success && data.logs) {
        setLogs({
          backend: data.logs.backend?.map((l: { message: string }) => l.message) || [],
          frontend: data.logs.frontend?.map((l: { message: string }) => l.message) || []
        });
      }
    } catch {
      // Ignore
    }
  };

  // Auto-refresh logs when showing
  useEffect(() => {
    if (showLogs && deployStatus.status === 'running') {
      fetchLogs();
      const interval = setInterval(fetchLogs, 3000);
      return () => clearInterval(interval);
    }
  }, [showLogs, deployStatus.status]);

  // If starting, show installation progress
  if (deployStatus.status === 'starting') {
    return (
      <div className="space-y-6">
        {/* Starting Status Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-8 shadow-lg text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="animate-spin w-10 h-10 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold">Starting Application...</h2>
              <p className="text-amber-100 mt-1">{installPhase || 'Starting servers...'}</p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Deployment Progress</h3>
          <div className="space-y-3">
            {[
              { step: 'Installing backend dependencies', done: !installPhase.includes('backend') },
              { step: 'Installing frontend dependencies', done: !installPhase.includes('frontend') && !installPhase.includes('backend') },
              { step: 'Starting backend server on port 5000', done: false },
              { step: 'Starting frontend server on port 3000', done: false },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                {item.done ? (
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : i === 0 || (i > 0 && !installPhase) ? (
                  <div className="w-6 h-6 border-2 border-amber-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  </div>
                ) : (
                  <div className="w-6 h-6 border-2 border-slate-300 dark:border-slate-600 rounded-full" />
                )}
                <span className={item.done ? 'text-green-600' : 'text-slate-600 dark:text-slate-400'}>{item.step}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-slate-500 dark:text-slate-400 text-sm">
          This may take a few minutes while npm installs dependencies...
        </p>
      </div>
    );
  }

  // If running, show the running status view
  if (deployStatus.status === 'running') {
    return (
      <div className="space-y-6">
        {/* Running Status Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-8 shadow-lg text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-8 h-8 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold">Application Running!</h1>
              <p className="text-green-100">Your application is now running locally</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="w-3 h-3 bg-green-300 rounded-full animate-pulse" />
              <span className="text-sm font-medium">Live</span>
            </div>
          </div>
        </div>

        {/* URLs Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Application URLs
          </h3>
          <div className="space-y-4">
            {deployStatus.urls?.frontend && (
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Frontend</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{deployStatus.urls.frontend}</p>
                  </div>
                </div>
                <a
                  href={deployStatus.urls.frontend}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Open
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            )}
            {deployStatus.urls?.backend && (
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Backend API</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{deployStatus.urls.backend}</p>
                  </div>
                </div>
                <a
                  href={`${deployStatus.urls.backend}/health`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Health Check
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Logs Section */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
              <span className="font-medium text-slate-900 dark:text-white">View Logs</span>
            </div>
            <svg
              className={`w-5 h-5 text-slate-500 transition-transform ${showLogs ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showLogs && (
            <div className="p-4 pt-0 border-t border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Backend</h4>
                  <div className="bg-slate-900 rounded-lg p-3 h-48 overflow-y-auto font-mono text-xs text-green-400">
                    {logs.backend.length > 0 ? logs.backend.slice(-20).map((log, i) => (
                      <div key={i}>{log}</div>
                    )) : <span className="text-slate-500">No logs yet...</span>}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Frontend</h4>
                  <div className="bg-slate-900 rounded-lg p-3 h-48 overflow-y-auto font-mono text-xs text-cyan-400">
                    {logs.frontend.length > 0 ? logs.frontend.slice(-20).map((log, i) => (
                      <div key={i}>{log}</div>
                    )) : <span className="text-slate-500">No logs yet...</span>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Control Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleStop}
            disabled={isDeploying}
            className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
            Stop Application
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-white px-6 py-3 rounded-xl font-semibold transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Default view - Deployment options
  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-700 text-center">
        {isSuccess ? (
          <>
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Application Generated!</h1>
            <p className="text-slate-600 dark:text-slate-300 mb-6">Your app is ready. Choose how to run it.</p>
          </>
        ) : isFailed ? (
          <>
            <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Generated with Warnings</h1>
            <p className="text-slate-600 dark:text-slate-300 mb-6">The code was generated but may need review. You can still try to run it.</p>
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Ready to Deploy</h1>
            <p className="text-slate-600 dark:text-slate-300 mb-6">Choose how you want to run your application.</p>
          </>
        )}
      </div>

      {/* Error Message */}
      {deployStatus.status === 'error' && deployStatus.error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-700 dark:text-red-300">{deployStatus.error}</p>
          </div>
        </div>
      )}

      {/* Deployment Options */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Deploy Your Application
        </h3>

        <div className="space-y-4">
          {/* Run Locally Option */}
          <div
            className={`p-4 rounded-xl border-2 transition-colors cursor-pointer ${
              deployMethod === 'local'
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'
            }`}
            onClick={() => setDeployMethod('local')}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-slate-900 dark:text-white">Run Locally</h4>
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">Recommended</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Start the app on your machine for development
                </p>
                <ul className="text-xs text-slate-500 dark:text-slate-400 mt-2 space-y-1">
                  <li>• Runs npm install and starts both servers</li>
                  <li>• Frontend on port 3000, Backend on port 5000</li>
                  <li>• Hot reload enabled for development</li>
                </ul>
              </div>
              {deployMethod === 'local' && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeployLocal(); }}
                  disabled={isDeploying}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  {isDeploying ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Starting...
                    </>
                  ) : (
                    <>
                      Start
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      </svg>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Docker Option */}
          <div
            className={`p-4 rounded-xl border-2 transition-colors cursor-pointer ${
              deployMethod === 'docker'
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'
            }`}
            onClick={() => setDeployMethod('docker')}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-slate-900 dark:text-white">Docker Compose</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Run with Docker for isolated environment
                </p>
                <ul className="text-xs text-slate-500 dark:text-slate-400 mt-2 space-y-1">
                  <li>• Requires Docker to be installed</li>
                  <li>• Includes PostgreSQL database</li>
                  <li>• Production-like environment</li>
                </ul>
              </div>
              {deployMethod === 'docker' && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeployDocker(); }}
                  disabled={isDeploying}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  {isDeploying ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Starting...
                    </>
                  ) : (
                    <>
                      Start
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      </svg>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Cloud Deploy Option (Coming Soon) */}
          <div className="p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 opacity-60">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-slate-500 dark:text-slate-400">Deploy to Cloud</h4>
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 text-xs font-medium rounded-full">Coming Soon</span>
                </div>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                  One-click deploy to AWS, Vercel, or Railway
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Project Details */}
      {project && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Project Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Name</span>
              <p className="font-medium text-slate-900 dark:text-white">{project.name}</p>
            </div>
            <div>
              <span className="text-slate-500">Status</span>
              <p className={`font-medium ${isSuccess ? 'text-green-600' : isFailed ? 'text-amber-600' : 'text-indigo-600'}`}>
                {isSuccess ? 'Ready' : isFailed ? 'Needs Review' : project.status}
              </p>
            </div>
            {project.outputPath && (
              <div className="col-span-2">
                <span className="text-slate-500">Location</span>
                <p className="font-mono text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded mt-1 break-all">{project.outputPath}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
          </svg>
          View Dashboard
        </Link>
        {isFailed && (
          <button
            onClick={() => setStep(3)}
            className="inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Regenerate
          </button>
        )}
        <button
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-white px-6 py-3 rounded-xl font-semibold transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create Another
        </button>
      </div>
    </div>
  );
}

export default function WizardPage() {
  const { step } = useWizard();
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <nav className="fixed top-0 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-50 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2"><div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center"><svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div><span className="text-xl font-bold text-slate-900 dark:text-white">AI Platform</span></Link>
            <Link href="/dashboard" className="text-slate-600 dark:text-slate-300 hover:text-slate-900">Dashboard</Link>
          </div>
        </div>
      </nav>
      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <ProgressSteps currentStep={step} />
          {step === 1 && <Step1Describe />}
          {step === 2 && <Step2Configure />}
          {step === 3 && <Step3Generate />}
          {step === 4 && <Step4Deploy />}
          {step === 1 && (
            <div className="mt-8 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-300 mb-3">Tips for better results:</h3>
              <ul className="text-sm text-indigo-800 dark:text-indigo-200 space-y-2">
                <li className="flex items-start gap-2"><svg className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Be specific about user roles and permissions</li>
                <li className="flex items-start gap-2"><svg className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Describe key workflows and business logic</li>
                <li className="flex items-start gap-2"><svg className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Mention any third-party integrations needed</li>
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
