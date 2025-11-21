/**
 * API Client Configuration
 *
 * @property baseURL - The base URL for all API requests (e.g., "https://api.example.com")
 * @property timeout - Request timeout in milliseconds (default: 30000)
 * @property retryAttempts - Number of retry attempts for failed requests (default: 0)
 * @property retryDelay - Base delay in milliseconds for exponential backoff (default: 1000)
 */
export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number; // Base delay in milliseconds
}

/**
 * Request Options
 *
 * @property method - HTTP method (GET, POST, PUT, DELETE)
 * @property endpoint - API endpoint path (e.g., "/profile/123")
 * @property data - Request body data (will be JSON stringified)
 * @property params - URL query parameters
 * @property requiresAuth - Whether the request requires authentication (not yet implemented)
 * @property signal - AbortSignal for request cancellation
 */
export interface RequestOptions {
  method: "GET" | "POST" | "PUT" | "DELETE";
  endpoint: string;
  data?: unknown;
  params?: Record<string, string>;
  requiresAuth?: boolean;
  signal?: AbortSignal;
}

/**
 * API Response Structure
 *
 * @template T - The type of the response data
 * @property data - The response data (null if error occurred)
 * @property error - Error information (null if request succeeded)
 */
export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

/**
 * API Error Structure
 *
 * @property code - Error code (e.g., "NETWORK_ERROR", "ERROR_404")
 * @property message - Human-readable error message
 * @property details - Additional error details (e.g., field validation errors)
 * @property status - HTTP status code (if applicable)
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string>;
  status?: number;
}

/**
 * Custom API Error Class
 *
 * Extends the standard Error class with additional API-specific information.
 *
 * @example
 * ```typescript
 * throw new ApiClientError(
 *   "Resource not found",
 *   "NOT_FOUND",
 *   404,
 *   { resource: "user" }
 * );
 * ```
 */
export class ApiClientError extends Error {
  public code: string;
  public status?: number;
  public details?: Record<string, string>;

  constructor(
    message: string,
    code: string,
    status?: number,
    details?: Record<string, string>
  ) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/**
 * API Client for making HTTP requests to the backend
 *
 * Handles:
 * - Base URL configuration from environment
 * - Standard headers (Content-Type, Accept)
 * - JSON response parsing
 * - Error handling for network and HTTP errors
 * - Retry logic with exponential backoff
 * - Request cancellation via AbortSignal
 *
 * @example
 * ```typescript
 * // Create a client with custom configuration
 * const client = new ApiClient({
 *   baseURL: "https://api.example.com",
 *   retryAttempts: 3,
 *   retryDelay: 1000
 * });
 *
 * // Make a GET request
 * const response = await client.get<User>("/users/123");
 * if (response.data) {
 *   console.log(response.data);
 * }
 *
 * // Make a POST request with data
 * const createResponse = await client.post<User>("/users", {
 *   name: "John Doe",
 *   email: "john@example.com"
 * });
 *
 * // Cancel a request
 * const controller = new AbortController();
 * const promise = client.get<User>("/users/123", undefined, controller.signal);
 * controller.abort(); // Cancel the request
 * ```
 */
export class ApiClient {
  private baseURL: string;
  private timeout: number;
  private retryAttempts: number;
  private retryDelay: number;

  constructor(config?: Partial<ApiClientConfig>) {
    // Use env vars directly in browser
    if (!config?.baseURL) {
      this.baseURL =
        import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "";
    } else {
      this.baseURL = config.baseURL;
    }
    this.timeout = config?.timeout || 30000; // 30 seconds default
    this.retryAttempts = config?.retryAttempts ?? 0; // No retries by default
    this.retryDelay = config?.retryDelay || 1000; // 1 second base delay
  }

  /**
   * Build full URL with query parameters
   *
   * @param endpoint - API endpoint path
   * @param params - Optional query parameters
   * @returns Full URL with query string
   * @private
   */
  private buildURL(endpoint: string, params?: Record<string, string>): string {
    // Ensure baseURL ends with / and endpoint starts without /
    const base = this.baseURL.endsWith("/") ? this.baseURL : `${this.baseURL}/`;
    const path = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
    const url = new URL(path, base);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    return url.toString();
  }

  /**
   * Build request headers
   *
   * Adds standard headers (Content-Type, Accept) to all requests.
   *
   * @returns Headers object with standard headers
   * @private
   */
  private buildHeaders(): Headers {
    const headers = new Headers();
    headers.set("Content-Type", "application/json");
    headers.set("Accept", "application/json");
    return headers;
  }

