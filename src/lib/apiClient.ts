import { logger } from '@/lib/logger';
import { syncQueueManager } from '@/lib/syncQueue';
/**
 * Centralized API client with automatic token refresh and retry logic.
 * Offline-first: OfflineQueuedError signals that a mutation was accepted
 * into the sync queue instead of being sent immediately.
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

/**
 * Thrown (or returned) when a mutation was queued for later sync rather than
 * executed immediately.  The global TanStack Query error handler checks for
 * this type and suppresses the error toast so the OfflineIndicator can handle
 * the UX instead.
 */
export class OfflineQueuedError extends Error {
  readonly idKey: string;
  readonly label: string;

  constructor(idKey: string, label: string) {
    super(`Queued offline: ${label}`);
    this.name = 'OfflineQueuedError';
    this.idKey = idKey;
    this.label = label;
  }
}

// Custom event for session expiry
export const SESSION_EXPIRED_EVENT = 'session-expired';

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
          // If the server explicitly rejected the refresh token (e.g. 401 or 400),
          // THEN we clear the session.
          if (response.status === 401 || response.status === 400) {
            throw new Error('Token refresh rejected by server');
          }
          throw new Error(`Token refresh failed with status ${response.status}`);
        }

        const rawData = await response.json();
        const data = rawData.data !== undefined ? rawData.data : rawData;
        
        if (!data.access_token) {
          throw new Error('Access token missing in refresh response');
        }

        localStorage.setItem('access_token', data.access_token);
        return data.access_token;
      } catch (error: any) {
        // ── CRITICAL OFFLINE FIX ──────────────────────────────────────────
        // Only clear tokens and force logout if the error is an ACTUAL
        // authentication failure from the server.
        // If it's a network error (e.g. TypeError: Failed to fetch), we 
        // simply throw it so the calling request can fail gracefully
        // (and potentially use cached data) without logging the user out.
        const isAuthError = error.message?.includes('rejected by server') || 
                           error.status === 401 || 
                           error.status === 400;

        if (isAuthError) {
          logger.warn('[ApiClient] Token refresh rejected, clearing session');
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
        } else {
          logger.log('[ApiClient] Network error during token refresh (offline?), keeping session');
        }
        
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
    let response: Response;
    try {
      response = await fetch(`${API_URL}${endpoint}`, {
        ...fetchOptions,
        headers,
      });
    } catch (error) {
      logger.error('Network error during API request:', error);

      // ── CRITICAL OFFLINE MUTATION FIX ─────────────────────────────────────
      // If the request is a mutation (POST/PUT/PATCH/DELETE) and we are
      // offline, accept it into the sync queue instead of throwing a generic
      // error. This makes the UI feel "instant" even without a connection.
      const isMutation = fetchOptions.method && 
                         ['POST', 'PUT', 'PATCH', 'DELETE'].includes(fetchOptions.method);
      
      const isAuthRoute = endpoint.includes('/auth/');

      if (isMutation && !isAuthRoute) {
        // Generate a human-readable label for the sync queue
        const pathParts = endpoint.split('/').filter(Boolean);
        const label = pathParts.length > 0 ? 
                     `Syncing ${pathParts[pathParts.length - 1].replace(/-/g, ' ')}` : 
                     'Syncing data';

        // Enqueue the mutation for later processing
        const idKey = await syncQueueManager.enqueue({
          endpoint,
          method: fetchOptions.method as any,
          body: fetchOptions.body ? JSON.parse(fetchOptions.body as string) : undefined,
          label,
          maxRetries: 3,
          feature: pathParts[0] || 'general'
        });

        // Throw specialized error that tells TanStack Query to suppress the
        // error toast (handled by OfflineIndicator instead).
        throw new OfflineQueuedError(idKey, label);
      }

      throw new ApiError(
        'Unable to connect to the server. Please check your internet connection.',
        null,
        0
      );
    }

    // Handle 401 - token expired
    if (response.status === 401 && !skipAuth) {
      // Try to refresh the token
      const newToken = await this.refreshAccessToken();

      if (newToken) {
        // Retry the request with the new token
        headers['Authorization'] = `Bearer ${newToken}`;
        try {
          response = await fetch(`${API_URL}${endpoint}`, {
            ...fetchOptions,
            headers,
          });
        } catch (error) {
          throw new ApiError(
            'Connection lost after token refresh.',
            null,
            0
          );
        }
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
    let response: Response;
    try {
      response = await fetch(`${API_URL}${endpoint}`, {
        ...fetchOptions,
        method: 'POST',
        headers,
        body: formData,
      });
    } catch (error) {
      logger.error('Network error during file upload:', error);
      throw new ApiError(
        'Unable to connect to the server for upload. Please check your internet connection.',
        null,
        0
      );
    }

    // Handle 401 - token expired
    if (response.status === 401 && !skipAuth) {
      // Try to refresh the token
      const newToken = await this.refreshAccessToken();

      if (newToken) {
        // Retry the request with the new token
        headers['Authorization'] = `Bearer ${newToken}`;
        try {
          response = await fetch(`${API_URL}${endpoint}`, {
            ...fetchOptions,
            method: 'POST',
            headers,
            body: formData,
          });
        } catch (error) {
          throw new ApiError(
            'Connection lost after token refresh during upload.',
            null,
            0
          );
        }
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
