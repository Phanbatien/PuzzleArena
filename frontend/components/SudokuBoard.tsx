"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type SudokuBoardProps = {
  cells: string;
  givens: string;
  readOnly?: boolean;
  compact?: boolean;
  wrongIndex?: number | null;
  disabled?: boolean;
  onMove?: (index: number, value: number) => void;
};

type CellProps = {
  index: number;
  value: string;
  given: boolean;
  selected: boolean;
  highlighted: boolean;
  matchingValue: boolean;
  wrong: boolean;
  notes: ReadonlySet<number>;
  interactive: boolean;
  onSelect: (index: number) => void;
};

const BOARD_SIZE = 9;
const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

function toBoardCells(value: string = ""): string[] {
  return Array.from({ length: CELL_COUNT }, (_, index) => {
    const cell = value[index];
    return cell !== undefined && /^[0-9]$/.test(cell) ? cell : "0";
  });
}

function Cell({ index, value, given, selected, highlighted, matchingValue, wrong, notes, interactive, onSelect }: CellProps) {
  const row = Math.floor(index / BOARD_SIZE);
  const col = index % BOARD_SIZE;
  const displayValue = value === "0" ? null : value;
  const cellClasses = [
    "relative flex min-w-0 items-center justify-center border-b border-r border-slate-300 text-lg font-semibold transition-colors sm:text-xl dark:border-slate-700",
    col === 2 || col === 5 ? "border-r-2 border-r-slate-900 dark:border-r-slate-100" : "",
    row === 2 || row === 5 ? "border-b-2 border-b-slate-900 dark:border-b-slate-100" : "",
    given ? "text-slate-900 dark:text-slate-100" : "text-brand-600 dark:text-brand-300",
    highlighted ? "bg-amber-100/70 dark:bg-amber-400/15" : "bg-white dark:bg-slate-950",
    matchingValue ? "bg-amber-200 dark:bg-amber-400/30" : "",
    selected ? "z-10 bg-brand-200 ring-2 ring-inset ring-brand-600 dark:bg-brand-700/70 dark:ring-brand-300" : "",
    wrong ? "animate-pulse bg-red-200 text-red-800 dark:bg-red-900/70 dark:text-red-100" : "",
    interactive ? "cursor-pointer hover:bg-brand-100 dark:hover:bg-brand-900/50" : "cursor-default",
  ].filter(Boolean).join(" ");
  const label = `Hàng ${row + 1}, cột ${col + 1}, giá trị ${displayValue ?? "trống"}${given ? ", ô cho sẵn" : ""}`;

  return <button type="button" className={cellClasses} aria-label={label} aria-pressed={selected} disabled={!interactive} onClick={() => onSelect(index)}>{displayValue ?? <Notes notes={notes} />}</button>;
}

function Notes({ notes }: { notes: ReadonlySet<number> }) {
  if (notes.size === 0) return null;
  return <span className="grid h-full w-full grid-cols-3 grid-rows-3 p-0.5 text-[0.5rem] font-medium leading-none sm:text-[0.625rem]">{DIGITS.map((digit) => <span key={digit} className="flex items-center justify-center" aria-hidden="true">{notes.has(digit) ? digit : ""}</span>)}</span>;
}

type NumberPadProps = { pencilMode: boolean; disabled: boolean; onPencilModeChange: () => void; onValue: (value: number) => void };

function NumberPad({ pencilMode, disabled, onPencilModeChange, onValue }: NumberPadProps) {
  return <div className="mt-4 w-full max-w-md space-y-3">
    <button type="button" onClick={onPencilModeChange} disabled={disabled} aria-pressed={pencilMode} className={`min-h-11 rounded-lg border px-4 text-sm font-semibold transition-colors ${pencilMode ? "border-amber-500 bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"} disabled:cursor-not-allowed disabled:opacity-50`}>✎ Ghi chú: {pencilMode ? "Bật" : "Tắt"}</button>
    <div className="grid grid-cols-5 gap-2">
      {DIGITS.map((digit) => <button key={digit} type="button" onClick={() => onValue(digit)} disabled={disabled} className="aspect-square rounded-lg bg-slate-800 text-lg font-bold text-white transition-colors hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white disabled:cursor-not-allowed disabled:opacity-50" aria-label={`Nhập số ${digit}`}>{digit}</button>)}
      <button type="button" onClick={() => onValue(0)} disabled={disabled} className="col-span-5 min-h-12 rounded-lg border border-slate-300 bg-white font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">Xóa ô đang chọn</button>
    </div>
  </div>;
}

