"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { api } from "./api";
import type { Project } from "@/types";

export interface WizardData {
  appName: string;
  description: string;
  industry: string;
  features: string[];
  integrations: string[];
  multiTenant: boolean;
  authentication: "none" | "basic" | "oauth" | "custom";
}

interface WizardContextType {
  // Current step (1-4)
  step: number;
  setStep: (step: number) => void;

  // Form data
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;

  // Project created from API
  project: Project | null;
  setProject: (project: Project | null) => void;

  // Loading and error states
  isLoading: boolean;
  error: string | null;
  setError: (error: string | null) => void;

  // Connection status
  isConnected: boolean;
  checkConnection: () => Promise<boolean>;

  // Actions
  createProject: () => Promise<Project | null>;
  startGeneration: () => Promise<boolean>;
  reset: () => void;
}

const initialData: WizardData = {
  appName: "",
  description: "",
  industry: "",
  features: [],
  integrations: [],
  multiTenant: false,
  authentication: "basic",
};

const WizardContext = createContext<WizardContextType | null>(null);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(initialData);
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const updateData = useCallback((updates: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const checkConnection = useCallback(async () => {
    try {
      const result = await api.checkHealth();
      setIsConnected(result.success);
      return result.success;
    } catch {
      setIsConnected(false);
      return false;
    }
  }, []);

  const createProject = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await api.createProject({
        name: data.appName,
        description: data.description,
        config: {
          industry: data.industry,
          features: data.features,
          integrations: data.integrations,
          multiTenant: data.multiTenant,
          authentication: data.authentication,
        },
      });

      if (result.success && result.data) {
        setProject(result.data);
        // Save to localStorage for persistence
        localStorage.setItem("wizardProjectId", result.data.id);
        return result.data;
      } else {
        setError(result.error?.message || "Failed to create project");
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [data]);

  const startGeneration = useCallback(async () => {
    if (!project) {
      setError("No project created yet");
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await api.generateSync(project.id, data.description);

      if (result.success && result.data) {
        setProject(result.data.project);
        return result.data.generation.success;
      } else {
        setError(result.error?.message || "Generation failed");
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation error");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [project, data.description]);

  const reset = useCallback(() => {
    setStep(1);
    setData(initialData);
    setProject(null);
    setError(null);
    localStorage.removeItem("wizardProjectId");
  }, []);

  return (
    <WizardContext.Provider
      value={{
        step,
        setStep,
        data,
        updateData,
        project,
        setProject,
        isLoading,
        error,
        setError,
        isConnected,
        checkConnection,
        createProject,
        startGeneration,
        reset,
      }}
    >
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error("useWizard must be used within a WizardProvider");
  }
  return context;
}
