import { useSyncExternalStore } from "react";
import { apiFetch, getToken } from "./client";
import type { AuthResponse, LoginRequest } from "./types";

const TOKEN_KEY = "puzzlearena_token";
const USER_KEY = "puzzlearena_user";

const authListeners = new Set<() => void>();

function notifyAuthChanged() {
  authListeners.forEach((listener) => listener());
}

export async function login(request: LoginRequest): Promise<AuthResponse> {
  const response = await apiFetch<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(request),
  });
  saveAuth(response.token, response.user);
  return response;
}

export async function register(request: LoginRequest): Promise<AuthResponse> {
  const response = await apiFetch<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(request),
  });
  saveAuth(response.token, response.user);
  return response;
}

export function saveAuth(token: string, user?: AuthResponse["user"]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
  if (user) {
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
  notifyAuthChanged();
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  notifyAuthChanged();
}

let cachedUserRaw: string | null = null;
let cachedUserParsed: AuthResponse["user"] | null = null;

export function getStoredUser(): AuthResponse["user"] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    if (raw === cachedUserRaw) return cachedUserParsed;
    cachedUserRaw = raw;
    cachedUserParsed = raw ? JSON.parse(raw) : null;
    return cachedUserParsed;
  } catch {
    return null;
  }
}

function subscribeAuth(callback: () => void) {
  authListeners.add(callback);
  const onStorage = () => callback();
  window.addEventListener("storage", onStorage);
  return () => {
    authListeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

export function useAuthToken(): string | null {
  return useSyncExternalStore(subscribeAuth, getToken, () => null);
}

export function useCurrentUser(): AuthResponse["user"] | null {
  return useSyncExternalStore(subscribeAuth, getStoredUser, () => null);
}