  /**
   * Handle fetch response
   *
   * Parses JSON response and handles errors.
   *
   * @template T - The expected response data type
   * @param response - Fetch Response object
   * @returns Parsed API response
   * @throws ApiClientError for non-2xx responses
   * @private
   */
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    let body: any;

    try {
      body = await response.json();
    } catch (error) {
      // If JSON parsing fails, create a generic error response
      body = {
        error: {
          code: "PARSE_ERROR",
          message: "Failed to parse response",
        },
      };
    }

    // Handle non-2xx responses
    if (!response.ok) {
      const errorMessage =
        body?.error?.message || body?.message || response.statusText;
      const errorCode = body?.error?.code || `ERROR_${response.status}`;
      const errorDetails = body?.error?.details;

      throw new ApiClientError(
        errorMessage,
        errorCode,
        response.status,
        errorDetails
      );
    }

    // Return successful response
    return {
      data: body.data || body,
      error: null,
    };
  }

  /**
   * Determine if an error should be retried
   *
   * Retry logic:
   * - Network errors: Retry up to configured attempts
   * - 5xx errors: Retry up to 2 times
   * - 4xx errors: No retry
   * - AbortError: No retry
   *
   * @param error - The error that occurred
   * @param attempt - Current attempt number (0-indexed)
   * @returns True if the request should be retried
   * @private
   */
  private shouldRetry(error: unknown, attempt: number): boolean {
    // Don't retry if we've exhausted attempts
    if (attempt >= this.retryAttempts) {
      return false;
    }

    // Check if it's an ApiClientError with a status code
    if (error instanceof ApiClientError && error.status) {
      const status = error.status;

      // Don't retry 4xx client errors
      if (status >= 400 && status < 500) {
        return false;
      }

      // Retry 5xx errors up to 2 times (initial + 2 retries = 3 total attempts)
      if (status >= 500 && status < 600) {
        return attempt < 2;
      }
    }

    // Retry network errors (non-ApiClientError errors)
    if (
      error instanceof Error &&
      error.name !== "AbortError" &&
      !(error instanceof ApiClientError)
    ) {
      return true;
    }

    return false;
  }

  /**
   * Calculate delay for exponential backoff with jitter
   *
   * Formula: baseDelay * 2^attempt + random jitter (0-25% of delay)
   *
   * @param attempt - Current attempt number (0-indexed)
   * @returns Delay in milliseconds
   * @private
   */
  private calculateBackoffDelay(attempt: number): number {
    // Exponential backoff: baseDelay * 2^attempt
    const exponentialDelay = this.retryDelay * Math.pow(2, attempt);
    // Add jitter (random value between 0 and 25% of delay)
    const jitter = Math.random() * exponentialDelay * 0.25;
    return exponentialDelay + jitter;
  }

  /**
   * Sleep for specified milliseconds
   *
   * @param ms - Milliseconds to sleep
   * @returns Promise that resolves after the delay
   * @private
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Make an HTTP request with retry logic
   *
   * Handles retries with exponential backoff for transient failures.
   *
   * @template T - The expected response data type
   * @param options - Request options
   * @param attempt - Current attempt number (default: 0)
   * @returns API response
   * @throws ApiClientError for permanent failures
   * @private
   */
  private async makeRequest<T>(
    options: RequestOptions,
    attempt: number = 0
  ): Promise<ApiResponse<T>> {
    const { method, endpoint, data, params, signal } = options;

    try {
      // Check if already aborted before making request
      if (signal?.aborted) {
        throw new DOMException("The operation was aborted.", "AbortError");
      }

      // Build URL and headers
      const url = this.buildURL(endpoint, params);
      const headers = this.buildHeaders();

      // Make fetch request
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        signal,
      });

      // Check if aborted after fetch completes
      if (signal?.aborted) {
        throw new DOMException("The operation was aborted.", "AbortError");
      }

