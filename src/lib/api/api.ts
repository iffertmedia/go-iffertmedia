import { fetch } from "expo/fetch";

// Response envelope type - all app routes return { data: T }
interface ApiResponse<T> {
  data: T;
}

// Error thrown by the API client. Carries the HTTP status (0 = network failure)
// so callers can decide whether a failure is transient and worth retrying.
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// Transient failures that are safe to retry: gateway/availability errors from
// the proxy (502/503/504) and network failures (status 0).
export const isTransientError = (e: unknown): boolean =>
  e instanceof ApiError && (e.status === 0 || e.status === 502 || e.status === 503 || e.status === 504);

const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;

const request = async <T>(
  url: string,
  options: { method?: string; body?: string } = {}
): Promise<T> => {
  let response: Awaited<ReturnType<typeof fetch>>;
  try {
    response = await fetch(`${baseUrl}${url}`, {
      ...options,
      headers: options.body ? { "Content-Type": "application/json" } : undefined,
    });
  } catch (e) {
    // Network failure (no response) — surface as a transient (status 0) error.
    throw new ApiError("Network request failed", 0);
  }

  // 1. Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  // 2. JSON responses: parse and unwrap { data }
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    const json = (await response.json()) as ApiResponse<T> & {
      error?: { message?: string; code?: string };
    };
    if (!response.ok) {
      throw new ApiError(json.error?.message || `Request failed (${response.status})`, response.status);
    }
    return json.data;
  }

  // 3. Non-JSON / error (e.g. a 502 HTML page from the proxy)
  if (!response.ok) {
    throw new ApiError(`Request failed (${response.status})`, response.status);
  }
  return undefined as T;
};

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body: any) =>
    request<T>(url, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(url: string, body: any) =>
    request<T>(url, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(url: string) => request<T>(url, { method: "DELETE" }),
  patch: <T>(url: string, body: any) =>
    request<T>(url, { method: "PATCH", body: JSON.stringify(body) }),
};
