import { createUserFromProfile, useAuthStore } from "./stores/auth-store";

interface ApiConfig {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
  skipAuthRetry?: boolean;
}

interface RefreshResponse {
  access_token: string;
  refresh_token: string;
  user: Record<string, unknown>;
  expires_in?: number;
}

interface AuthResponse {
  user: Record<string, unknown>;
  access_token?: string;
  refresh_token?: string;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

class ApiClient {
  private baseUrl: string;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: () => void;
    reject: (reason: unknown) => void;
  }> = [];

  constructor() {
    this.baseUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
  }

  private processQueue(error?: unknown) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });

    this.failedQueue = [];
  }

  private async refreshToken(): Promise<RefreshResponse> {
    const { logout, setUser } = useAuthStore.getState();

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
        credentials: "include",
      });

      if (!response.ok) {
        throw new ApiError("Token refresh failed", response.status, null);
      }

      const data = (await response.json()) as RefreshResponse;

      if (data.user) {
        setUser(createUserFromProfile(data.user));
      }

      return data;
    } catch (error) {
      await logout();
      throw error;
    }
  }

  async request(endpoint: string, config: ApiConfig = {}): Promise<unknown> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...config.headers,
    };

    const requestConfig: RequestInit = {
      method: config.method || "GET",
      headers,
      credentials: "include", // Include cookies in requests
      signal: config.signal,
    };

    if (config.body) {
      requestConfig.body =
        typeof config.body === "string" || config.body instanceof FormData
          ? config.body
          : JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, requestConfig);

      // Handle 401 Unauthorized - Token expired
      if (response.status === 401) {
        throw new ApiError("Authentication failed", response.status, null);
      }

      if (!response.ok) {
        let errorPayload: unknown;
        let message = `HTTP ${response.status}`;
        try {
          errorPayload = await response.json();
          if (
            typeof errorPayload === "object" &&
            errorPayload !== null &&
            "message" in errorPayload &&
            typeof (errorPayload as Record<string, unknown>).message ===
              "string"
          ) {
            message = String((errorPayload as Record<string, unknown>).message);
          }
        } catch {
          errorPayload = await response.text().catch(() => null);
          if (
            typeof errorPayload === "string" &&
            errorPayload.trim().length > 0
          ) {
            message = errorPayload;
          }
        }

        throw new ApiError(message, response.status, errorPayload);
      }

      // Handle responses with no content
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        return await response.json();
      } else {
        return {}; // Or handle as needed, e.g., response.text()
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        if (config.skipAuthRetry) {
          throw error;
        }

        if (!this.isRefreshing) {
          this.isRefreshing = true;
          try {
            await this.refreshToken();
            this.isRefreshing = false;
            this.processQueue();
          } catch (refreshError) {
            this.isRefreshing = false;
            this.processQueue(refreshError);
            throw refreshError;
          }

          return this.request(endpoint, { ...config, skipAuthRetry: true });
        }
        return new Promise((resolve, reject) => {
          this.failedQueue.push({
            resolve: () => {
              this.request(endpoint, { ...config, skipAuthRetry: true })
                .then(resolve)
                .catch(reject);
            },
            reject,
          });
        });
      }
      throw error;
    }
  }

  // Convenience methods
  get(endpoint: string, config?: Omit<ApiConfig, "method">) {
    return this.request(endpoint, { ...config, method: "GET" });
  }

  post(
    endpoint: string,
    body?: unknown,
    config?: Omit<ApiConfig, "method" | "body">
  ) {
    return this.request(endpoint, { ...config, method: "POST", body });
  }

  postAuth(
    endpoint: string,
    body?: unknown,
    config?: Omit<ApiConfig, "method" | "body">
  ): Promise<AuthResponse> {
    return this.request(endpoint, { ...config, method: "POST", body }) as Promise<AuthResponse>;
  }

  put(
    endpoint: string,
    body?: unknown,
    config?: Omit<ApiConfig, "method" | "body">
  ) {
    return this.request(endpoint, { ...config, method: "PUT", body });
  }

  delete(endpoint: string, config?: Omit<ApiConfig, "method">) {
    return this.request(endpoint, { ...config, method: "DELETE" });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
