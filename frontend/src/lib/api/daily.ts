import { apiFetch } from "./client";
import type { AttemptResponse } from "./types";

export const startDaily = (puzzleId: number) => apiFetch<AttemptResponse>(`/api/daily/${puzzleId}/start`, { method: "POST" });
