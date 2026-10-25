"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { abandonAttempt, getAttempt, moveAttempt, startPractice } from "./attempts";
import { startDaily } from "./daily";
import type { AttemptResponse, MoveRequest, PracticeRequest } from "./types";

const attemptKey = (id: number) => ["attempt", id] as const;
export type TimedAttemptResponse = AttemptResponse & { clientReceivedAt: number };

export function useAttempt(id: number) {
  return useQuery({
    queryKey: attemptKey(id),
    queryFn: () => getAttempt(id),
    select: (attempt): TimedAttemptResponse => ({ ...attempt, clientReceivedAt: Date.now() }),
    enabled: Number.isInteger(id) && id > 0,
  });
}

export function useStartPractice() {
  return useMutation({ mutationFn: (request: PracticeRequest) => startPractice(request) });
}

export function useMove(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: MoveRequest) => moveAttempt(id, request),
    onSuccess: (response) => queryClient.setQueryData<AttemptResponse>(attemptKey(id), response.attempt),
    // No optimistic update is applied. Refetch restores the most recent server state after any failed move.
    onError: () => queryClient.invalidateQueries({ queryKey: attemptKey(id) }),
  });
}

export function useAbandon(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => abandonAttempt(id),
    onSuccess: (attempt) => queryClient.setQueryData<AttemptResponse>(attemptKey(id), attempt),
    onError: () => queryClient.invalidateQueries({ queryKey: attemptKey(id) }),
  });
}

export function useStartDaily() {
  return useMutation({ mutationFn: (puzzleId: number) => startDaily(puzzleId) });
}
