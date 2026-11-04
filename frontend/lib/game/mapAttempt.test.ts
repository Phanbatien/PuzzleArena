import { describe, expect, it } from "vitest";
import { mapAttemptToBoard } from "./mapAttempt";
import type { AttemptResponse } from "@/types/game";

const shared = {
  id: 1,
  puzzleId: 2,
  difficulty: "Easy" as const,
  status: "InProgress" as const,
  mistakes: 0,
  maxMistakes: 3,
  progress: 0,
  startedAt: "2026-10-24T00:00:00Z",
  deadline: null,
  finishedAt: null,
  durationMs: null,
  serverNow: "2026-10-24T00:00:00Z",
  ratingDelta: null,
};

describe("mapAttemptToBoard", () => {
  it("maps a Sudoku board and preserves Givens for locking cells", () => {
    const attempt: AttemptResponse = {
      ...shared,
      game: "Sudoku",
      board: {
        game: "Sudoku",
        rows: 9,
        cols: 9,
        mines: 0,
        cells: `5${"0".repeat(80)}`,
        givens: `5${"0".repeat(80)}`,
      },
    };
    const result = mapAttemptToBoard(attempt);
    expect(result.game).toBe("Sudoku");
    if (result.game === "Sudoku") {
      expect(result.props.givens[0]).toBe("5");
      expect(result.props.givens[1]).toBe("0");
      expect(result.props.readOnly).toBe(false);
    }
  });

  it("maps a Minesweeper board without server-side flags", () => {
    const attempt: AttemptResponse = {
      ...shared,
      game: "Minesweeper",
      maxMistakes: 1,
      board: {
        game: "Minesweeper",
        rows: 9,
        cols: 9,
        mines: 10,
        cells: `0${"#".repeat(80)}`,
        givens: null,
      },
    };
    const result = mapAttemptToBoard(attempt);
    expect(result.game).toBe("Minesweeper");
    if (result.game === "Minesweeper") {
      expect(result.props.cells).toHaveLength(81);
      expect(result.props.mines).toBe(10);
      expect(result.props.readOnly).toBe(false);
    }
  });

  it("sets readOnly to true for Sudoku when Solved or Failed", () => {
    const solvedAttempt: AttemptResponse = {
      ...shared,
      game: "Sudoku",
      status: "Solved",
      board: {
        game: "Sudoku",
        rows: 9,
        cols: 9,
        mines: 0,
        cells: "1".repeat(81),
        givens: "1".repeat(81),
      },
    };
    const failedAttempt: AttemptResponse = {
      ...shared,
      game: "Sudoku",
      status: "Failed",
      board: {
        game: "Sudoku",
        rows: 9,
        cols: 9,
        mines: 0,
        cells: "0".repeat(81),
        givens: "0".repeat(81),
      },
    };
    const solvedResult = mapAttemptToBoard(solvedAttempt);
    const failedResult = mapAttemptToBoard(failedAttempt);
    expect(solvedResult.props.readOnly).toBe(true);
    expect(failedResult.props.readOnly).toBe(true);
  });

  it("preserves mine cells '*' and sets readOnly to true for Minesweeper when Failed", () => {
    const failedCells = `*0${"#".repeat(79)}`;
    const attempt: AttemptResponse = {
      ...shared,
      game: "Minesweeper",
      status: "Failed",
      maxMistakes: 1,
      board: {
        game: "Minesweeper",
        rows: 9,
        cols: 9,
        mines: 10,
        cells: failedCells,
        givens: null,
      },
    };
    const result = mapAttemptToBoard(attempt);
    expect(result.game).toBe("Minesweeper");
    if (result.game === "Minesweeper") {
      expect(result.props.readOnly).toBe(true);
      expect(result.props.cells[0]).toBe("*");
      expect(result.props.cells).toBe(failedCells);
    }
  });

  it("maps Minesweeper 16x30 board with correct dimensions and row*cols indexing", () => {
    const rows = 16;
    const cols = 30;
    const totalCells = rows * cols;
    const targetRow = 5;
    const targetCol = 12;
    const targetIndex = targetRow * cols + targetCol;

    const cellsArray = Array(totalCells).fill("#");
    cellsArray[targetIndex] = "3";
    const cells = cellsArray.join("");

    const attempt: AttemptResponse = {
      ...shared,
      game: "Minesweeper",
      difficulty: "Hard",
      board: {
        game: "Minesweeper",
        rows,
        cols,
        mines: 99,
        cells,
        givens: null,
      },
    };
    const result = mapAttemptToBoard(attempt);
    expect(result.game).toBe("Minesweeper");
    if (result.game === "Minesweeper") {
      expect(result.props.rows).toBe(16);
      expect(result.props.cols).toBe(30);
      expect(result.props.cells).toHaveLength(480);
      expect(result.props.cells[targetIndex]).toBe("3");
      expect(result.props.cells[targetRow * cols + targetCol]).toBe("3");
    }
  });

  it("throws Error when Sudoku cells or givens length is invalid", () => {
    const invalidCells: AttemptResponse = {
      ...shared,
      game: "Sudoku",
      board: {
        game: "Sudoku",
        rows: 9,
        cols: 9,
        mines: 0,
        cells: "0".repeat(80),
        givens: "0".repeat(81),
      },
    };
    const invalidGivens: AttemptResponse = {
      ...shared,
      game: "Sudoku",
      board: {
        game: "Sudoku",
        rows: 9,
        cols: 9,
        mines: 0,
        cells: "0".repeat(81),
        givens: "0".repeat(82),
      },
    };
    expect(() => mapAttemptToBoard(invalidCells)).toThrow(
      /Sudoku cells phải có độ dài 81/,
    );
    expect(() => mapAttemptToBoard(invalidGivens)).toThrow(
      /Sudoku givens phải có độ dài 81/,
    );
  });

  it("throws Error when Minesweeper cells length does not match rows * cols", () => {
    const invalidMinesweeper: AttemptResponse = {
      ...shared,
      game: "Minesweeper",
      board: {
        game: "Minesweeper",
        rows: 9,
        cols: 9,
        mines: 10,
        cells: "#".repeat(80),
        givens: null,
      },
    };
    expect(() => mapAttemptToBoard(invalidMinesweeper)).toThrow(
      /Minesweeper cells phải có độ dài 81/,
    );
  });

  it("does not mutate the input attempt object", () => {
    const attempt: AttemptResponse = {
      ...shared,
      game: "Sudoku",
      board: {
        game: "Sudoku",
        rows: 9,
        cols: 9,
        mines: 0,
        cells: "0".repeat(81),
        givens: "0".repeat(81),
      },
    };
    const snapshot = JSON.parse(JSON.stringify(attempt));
    mapAttemptToBoard(attempt, { lastWrongIndex: 4, disabled: true });
    expect(attempt).toEqual(snapshot);
  });

  it("passes lastWrongIndex to SudokuBoardProps wrongIndex", () => {
    const attempt: AttemptResponse = {
      ...shared,
      game: "Sudoku",
      board: {
        game: "Sudoku",
        rows: 9,
        cols: 9,
        mines: 0,
        cells: "0".repeat(81),
        givens: "0".repeat(81),
      },
    };
    const result = mapAttemptToBoard(attempt, { lastWrongIndex: 42 });
    if (result.game === "Sudoku") {
      expect(result.props.wrongIndex).toBe(42);
    }
  });
});
