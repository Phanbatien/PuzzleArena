import { apiFetch } from "./client";
import type { AttemptResponse, Game, SuspiciousAttemptResponse } from "./types";

export function getSuspiciousAttempts(game?: Game, limit?: number) {
  const query = new URLSearchParams();
  if (game) query.set("game", game);
  if (limit !== undefined) query.set("limit", String(limit));
  return apiFetch<SuspiciousAttemptResponse[]>(`/api/admin/attempts/suspicious${query.size ? `?${query}` : ""}`);
}

export const voidAttempt = (id: number) => apiFetch<AttemptResponse>(`/api/admin/attempts/${id}/void`, { method: "POST" });
