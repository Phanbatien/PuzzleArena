import type { MinesweeperBoardProps } from "@/components/MinesweeperBoard";
import type { SudokuBoardProps } from "@/components/SudokuBoard";
import type { AttemptResponse } from "@/types/game";

export type SudokuMapOptions = { lastWrongIndex?: number | null };
export type AttemptBoardContext = SudokuMapOptions;

export type MappedAttemptBoardProps =
  | { game: "Sudoku"; props: SudokuBoardProps }
  | { game: "Minesweeper"; props: MinesweeperBoardProps };

function assertCellLength(
  game: string,
  cells: string,
  expected: number,
  field: "cells" | "givens",
): void {
  if (cells.length !== expected)
    throw new Error(
      `${game} ${field} phải có độ dài ${expected}, nhưng nhận ${cells.length}.`,
    );
}

function expectedCells(attempt: AttemptResponse): number {
  return attempt.board.rows * attempt.board.cols;
}

export function mapSudoku(
  attempt: AttemptResponse,
  options: SudokuMapOptions = {},
): SudokuBoardProps {
  if (attempt.board.game !== "Sudoku")
    throw new Error("mapSudoku chỉ nhận attempt Sudoku.");
  const expected = expectedCells(attempt);
  assertCellLength("Sudoku", attempt.board.cells, expected, "cells");
  assertCellLength("Sudoku", attempt.board.givens, expected, "givens");
  return {
    cells: attempt.board.cells,
    givens: attempt.board.givens,
    readOnly: attempt.status !== "InProgress",
    wrongIndex: options.lastWrongIndex,
  };
}

export function mapMinesweeper(
  attempt: AttemptResponse,
): MinesweeperBoardProps {
  if (attempt.board.game !== "Minesweeper")
    throw new Error("mapMinesweeper chỉ nhận attempt Dò mìn.");
  const { board } = attempt;
  assertCellLength("Minesweeper", board.cells, expectedCells(attempt), "cells");
  return {
    rows: board.rows,
    cols: board.cols,
    mines: board.mines,
    cells: board.cells,
    readOnly: attempt.status !== "InProgress",
  };
}

export function mapAttemptToBoardProps(
  attempt: AttemptResponse,
  context: AttemptBoardContext = {},
): MappedAttemptBoardProps {
  return attempt.board.game === "Sudoku"
    ? { game: "Sudoku", props: mapSudoku(attempt, context) }
    : { game: "Minesweeper", props: mapMinesweeper(attempt) };
}

// Preserves the existing /play page integration while new code uses mapAttemptToBoardProps.
type LegacyMapOptions = SudokuMapOptions & {
  disabled?: boolean;
  onSudokuMove?: SudokuBoardProps["onMove"];
  onMinesweeperOpen?: MinesweeperBoardProps["onOpen"];
};

export function mapAttemptToBoard(
  attempt: AttemptResponse,
  options: LegacyMapOptions = {},
): MappedAttemptBoardProps {
  const mapped = mapAttemptToBoardProps(attempt, options);
  return mapped.game === "Sudoku"
    ? {
        game: "Sudoku",
        props: {
          ...mapped.props,
          disabled: options.disabled,
          onMove: options.onSudokuMove,
        },
      }
    : {
        game: "Minesweeper",
        props: {
          ...mapped.props,
          disabled: options.disabled,
          onOpen: options.onMinesweeperOpen,
        },
      };
}

export function remainingDeadlineMs(
  attempt: Pick<AttemptResponse, "deadline">,
  clientNow: number,
  serverOffsetMs: number,
): number | null {
  if (attempt.deadline === null) return null;
  const deadline = Date.parse(attempt.deadline);
  if (Number.isNaN(deadline)) return null;
  const estimatedServerNow = clientNow + serverOffsetMs;
  return Math.max(0, deadline - estimatedServerNow);
}
