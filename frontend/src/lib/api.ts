import type {
  Project,
  GenerationRequest,
  GenerationResponse,
  ApiResponse,
  PaginatedResponse,
  User,
} from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

class ApiClient {
  private baseUrl: string;
  private headers: HeadersInit;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.headers = {
      "Content-Type": "application/json",
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          ...this.headers,
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: `HTTP_${response.status}`,
            message: data.message || data.error?.message || "An error occurred",
            details: data.details,
          },
        };
      }

      return {
        success: true,
        data: data.data || data,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: error instanceof Error ? error.message : "Network error occurred",
        },
      };
    }
  }

  setAuthToken(token: string) {
    this.headers = {
      ...this.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  clearAuthToken() {
    const { Authorization: _, ...rest } = this.headers as Record<string, string>;
    this.headers = rest;
  }

  async getProjects(page = 1, pageSize = 10): Promise<ApiResponse<PaginatedResponse<Project>>> {
    return this.request<PaginatedResponse<Project>>(
      `/projects?page=${page}&pageSize=${pageSize}`
    );
  }

  async getProject(id: string): Promise<ApiResponse<Project>> {
    return this.request<Project>(`/projects/${id}`);
  }

  async createProject(project: Partial<Project>): Promise<ApiResponse<Project>> {
    return this.request<Project>("/projects", {
      method: "POST",
      body: JSON.stringify(project),
    });
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<ApiResponse<Project>> {
    return this.request<Project>(`/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  }

  async deleteProject(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/projects/${id}`, {
      method: "DELETE",
    });
  }

  async startGeneration(request: GenerationRequest): Promise<ApiResponse<GenerationResponse>> {
    return this.request<GenerationResponse>("/generate", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async getGenerationStatus(id: string): Promise<ApiResponse<GenerationResponse>> {
    return this.request<GenerationResponse>(`/generate/${id}/status`);
  }

  async cancelGeneration(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/generate/${id}/cancel`, {
      method: "POST",
    });
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.request<User>("/users/me");
  }

  async updateUser(updates: Partial<User>): Promise<ApiResponse<User>> {
    return this.request<User>("/users/me", {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  }

  async checkHealth(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    try {
      const healthUrl = this.baseUrl.replace("/api", "") + "/health";
      const response = await fetch(healthUrl);
      const data = await response.json();
      return { success: true, data };
    } catch {
      return {
        success: false,
        error: {
          code: "CONNECTION_ERROR",
          message: "Cannot connect to backend server",
        },
      };
    }
  }

  async generateSync(
    projectId: string,
    prompt?: string,
    config?: Partial<Project["config"]>
  ): Promise<ApiResponse<{
    project: Project;
    generation: { success: boolean; duration: number; outputPath?: string; error?: string };
  }>> {
    return this.request("/generate/sync", {
      method: "POST",
      body: JSON.stringify({ projectId, prompt, config }),
    });
  }
}

export const api = new ApiClient();
export { ApiClient };
