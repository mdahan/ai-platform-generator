"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Project {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: string;
  config: {
    industry: string | null;
    features: string[];
    integrations: string[];
    multiTenant: boolean;
    authentication: string;
  };
  ports?: {
    frontend: number;
    backend: number;
  };
  urls?: {
    frontend: string;
    backend: string;
    health: string;
  };
  generatedFiles?: string[];
  generationStats?: {
    totalFiles: number;
    totalLines: number;
    totalTokens: number;
  };
  createdAt: string;
  updatedAt: string;
}

export default function ProjectManagementPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: projectId } = use(params);

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "deployment" | "files">("overview");
  const [deploying, setDeploying] = useState(false);
  const [stopping, setStopping] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/projects/${projectId}`);
      const data = await response.json();

      if (data.success) {
        setProject(data.data);
      } else {
        setError(typeof data.error === 'string' ? data.error : "Failed to load project");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect to server");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async () => {
    setDeploying(true);
    try {
      const response = await fetch(`${API_URL}/api/deploy/${projectId}/local`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skipInstall: false }),
      });

      if (response.ok) {
        await fetchProject();
      } else {
        setError("Failed to deploy project");
      }
    } catch (err) {
      setError("Failed to deploy project");
      console.error(err);
    } finally {
      setDeploying(false);
    }
  };

  const handleStop = async () => {
    setStopping(true);
    try {
      const response = await fetch(`${API_URL}/api/deploy/${projectId}/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        await fetchProject();
      } else {
        setError("Failed to stop project");
      }
    } catch (err) {
      setError("Failed to stop project");
      console.error(err);
    } finally {
      setStopping(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "deployed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "testing":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "stopped":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      case "generating":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error || "Project not found"}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-4 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">{project.name}</h1>
              <p className="text-slate-600 dark:text-slate-400 mb-3">{project.description}</p>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(project.status)}`}>
                  {project.status}
                </span>
                {project.ports && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <span className="font-mono">Frontend: {project.ports.frontend}</span>
                    <span>•</span>
                    <span className="font-mono">Backend: {project.ports.backend}</span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => router.push(`/ide/${projectId}`)}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              Open in IDE
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
          <div className="border-b border-slate-200 dark:border-slate-700">
            <div className="flex gap-6 px-6">
              <button
                onClick={() => setActiveTab("overview")}
                className={`py-4 border-b-2 transition-colors ${
                  activeTab === "overview"
                    ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab("deployment")}
                className={`py-4 border-b-2 transition-colors ${
                  activeTab === "deployment"
                    ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300"
                }`}
              >
                Deployment
              </button>
              <button
                onClick={() => setActiveTab("files")}
                className={`py-4 border-b-2 transition-colors ${
                  activeTab === "files"
                    ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300"
                }`}
              >
                Files
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Project Configuration */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">Configuration</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Industry</p>
                      <p className="text-slate-800 dark:text-white font-medium">
                        {project.config.industry || "Not specified"}
                      </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Authentication</p>
                      <p className="text-slate-800 dark:text-white font-medium capitalize">
                        {project.config.authentication}
                      </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Multi-Tenant</p>
                      <p className="text-slate-800 dark:text-white font-medium">
                        {project.config.multiTenant ? "Yes" : "No"}
                      </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Features</p>
                      <p className="text-slate-800 dark:text-white font-medium">
                        {project.config.features.length} configured
                      </p>
                    </div>
                  </div>
                </div>

                {/* Generation Stats */}
                {project.generationStats && (
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">Generation Statistics</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Files</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-white">
                          {project.generationStats.totalFiles}
                        </p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Lines</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-white">
                          {project.generationStats.totalLines.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Tokens</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-white">
                          {project.generationStats.totalTokens.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "deployment" && (
              <div className="space-y-6">
                {/* Deployment Status */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">Current Status</h3>
                  <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Deployment Status</p>
                        <p className="text-xl font-semibold text-slate-800 dark:text-white capitalize">
                          {project.status}
                        </p>
                      </div>
                      {project.status === "deployed" ? (
                        <button
                          onClick={handleStop}
                          disabled={stopping}
                          className="px-6 py-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                          {stopping ? "Stopping..." : "Stop Application"}
                        </button>
                      ) : (
                        <button
                          onClick={handleDeploy}
                          disabled={deploying}
                          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                          {deploying ? "Deploying..." : "Deploy Locally"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* URLs */}
                {project.urls && (
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">Application URLs</h3>
                    <div className="space-y-3">
                      <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Frontend</p>
                            <a
                              href={project.urls.frontend}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 dark:text-indigo-400 hover:underline font-mono"
                            >
                              {project.urls.frontend}
                            </a>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => copyToClipboard(project.urls!.frontend)}
                              className="p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors"
                              title="Copy URL"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                            <a
                              href={project.urls.frontend}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                            >
                              Open Frontend
                            </a>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Backend API</p>
                            <a
                              href={project.urls.backend}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 dark:text-indigo-400 hover:underline font-mono"
                            >
                              {project.urls.backend}
                            </a>
                          </div>
                          <button
                            onClick={() => copyToClipboard(project.urls!.backend)}
                            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors"
                            title="Copy URL"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Health Check</p>
                            <a
                              href={project.urls.health}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 dark:text-indigo-400 hover:underline font-mono"
                            >
                              {project.urls.health}
                            </a>
                          </div>
                          <button
                            onClick={() => copyToClipboard(project.urls!.health)}
                            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors"
                            title="Copy URL"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Deployment Options */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">Deployment Options</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border-2 border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3 mb-2">
                        <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <h4 className="font-semibold text-slate-800 dark:text-white">Local</h4>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Deploy on your local machine for development and testing
                      </p>
                    </div>

                    <div className="border-2 border-slate-200 dark:border-slate-700 rounded-lg p-4 opacity-50 cursor-not-allowed">
                      <div className="flex items-center gap-3 mb-2">
                        <svg className="w-6 h-6 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <h4 className="font-semibold text-slate-800 dark:text-white">Docker</h4>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Coming soon: Containerized deployment
                      </p>
                    </div>

                    <div className="border-2 border-slate-200 dark:border-slate-700 rounded-lg p-4 opacity-50 cursor-not-allowed">
                      <div className="flex items-center gap-3 mb-2">
                        <svg className="w-6 h-6 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                        </svg>
                        <h4 className="font-semibold text-slate-800 dark:text-white">Cloud</h4>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Coming soon: Cloud deployment (AWS, Vercel, etc.)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "files" && (
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">Generated Files</h3>
                {project.generatedFiles && project.generatedFiles.length > 0 ? (
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <ul className="space-y-1 font-mono text-sm">
                      {project.generatedFiles.map((file, index) => (
                        <li key={index} className="text-slate-700 dark:text-slate-300 py-1 px-2 hover:bg-slate-100 dark:hover:bg-slate-600 rounded">
                          {file}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-slate-600 dark:text-slate-400">No files generated yet</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
