"use client";

import { useState } from "react";
import MinesweeperBoard from "@/components/MinesweeperBoard";

type BoardSize = { name: string; rows: number; cols: number; mines: number };

const BOARD_SIZES: BoardSize[] = [
  { name: "9×9 · 10 mìn", rows: 9, cols: 9, mines: 10 },
  { name: "16×16 · 40 mìn", rows: 16, cols: 16, mines: 40 },
  { name: "16×30 · 99 mìn", rows: 16, cols: 30, mines: 99 },
];

function createStartingCells(rows: number, cols: number) {
  const cells = Array.from({ length: rows * cols }, () => "#");
  const middleRow = Math.floor(rows / 2);
  const middleCol = Math.floor(cols / 2);
  for (let row = middleRow - 1; row <= middleRow + 1; row += 1) {
    for (let col = middleCol - 1; col <= middleCol + 1; col += 1) {
      if (row >= 0 && row < rows && col >= 0 && col < cols) cells[row * cols + col] = "0";
    }
  }
  return cells.join("");
}

function createLostCells(rows: number, cols: number) {
  const cells = createStartingCells(rows, cols).split("");
  [0, Math.floor(cols / 2), rows * cols - 1].forEach((index) => { cells[index] = "*"; });
  return cells.join("");
}

export default function MinesweeperDevPage() {
  const [sizeIndex, setSizeIndex] = useState(0);
  const [readOnly, setReadOnly] = useState(false);
  const [compact, setCompact] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [cells, setCells] = useState(() => createStartingCells(BOARD_SIZES[0].rows, BOARD_SIZES[0].cols));
  const size = BOARD_SIZES[sizeIndex];

  const chooseSize = (index: number) => {
    const nextSize = BOARD_SIZES[index];
    setSizeIndex(index);
    setCells(createStartingCells(nextSize.rows, nextSize.cols));
  };
  const resetBoard = () => setCells(createStartingCells(size.rows, size.cols));
  const simulateLoss = () => { setCells(createLostCells(size.rows, size.cols)); setReadOnly(true); };
  const openCell = (index: number) => setCells((current) => `${current.slice(0, index)}1${current.slice(index + 1)}`);

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-100 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6">
        <div className="text-center"><p className="text-sm font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">PuzzleArena</p><h1 className="mt-1 text-3xl font-bold">Dò mìn Demo</h1><p className="mt-2 text-slate-600 dark:text-slate-400">Vùng giữa được server giả lập mở sẵn. Bấm ô để gửi yêu cầu mở.</p></div>
        <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Chọn kích cỡ bàn">
          {BOARD_SIZES.map((board, index) => <button key={board.name} type="button" aria-pressed={sizeIndex === index} onClick={() => chooseSize(index)} className={`rounded-lg px-4 py-2 font-semibold transition-colors ${sizeIndex === index ? "bg-emerald-700 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"}`}>{board.name}</button>)}
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => setReadOnly((value) => !value)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800">Read only: {readOnly ? "Bật" : "Tắt"}</button>
          <button type="button" onClick={() => setCompact((value) => !value)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800">Compact: {compact ? "Bật" : "Tắt"}</button>
          <button type="button" onClick={() => setDisabled((value) => !value)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800">Disabled: {disabled ? "Bật" : "Tắt"}</button>
          <button type="button" onClick={simulateLoss} className="rounded-lg bg-rose-700 px-4 py-2 font-semibold text-white hover:bg-rose-600">Giả lập thua</button>
          <button type="button" onClick={resetBoard} className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-600">Đặt lại đề</button>
        </div>
        <MinesweeperBoard rows={size.rows} cols={size.cols} mines={size.mines} cells={cells} readOnly={readOnly} compact={compact} disabled={disabled} onOpen={openCell} />
      </div>
    </main>
  );
}
