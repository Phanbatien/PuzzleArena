"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSuspiciousAttempts, voidAttempt } from "@/lib/admin";
import {
  abandonAttempt,
  getAttempt,
  hintAttempt,
  moveAttempt,
  startPractice,
} from "@/lib/attempts";
import { startDaily } from "@/lib/daily";
import type {
  AttemptResponse,
  Game,
  MoveRequest,
  PracticeRequest,
} from "@/types/game";

const attemptKey = (id: number) => ["attempt", id] as const;
export type TimedAttemptResponse = AttemptResponse & { clientReceivedAt: number };

// Ghi giờ máy lúc NHẬN dữ liệu (một lần), để tính lệch giờ với serverNow. Không làm trong `select`:
// select chạy lại mỗi lần render nên mốc này luôn là "bây giờ" và mọi đồng hồ đếm ngược đứng yên.
const timed = (attempt: AttemptResponse): TimedAttemptResponse => ({ ...attempt, clientReceivedAt: Date.now() });

export function useAttempt(id: number) {
  return useQuery({
    queryKey: attemptKey(id),
    queryFn: async () => timed(await getAttempt(id)),
    enabled: Number.isInteger(id) && id > 0,
  });
}

export function useStartPractice() {
  return useMutation({
    mutationFn: (request: PracticeRequest) => startPractice(request),
  });
}

export function useMove(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: MoveRequest) => moveAttempt(id, request),
    onSuccess: (response) =>
      queryClient.setQueryData<TimedAttemptResponse>(attemptKey(id), timed(response.attempt)),
    // No optimistic update is applied. Refetch restores the most recent server state after any failed move.
    onError: () => queryClient.invalidateQueries({ queryKey: attemptKey(id) }),
  });
}

export function useAbandon(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => abandonAttempt(id),
    onSuccess: (attempt) =>
      queryClient.setQueryData<TimedAttemptResponse>(attemptKey(id), timed(attempt)),
    onError: () => queryClient.invalidateQueries({ queryKey: attemptKey(id) }),
  });
}

export function useHint(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => hintAttempt(id),
    onSuccess: (response) =>
      queryClient.setQueryData<TimedAttemptResponse>(attemptKey(id), timed(response.attempt)),
    onError: () => queryClient.invalidateQueries({ queryKey: attemptKey(id) }),
  });
}

export function useStartDaily() {
  return useMutation({
    mutationFn: ({ game, difficulty }: PracticeRequest) => startDaily(game, difficulty),
  });
}

export function useSuspiciousAttempts(game?: Game, limit?: number) {
  return useQuery({
    queryKey: ["admin", "suspicious", game ?? "all", limit ?? 50] as const,
    queryFn: () => getSuspiciousAttempts(game, limit),
  });
}

export function useVoidAttempt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => voidAttempt(id),
    onSuccess: (attempt) => {
      queryClient.setQueryData<TimedAttemptResponse>(attemptKey(attempt.id), timed(attempt));
      queryClient.invalidateQueries({ queryKey: ["admin", "suspicious"] });
    },
  });
}
