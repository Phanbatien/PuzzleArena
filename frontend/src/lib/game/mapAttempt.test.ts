import { describe, expect, it } from "vitest";
import { mapAttemptToBoard } from "./mapAttempt";
import type { AttemptResponse } from "@/src/lib/api/types";

const shared = {
  id: 1, puzzleId: 2, difficulty: "Easy" as const, status: "InProgress" as const,
  mistakes: 0, maxMistakes: 3, progress: 0, startedAt: "2026-10-24T00:00:00Z",
  deadline: null, finishedAt: null, durationMs: null, serverNow: "2026-10-24T00:00:00Z", ratingDelta: null,
};

describe("mapAttemptToBoard", () => {
  it("maps a Sudoku board and preserves Givens for locking cells", () => {
    const attempt: AttemptResponse = {
      ...shared,
      game: "Sudoku",
      board: { game: "Sudoku", rows: 9, cols: 9, mines: 0, cells: `5${"0".repeat(80)}`, givens: `5${"0".repeat(80)}` },
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
      board: { game: "Minesweeper", rows: 9, cols: 9, mines: 10, cells: `0${"#".repeat(80)}`, givens: null },
    };
    const result = mapAttemptToBoard(attempt);
    expect(result.game).toBe("Minesweeper");
    if (result.game === "Minesweeper") {
      expect(result.props.cells).toHaveLength(81);
      expect(result.props.mines).toBe(10);
      expect(result.props.readOnly).toBe(false);
    }
  });
});
