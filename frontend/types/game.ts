export type GameType = "Sudoku" | "Minesweeper";

export type Difficulty = "Easy" | "Medium" | "Hard";

export type AttemptStatus = "InProgress" | "Solved" | "Failed";

export type BoardView = {
  game: GameType;
  rows: number;
  cols: number;
  mines: number;
  cells: string;
  givens: string | null;
};
