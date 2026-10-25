
import type {
  AttemptStatus,
  BoosterType,
  Difficulty,
  GameType,
} from "@/types/common";

// Một đề Daily. Frontend không nhận đáp án.
export type DailyPuzzle = {
  id: number;
  gameType: GameType;
  difficulty: Difficulty;
  dailyDate: string;
  ratingIfSolved: number;
  ratingIfFailed: number;
  status: "NotStarted" | AttemptStatus;
  attemptId: number | null;
};

export type UserRating = {
  gameType: GameType;
  value: number;
  rankName: string;
  nextMilestone: number | null;
  suggestedDifficulty: Difficulty;
};

export type Mission = {
  id: "daily" | "weekly";
  period: "Daily" | "Weekly";
  title: string;
  progress: number;
  target: number;
  completed: boolean;
  rewardType: BoosterType;
  rewardAmount: number;
  rewardClaimed: boolean;
};

export type InventoryItem = {
  type: BoosterType;
  amount: number;
};

export type GrantBoosterRequest = {
  userId: number;
  type: BoosterType;
  amount: number;
};

export type GrantBoosterResponse = {
  type: BoosterType;
  amount: number;
};

export type PlayHistory = {
  attemptId: number;
  gameType: GameType;
  difficulty: Difficulty;
  startedAt: string;
  durationMs: number | null;
  mistakes: number;
  status: AttemptStatus;
  ratingChange: number | null;
};

export type BoardView = {
  game: GameType;
  rows: number;
  cols: number;
  mines: number;
  cells: string;
  givens: string | null;
};
