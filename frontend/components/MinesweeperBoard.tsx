"use client";

import { memo, useCallback, useMemo, useRef, useState } from "react";

export type MinesweeperBoardProps = {
  rows: number;
  cols: number;
  mines: number;
  cells: string;
  readOnly?: boolean;
  compact?: boolean;
  disabled?: boolean;
  onOpen?: (index: number) => void;
};

type CellProps = {
  index: number;
  value: string;
  flagged: boolean;
  ended: boolean;
  interactive: boolean;
  flagMode: boolean;
  row: number;
  col: number;
  onActivate: (index: number) => void;
  onFlag: (index: number) => void;
};

const NUMBER_COLORS: Record<string, string> = {
  "1": "text-blue-600 dark:text-blue-400",
  "2": "text-green-700 dark:text-green-400",
  "3": "text-red-600 dark:text-red-400",
  "4": "text-indigo-800 dark:text-indigo-300",
  "5": "text-rose-900 dark:text-rose-300",
  "6": "text-cyan-700 dark:text-cyan-300",
  "7": "text-slate-950 dark:text-white",
  "8": "text-slate-500 dark:text-slate-400",
};

function cellLabel(row: number, col: number, value: string, flagged: boolean, ended: boolean) {
  const location = `Hàng ${row + 1}, cột ${col + 1}`;
  if (value === "*") return `${location}, mìn`;
  if (flagged && ended) return `${location}, cờ đặt sai`;
  if (flagged) return `${location}, có cờ`;
  if (value === "#") return `${location}, chưa mở`;
  if (value === "0") return `${location}, ô trống`;
  return `${location}, số ${value}`;
}

const MineCell = memo(function MineCell({ index, value, flagged, ended, interactive, flagMode, row, col, onActivate, onFlag }: CellProps) {
  const longPressTimer = useRef<number | null>(null);
  const longPressed = useRef(false);
  const closed = value === "#";
  const wrongFlag = ended && flagged && value !== "*";
  const isMine = value === "*";
  const clearLongPress = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };
  const display = isMine ? "✹" : flagged ? "⚑" : closed || value === "0" ? "" : value;
  const classes = [
    "relative flex aspect-square min-h-7 min-w-7 select-none items-center justify-center border border-slate-400 text-sm font-extrabold leading-none transition-colors dark:border-slate-700",
    closed ? "bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600" : "bg-slate-50 dark:bg-slate-900",
    isMine ? "bg-red-200 text-red-800 dark:bg-red-950 dark:text-red-200" : "",
    !closed && !isMine ? NUMBER_COLORS[value] ?? "" : "",
    interactive ? "cursor-pointer" : "cursor-default",
  ].filter(Boolean).join(" ");

  return (
    <button
      type="button"
      className={classes}
      aria-label={cellLabel(row, col, value, flagged, ended)}
      disabled={!interactive}
      onClick={() => {
        if (longPressed.current) {
          longPressed.current = false;
          return;
        }
        onActivate(index);
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        onFlag(index);
      }}
      onPointerDown={(event) => {
        if (!interactive || event.pointerType !== "touch" || !closed) return;
        longPressed.current = false;
        longPressTimer.current = window.setTimeout(() => {
          longPressed.current = true;
          onFlag(index);
        }, 400);
      }}
      onPointerUp={clearLongPress}
      onPointerCancel={clearLongPress}
      data-flag-mode={flagMode || undefined}
    >
      <span aria-hidden="true">{display}</span>
      {wrongFlag && <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-red-700 dark:text-red-300" aria-hidden="true">×</span>}
    </button>
  );
});

function normaliseCells(cells: string, cellCount: number) {
  return Array.from({ length: cellCount }, (_, index) => {
    const value = cells[index];
    return value !== undefined && (value === "#" || value === "*" || /^[0-8]$/.test(value)) ? value : "#";
  });
}

function adjacentIndices(index: number, rows: number, cols: number) {
  const row = Math.floor(index / cols);
  const col = index % cols;
  const neighbours: number[] = [];
  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
      if (rowOffset === 0 && colOffset === 0) continue;
      const nextRow = row + rowOffset;
      const nextCol = col + colOffset;
      if (nextRow >= 0 && nextRow < rows && nextCol >= 0 && nextCol < cols) neighbours.push(nextRow * cols + nextCol);
    }
  }
  return neighbours;
}

function isStartingBoard(cells: readonly string[], rows: number, cols: number) {
  const middleRow = Math.floor(rows / 2);
  const middleCol = Math.floor(cols / 2);
  return cells.every((value, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const inStartingArea = Math.abs(row - middleRow) <= 1 && Math.abs(col - middleCol) <= 1;
    return inStartingArea ? /^[0-8]$/.test(value) : value === "#";
  });
}

