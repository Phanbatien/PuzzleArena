// BE1 xác nhận: System.Text.Json Web defaults (camelCase) + enum được gửi dạng string.

export type Game = "Sudoku" | "Minesweeper";
export type Difficulty = "Easy" | "Medium" | "Hard";
export type AttemptStatus = "InProgress" | "Solved" | "Failed";

export type SudokuBoardView = { game: "Sudoku"; rows: 9; cols: 9; mines: 0; cells: string; givens: string };
export type MinesweeperBoardView = { game: "Minesweeper"; rows: number; cols: number; mines: number; cells: string; givens: null };
export type BoardView = SudokuBoardView | MinesweeperBoardView;

export type AttemptResponse = {
  id: number; puzzleId: number; game: Game; difficulty: Difficulty; status: AttemptStatus;
  mistakes: number; maxMistakes: number; progress: number; startedAt: string;
  deadline: string | null; finishedAt: string | null; durationMs: number | null;
  serverNow: string; ratingDelta: number | null; board: BoardView;
};

export type MoveResponse = { correct: boolean; shielded: boolean; attempt: AttemptResponse };
export type PracticeRequest = { game: Game; difficulty: Difficulty };

// BE2 record: MoveRequest(int Index, int Value), serialized by BE1 as camelCase.
export type SudokuMoveRequest = { index: number; value: number };
export type MinesweeperMoveRequest = { index: number; value: 0 };
export type MoveRequest = SudokuMoveRequest | MinesweeperMoveRequest;


export type SuspiciousAttemptResponse = {
  attemptId: number; userId: number; username: string; game: Game; difficulty: Difficulty;
  durationMs: number | null; mistakes: number; moves: number; tournamentId: number | null;
  finishedAt: string | null; reasons: string[];
};
