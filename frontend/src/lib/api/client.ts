export class ApiError extends Error {
  constructor(public readonly status: number, message: string) { super(message); this.name = "ApiError"; }
}

type ApiErrorPayload = { error?: unknown };

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("puzzlearena_token");
}

function apiUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) throw new ApiError(0, "Thiếu cấu hình NEXT_PUBLIC_API_URL.");
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const payload: unknown = await response.json();
    if (typeof payload === "object" && payload !== null && "error" in payload) {
      const error = (payload as ApiErrorPayload).error;
      if (typeof error === "string" && error.trim()) return error;
    }
  } catch { /* Fallback below handles non-JSON errors. */ }
  return `Yêu cầu thất bại (${response.status}).`;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body !== undefined) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let response: Response;
  try { response = await fetch(apiUrl(path), { ...init, headers }); }
  catch { throw new ApiError(0, "Không thể kết nối đến máy chủ."); }
  if (!response.ok) throw new ApiError(response.status, await errorMessage(response));
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
