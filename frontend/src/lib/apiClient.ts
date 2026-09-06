// lib/apiClient.ts

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:4000";

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export class ApiError extends Error {
  status: number;
  data?: any;

  constructor(message: string, status: number = 500, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

function getHeaders() {
  return {
    "Content-Type": "application/json",
  };
}

interface RequestOptions {
  /**
   * If true, a 401 will NOT redirect to /login and will NOT be treated as
   * an unexpected error — it just throws a plain ApiError for the caller
   * to catch quietly. Use this for session-check calls (e.g. /auth/me on
   * app load), where "not logged in" is a normal, expected outcome.
   */
  silent401?: boolean;
}

async function handleResponse<T>(
  response: Response,
  path: string,
  opts: RequestOptions = {}
): Promise<T> {
  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    if (opts.silent401) {
      throw new ApiError(data.message || data.error || 'Not authenticated', 401, data);
    }
    if (!window.location.pathname.includes('/login')) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
    }
    throw new ApiError('Please login to continue', 401, data);
  }

  if (response.status === 403) {
    throw new ApiError(data.message || 'You do not have permission to perform this action', 403, data);
  }

  if (response.status === 404) {
    throw new ApiError(data.message || 'Resource not found', 404, data);
  }

  if (response.status === 422) {
    throw new ApiError(data.message || 'Validation error', 422, data);
  }

  if (response.status >= 500) {
    throw new ApiError(data.message || 'Server error, please try again later', response.status, data);
  }

  if (!response.ok) {
    throw new ApiError(data.message || `Request failed: ${path}`, response.status, data);
  }

  if (data.success === false) {
    throw new ApiError(data.message || `Request failed: ${path}`, response.status || 400, data);
  }

  return data as T;
}

// ─── HTTP METHODS ──────────────────────────────────────────────────

export async function apiGet<T = any>(
  path: string,
  params?: Record<string, any>,
  opts?: RequestOptions
): Promise<T> {
  try {
    const url = new URL(`${API_BASE}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: getHeaders(),
      credentials: 'include',
    });

    return await handleResponse<T>(response, path, opts);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error(`GET ${path} error:`, error);
    throw new ApiError(error instanceof Error ? error.message : 'Network error', 0);
  }
}

export async function apiPost<T = any>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: getHeaders(),
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    });

    return await handleResponse<T>(response, path, opts);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error(`POST ${path} error:`, error);
    throw new ApiError(error instanceof Error ? error.message : 'Network error', 0);
  }
}

export async function apiPatch<T = any>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: "PATCH",
      headers: getHeaders(),
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    });

    return await handleResponse<T>(response, path, opts);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error(`PATCH ${path} error:`, error);
    throw new ApiError(error instanceof Error ? error.message : 'Network error', 0);
  }
}

export async function apiPut<T = any>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: "PUT",
      headers: getHeaders(),
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    });

    return await handleResponse<T>(response, path, opts);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error(`PUT ${path} error:`, error);
    throw new ApiError(error instanceof Error ? error.message : 'Network error', 0);
  }
}

export async function apiDelete<T = any>(path: string, opts?: RequestOptions): Promise<T> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: "DELETE",
      headers: getHeaders(),
      credentials: 'include',
    });

    return await handleResponse<T>(response, path, opts);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error(`DELETE ${path} error:`, error);
    throw new ApiError(error instanceof Error ? error.message : 'Network error', 0);
  }
}

export async function apiDownload(path: string, filename: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: getHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new ApiError(
        data.message || `Download failed: ${path}`,
        response.status,
        data
      );
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error(`Download ${path} error:`, error);
    throw new ApiError(error instanceof Error ? error.message : 'Download failed', 0);
  }
}

export async function apiUpload<T = any>(path: string, formData: FormData): Promise<T> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: {},
      credentials: 'include',
      body: formData,
    });

    return await handleResponse<T>(response, path);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error(`Upload ${path} error:`, error);
    throw new ApiError(error instanceof Error ? error.message : 'Upload failed', 0);
  }
}

export async function uploadCover(file: File): Promise<ApiResponse<{ fileUrl: string; filename: string }>> {
  const formData = new FormData();
  formData.append('file', file);
  return apiUpload('/api/uploads/cover', formData);
}

export async function uploadGuestArtist(file: File): Promise<ApiResponse<{ fileUrl: string; filename: string }>> {
  const formData = new FormData();
  formData.append('file', file);
  return apiUpload('/api/uploads/guest-artist', formData);
}

export async function uploadEventGallery(file: File): Promise<ApiResponse<{ fileUrl: string; filename: string }>> {
  const formData = new FormData();
  formData.append('file', file);
  return apiUpload('/api/uploads/event-gallery', formData);
}

export async function sendWelcomeOtp(): Promise<ApiResponse> {
  return apiPost('/api/auth/send-welcome-otp');
}

export async function verifyOtp(code: string): Promise<ApiResponse> {
  return apiPost('/api/auth/verify-otp', { code });
}

export default {
  get: apiGet,
  post: apiPost,
  patch: apiPatch,
  put: apiPut,
  delete: apiDelete,
  download: apiDownload,
  upload: apiUpload,
  uploadCover,
  uploadGuestArtist,
  uploadEventGallery,
  sendWelcomeOtp,
  verifyOtp,
};