// Project Types
export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  userId: string;
  config: ProjectConfig;
}

export type ProjectStatus = "draft" | "generating" | "testing" | "deployed" | "failed";

export interface ProjectConfig {
  industry?: string;
  features: string[];
  integrations: string[];
  multiTenant: boolean;
  authentication: AuthenticationType;
}

export type AuthenticationType = "none" | "basic" | "oauth" | "custom";

// Wizard Types
export interface WizardState {
  step: number;
  appName: string;
  description: string;
  industry: string;
  features: string[];
  integrations: string[];
  config: ProjectConfig;
}

export interface WizardStep {
  id: number;
  name: string;
  description: string;
  completed: boolean;
}

// Generation Types
export interface GenerationRequest {
  projectId: string;
  prompt: string;
  config: ProjectConfig;
}

export interface GenerationResponse {
  id: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  progress: number;
  message: string;
  artifacts?: GeneratedArtifact[];
}

export interface GeneratedArtifact {
  id: string;
  type: "backend" | "frontend" | "database" | "tests" | "docs";
  name: string;
  path: string;
  content?: string;
}

// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Pagination
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
