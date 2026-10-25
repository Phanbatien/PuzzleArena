import { apiFetch } from "./client";
import type { AttemptResponse, MoveRequest, MoveResponse, PracticeRequest } from "./types";

export const startPractice = (request: PracticeRequest) => apiFetch<AttemptResponse>("/api/practice", { method: "POST", body: JSON.stringify(request) });
export const getAttempt = (id: number) => apiFetch<AttemptResponse>(`/api/attempts/${id}`);
export const moveAttempt = (id: number, request: MoveRequest) => apiFetch<MoveResponse>(`/api/attempts/${id}/move`, { method: "POST", body: JSON.stringify(request) });
export const abandonAttempt = (id: number) => apiFetch<AttemptResponse>(`/api/attempts/${id}/abandon`, { method: "POST" });
