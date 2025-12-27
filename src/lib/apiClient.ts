/**
 * Centralized API client with automatic token refresh and retry logic
 */

const API_URL = import.meta.env.VITE_BACKEND_URL || 'https://nuvana360server.onrender.com';

interface ApiClientOptions extends RequestInit {
  skipAuth?: boolean;
}

export class ApiError extends Error {
  constructor(public message: string, public data: any, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiClient {
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;

  /**
   * Get access token from localStorage
   */
  private getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  /**
   * Get refresh token from localStorage
   */
  private getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  /**
   * Refresh the access token using the refresh token
   */
  private async refreshAccessToken(): Promise<string | null> {
    // If already refreshing, return the existing promise
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (!response.ok) {
          throw new Error('Token refresh failed');
        }

        const data = await response.json();
        localStorage.setItem('access_token', data.access_token);
        return data.access_token;
      } catch (error) {
        // Clear tokens on refresh failure
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        // Redirect to login
        window.location.href = '/login';
        return null;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Make an API request with automatic token refresh on 401
   */
  async request<T = any>(
    endpoint: string,
    options: ApiClientOptions = {}
  ): Promise<T> {
    const { skipAuth = false, ...fetchOptions } = options;

    // Prepare headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    };

    // Add authorization header if not skipped
    if (!skipAuth) {
      const token = this.getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    // Make the request
    let response = await fetch(`${API_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    // Handle 401 - token expired
    if (response.status === 401 && !skipAuth) {
      // Try to refresh the token
      const newToken = await this.refreshAccessToken();

      if (newToken) {
        // Retry the request with the new token
        headers['Authorization'] = `Bearer ${newToken}`;
        response = await fetch(`${API_URL}${endpoint}`, {
          ...fetchOptions,
          headers,
        });
      } else {
        // Refresh failed, user will be redirected to login
        throw new Error('Authentication failed');
      }
    }


    // Handle non-OK responses
    if (!response.ok) {
      const errorResponse = await response.json().catch(() => ({
        statusCode: response.status,
        message: 'An error occurred',
        isError: true,
        data: null,
      }));
      
      // New backend format: { statusCode, message, isError, data }
      throw new ApiError(
        errorResponse.message || `Request failed with status ${response.status}`,
        errorResponse.data,
        errorResponse.statusCode || response.status
      );
    }

    // Handle successful responses
    // New backend format: { statusCode, message, isError: false, data }
    const successResponse = await response.json();
    
    // Return only the data from the wrapper
    return successResponse.data !== undefined ? successResponse.data : successResponse;
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, options?: ApiClientOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T = any>(
    endpoint: string,
    data?: any,
    options?: ApiClientOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T = any>(
    endpoint: string,
    data?: any,
    options?: ApiClientOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(
    endpoint: string,
    data?: any,
    options?: ApiClientOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string, options?: ApiClientOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Upload file with FormData
   */
  async uploadFile<T = any>(
    endpoint: string,
    formData: FormData,
    options?: ApiClientOptions
  ): Promise<T> {
    const { skipAuth = false, ...fetchOptions } = options || {};

    // Prepare headers (don't set Content-Type, let browser set it with boundary)
    const headers: HeadersInit = {
      ...fetchOptions.headers,
    };

    // Remove Content-Type header if it exists (browser will set it with boundary)
    delete headers['Content-Type'];

    // Add authorization header if not skipped
    if (!skipAuth) {
      const token = this.getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    // Make the request
    let response = await fetch(`${API_URL}${endpoint}`, {
      ...fetchOptions,
      method: 'POST',
      headers,
      body: formData,
    });

    // Handle 401 - token expired
    if (response.status === 401 && !skipAuth) {
      // Try to refresh the token
      const newToken = await this.refreshAccessToken();

      if (newToken) {
        // Retry the request with the new token
        headers['Authorization'] = `Bearer ${newToken}`;
        response = await fetch(`${API_URL}${endpoint}`, {
          ...fetchOptions,
          method: 'POST',
          headers,
          body: formData,
        });
      } else {
        // Refresh failed, user will be redirected to login
        throw new Error('Authentication failed');
      }
    }

    // Handle non-OK responses
    if (!response.ok) {
      const errorResponse = await response.json().catch(() => ({
        statusCode: response.status,
        message: 'An error occurred',
        isError: true,
        data: null,
      }));
      
      throw new ApiError(
        errorResponse.message || `Request failed with status ${response.status}`,
        errorResponse.data,
        errorResponse.statusCode || response.status
      );
    }

    // Handle successful responses
    const successResponse = await response.json();
    return successResponse.data !== undefined ? successResponse.data : successResponse;
  }
}

// Export a singleton instance
export const apiClient = new ApiClient();