      // Handle response
      return await this.handleResponse<T>(response);
    } catch (error) {
      // Handle AbortError first (don't retry cancelled requests)
      // Check for both Error.name === "AbortError" and DOMException
      if (
        (error instanceof Error && error.name === "AbortError") ||
        (error instanceof DOMException && error.name === "AbortError")
      ) {
        throw new ApiClientError("Request was cancelled", "REQUEST_CANCELLED");
      }

      // Check if we should retry
      if (this.shouldRetry(error, attempt)) {
        // Calculate backoff delay
        const delay = this.calculateBackoffDelay(attempt);

        // Wait before retrying
        await this.sleep(delay);

        // Retry the request
        return this.makeRequest<T>(options, attempt + 1);
      }

      // Handle network errors
      if (error instanceof ApiClientError) {
        throw error;
      }

      // Handle other network errors
      if (error instanceof Error) {
        throw new ApiClientError(
          `Network request failed: ${error.message}`,
          "NETWORK_ERROR"
        );
      }

      // Handle unknown errors
      throw new ApiClientError("An unknown error occurred", "UNKNOWN_ERROR");
    }
  }

  /**
   * Make an HTTP request
   *
   * @template T - The expected response data type
   * @param options - Request options
   * @returns API response with data or error
   *
   * @example
   * ```typescript
   * const response = await client.request<User>({
   *   method: "GET",
   *   endpoint: "/users/123"
   * });
   * ```
   */
  async request<T>(options: RequestOptions): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(options, 0);
  }

  /**
   * Convenience method for GET requests
   *
   * @template T - The expected response data type
   * @param endpoint - API endpoint path
   * @param params - Optional query parameters
   * @param signal - Optional AbortSignal for cancellation
   * @returns API response with data or error
   *
   * @example
   * ```typescript
   * const response = await client.get<User>("/users/123");
   * const response = await client.get<User[]>("/users", { role: "admin" });
   * ```
   */
  async get<T>(
    endpoint: string,
    params?: Record<string, string>,
    signal?: AbortSignal
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ method: "GET", endpoint, params, signal });
  }

  /**
   * Convenience method for POST requests
   *
   * @template T - The expected response data type
   * @param endpoint - API endpoint path
   * @param data - Request body data (will be JSON stringified)
   * @param signal - Optional AbortSignal for cancellation
   * @returns API response with data or error
   *
   * @example
   * ```typescript
   * const response = await client.post<User>("/users", {
   *   name: "John Doe",
   *   email: "john@example.com"
   * });
   * ```
   */
  async post<T>(
    endpoint: string,
    data?: unknown,
    signal?: AbortSignal
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ method: "POST", endpoint, data, signal });
  }

  /**
   * Convenience method for PUT requests
   *
   * @template T - The expected response data type
   * @param endpoint - API endpoint path
   * @param data - Request body data (will be JSON stringified)
   * @param signal - Optional AbortSignal for cancellation
   * @returns API response with data or error
   *
   * @example
   * ```typescript
   * const response = await client.put<User>("/users/123", {
   *   name: "Jane Doe"
   * });
   * ```
   */
  async put<T>(
    endpoint: string,
    data?: unknown,
    signal?: AbortSignal
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ method: "PUT", endpoint, data, signal });
  }

  /**
   * Convenience method for DELETE requests
   *
   * @template T - The expected response data type
   * @param endpoint - API endpoint path
   * @param signal - Optional AbortSignal for cancellation
   * @param params - Optional query parameters
   * @returns API response with data or error
   *
   * @example
   * ```typescript
   * const response = await client.delete<void>("/users/123");
   * const response = await client.delete<void>("/users/123", undefined, { userId: "123" });
   * ```
   */
  async delete<T>(
    endpoint: string,
    signal?: AbortSignal,
    params?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ method: "DELETE", endpoint, signal, params });
  }
}

/**
 * Lazy singleton instance of ApiClient
 * @private
 */
let _defaultInstance: ApiClient | null = null;

/**
 * Get the singleton instance of ApiClient
 *
 * Creates a new instance on first call, then returns the same instance.
 *
 * @returns The singleton ApiClient instance
 */
export const getApiClient = (): ApiClient => {
  if (!_defaultInstance) {
    _defaultInstance = new ApiClient();
  }
  return _defaultInstance;
};

/**
 * Default API client instance (lazy loaded)
 *
 * Uses a Proxy to lazily initialize the singleton instance.
 *
 * @example
 * ```typescript
 * import { apiClient } from '@/services/apiClient';
 *
 * const response = await apiClient.get<User>("/users/123");
 * ```
 */
export const apiClient = new Proxy({} as ApiClient, {
  get(target, prop) {
    return getApiClient()[prop as keyof ApiClient];
  },
});

export default apiClient;