export default function MinesweeperBoard({ rows, cols, mines, cells, readOnly = false, compact = false, disabled = false, onOpen }: MinesweeperBoardProps) {
  const cellCount = Math.max(0, rows * cols);
  const boardCells = useMemo(() => normaliseCells(cells, cellCount), [cells, cellCount]);
  const freshBoardKey = useMemo(() => isStartingBoard(boardCells, rows, cols) ? `${rows}x${cols}:${cells}` : null, [boardCells, cells, cols, rows]);
  const [flagState, setFlagState] = useState<{ boardKey: string | null; indices: ReadonlySet<number> }>({ boardKey: null, indices: new Set() });
  const [flagMode, setFlagMode] = useState(false);
  // Ván kết thúc do server quyết định (status → readOnly). Không suy ra từ "*":
  // khi khiên đỡ, cells có thể chứa "*" trong lúc lượt vẫn InProgress.
  const ended = readOnly;
  const interactive = !readOnly && !compact && !disabled;
  const rawFlags = flagState.boardKey === freshBoardKey || freshBoardKey === null ? flagState.indices : new Set<number>();
  const activeFlags = useMemo(() => new Set([...rawFlags].filter((index) => boardCells[index] === "#")), [boardCells, rawFlags]);

  const toggleFlag = useCallback((index: number) => {
    if (!interactive || boardCells[index] !== "#") return;
    setFlagState((current) => {
      const currentFlags = current.boardKey === freshBoardKey || freshBoardKey === null ? current.indices : new Set<number>();
      const nextFlags = new Set(currentFlags);
      if (nextFlags.has(index)) nextFlags.delete(index); else nextFlags.add(index);
      return { boardKey: freshBoardKey, indices: nextFlags };
    });
  }, [boardCells, freshBoardKey, interactive]);

  const activateCell = useCallback((index: number) => {
    if (!interactive) return;
    const value = boardCells[index];
    if (value === "#") {
      if (flagMode) toggleFlag(index);
      else if (!activeFlags.has(index)) onOpen?.(index);
      return;
    }
    if (!/^[1-8]$/.test(value)) return;
    const neighbours = adjacentIndices(index, rows, cols);
    const flaggedNeighbours = neighbours.filter((neighbour) => activeFlags.has(neighbour)).length;
    if (flaggedNeighbours !== Number(value)) return;
    neighbours.filter((neighbour) => boardCells[neighbour] === "#" && !activeFlags.has(neighbour)).forEach((neighbour) => onOpen?.(neighbour));
  }, [activeFlags, boardCells, cols, flagMode, interactive, onOpen, rows, toggleFlag]);

  const boardWidth = compact ? `${cols * 18}px` : cols <= 9 ? "100%" : `${cols * 28}px`;
  const boardClass = compact ? "text-[0.625rem]" : "text-sm";

  return (
    <div className="w-full overflow-x-auto overscroll-x-contain" onContextMenu={(event) => event.preventDefault()}>
      <div className={`mx-auto ${cols <= 9 && !compact ? "max-w-lg" : "w-max"}`}>
        {!readOnly && !compact && (
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="rounded-md bg-slate-800 px-3 py-2 font-mono text-sm font-bold text-white dark:bg-slate-100 dark:text-slate-900" aria-live="polite">Mìn còn lại: {mines - activeFlags.size}</p>
            <button type="button" disabled={disabled} aria-pressed={flagMode} onClick={() => setFlagMode((active) => !active)} className={`min-h-10 rounded-lg border px-4 text-sm font-semibold transition-colors ${flagMode ? "border-amber-500 bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"} disabled:cursor-not-allowed disabled:opacity-50`}>⚑ Cắm cờ: {flagMode ? "Bật" : "Tắt"}</button>
          </div>
        )}
        <div className={`grid overflow-hidden border-2 border-slate-700 bg-slate-400 shadow-sm dark:border-slate-300 ${boardClass}`} role="grid" aria-label={`Bàn Dò mìn ${rows} nhân ${cols}`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(${compact ? 18 : 28}px, 1fr))`, width: boardWidth }}>
          {boardCells.map((value, index) => <MineCell key={index} index={index} value={value} flagged={activeFlags.has(index) && value === "#"} ended={ended} interactive={interactive} flagMode={flagMode} row={Math.floor(index / cols)} col={index % cols} onActivate={activateCell} onFlag={toggleFlag} />)}
        </div>
      </div>
    </div>
  );
}
