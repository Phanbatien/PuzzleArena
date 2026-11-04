import type {
  AttemptStatus,
  BoosterType,
  Difficulty,
  GameType,
} from "@/types/common";

export type { AttemptStatus, Difficulty, GameType };
export type Game = GameType;

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

export type SudokuBoardView = {
  game: "Sudoku";
  rows: 9;
  cols: 9;
  mines: 0;
  cells: string;
  givens: string;
};

export type MinesweeperBoardView = {
  game: "Minesweeper";
  rows: number;
  cols: number;
  mines: number;
  cells: string;
  givens: null;
};

export type BoardView = SudokuBoardView | MinesweeperBoardView;

export type AttemptResponse = {
  id: number;
  puzzleId: number;
  game: GameType;
  difficulty: Difficulty;
  status: AttemptStatus;
  mistakes: number;
  maxMistakes: number;
  progress: number;
  startedAt: string;
  deadline: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  serverNow: string;
  ratingDelta: number | null;
  board: BoardView;
};

export type MoveResponse = {
  correct: boolean;
  shielded: boolean;
  attempt: AttemptResponse;
};

export type PracticeRequest = {
  game: GameType;
  difficulty: Difficulty;
};

// BE2 record: MoveRequest(int Index, int Value), serialized by BE1 as camelCase.
export type SudokuMoveRequest = { index: number; value: number };
export type MinesweeperMoveRequest = { index: number; value: 0 };
export type MoveRequest = SudokuMoveRequest | MinesweeperMoveRequest;

export type SuspiciousAttemptResponse = {
  attemptId: number;
  userId: number;
  username: string;
  game: GameType;
  difficulty: Difficulty;
  durationMs: number | null;
  mistakes: number;
  moves: number;
  tournamentId: number | null;
  finishedAt: string | null;
  reasons: string[];
};
