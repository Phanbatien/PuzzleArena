import { api } from "@/lib/api";
import type {
  AttemptResponse,
  MoveRequest,
  MoveResponse,
  PracticeRequest,
} from "@/types/game";

export const startPractice = (request: PracticeRequest) =>
  api.post<AttemptResponse>("/api/practice", request);

export const getAttempt = (id: number) =>
  api.get<AttemptResponse>(`/api/attempts/${id}`);

export const moveAttempt = (id: number, request: MoveRequest) =>
  api.post<MoveResponse>(`/api/attempts/${id}/move`, request);

export const abandonAttempt = (id: number) =>
  api.post<AttemptResponse>(`/api/attempts/${id}/abandon`);