export default function SudokuBoard({ cells, givens, readOnly = false, compact = false, wrongIndex = null, disabled = false, onMove }: SudokuBoardProps) {
  const boardCells = useMemo(() => toBoardCells(cells), [cells]);
  const givenCells = useMemo(() => toBoardCells(givens), [givens]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [pencilMode, setPencilMode] = useState(false);
  const [notes, setNotes] = useState<Map<number, Set<number>>>(new Map());
  const canInteract = !readOnly && !compact;

  const selectCell = (index: number) => { if (canInteract) setSelectedIndex(index); };
  const updateNotes = useCallback((index: number, value: number) => setNotes((current) => {
    const next = new Map(current);
    const cellNotes = new Set(next.get(index));
    if (cellNotes.has(value)) cellNotes.delete(value); else cellNotes.add(value);
    if (cellNotes.size === 0) next.delete(index); else next.set(index, cellNotes);
    return next;
  }), []);

  const move = useCallback((value: number) => {
    if (!canInteract || disabled || selectedIndex === null || givenCells[selectedIndex] !== "0") return;
    if (pencilMode && value > 0 && boardCells[selectedIndex] === "0") { updateNotes(selectedIndex, value); return; }
    if (value > 0) setNotes((current) => { if (!current.has(selectedIndex)) return current; const next = new Map(current); next.delete(selectedIndex); return next; });
    onMove?.(selectedIndex, value);
  }, [boardCells, canInteract, disabled, givenCells, onMove, pencilMode, selectedIndex, updateNotes]);

  useEffect(() => {
    if (!canInteract) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (selectedIndex === null) return;
      const row = Math.floor(selectedIndex / BOARD_SIZE);
      const col = selectedIndex % BOARD_SIZE;
      const directions: Record<string, number | undefined> = { ArrowUp: row > 0 ? selectedIndex - BOARD_SIZE : undefined, ArrowDown: row < BOARD_SIZE - 1 ? selectedIndex + BOARD_SIZE : undefined, ArrowLeft: col > 0 ? selectedIndex - 1 : undefined, ArrowRight: col < BOARD_SIZE - 1 ? selectedIndex + 1 : undefined };
      const destination = directions[event.key];
      if (destination !== undefined) { event.preventDefault(); setSelectedIndex(destination); return; }
      if (/^[1-9]$/.test(event.key)) { event.preventDefault(); move(Number(event.key)); }
      else if (event.key === "Backspace" || event.key === "Delete") { event.preventDefault(); move(0); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canInteract, move, selectedIndex]);

  const activeSelectedIndex = canInteract ? selectedIndex : null;
  const selectedValue = activeSelectedIndex === null ? null : boardCells[activeSelectedIndex];
  const selectedRow = activeSelectedIndex === null ? -1 : Math.floor(activeSelectedIndex / BOARD_SIZE);
  const selectedCol = activeSelectedIndex === null ? -1 : activeSelectedIndex % BOARD_SIZE;
  const selectedBox = activeSelectedIndex === null ? -1 : Math.floor(selectedRow / 3) * 3 + Math.floor(selectedCol / 3);

  return <div className={`w-full ${compact ? "max-w-48" : "max-w-xl"}`}>
    <div className="grid aspect-square w-full grid-cols-9 overflow-hidden border-2 border-slate-900 bg-white shadow-sm dark:border-slate-100 dark:bg-slate-950" role="grid" aria-label="Bàn Sudoku 9 nhân 9">
      {boardCells.map((value, index) => {
        const row = Math.floor(index / BOARD_SIZE);
        const col = index % BOARD_SIZE;
        const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
        return <Cell key={index} index={index} value={value} given={givenCells[index] !== "0"} selected={index === activeSelectedIndex} highlighted={activeSelectedIndex !== null && (row === selectedRow || col === selectedCol || box === selectedBox)} matchingValue={selectedValue !== null && selectedValue !== "0" && value === selectedValue} wrong={index === wrongIndex} notes={notes.get(index) ?? new Set<number>()} interactive={canInteract} onSelect={selectCell} />;
      })}
    </div>
    {canInteract && <NumberPad pencilMode={pencilMode} disabled={disabled || selectedIndex === null} onPencilModeChange={() => setPencilMode((active) => !active)} onValue={move} />}
  </div>;
}
