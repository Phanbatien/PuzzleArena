"use client";

import { useEffect, useState } from "react";
import SudokuBoard from "@/components/SudokuBoard";
import type { Difficulty } from "@/types/game";

type Puzzle = { label: string; cells: string; solution: string };

const SOLUTION = "534678912672195348198342567859761423426853791713924856961537284287419635345286179";
const PUZZLES: Record<Difficulty, Puzzle> = {
  Easy: { label: "Dễ", cells: "530070000600195000098000060800060003400803001700020006060000280000419005000080079", solution: SOLUTION },
  Medium: { label: "Trung bình", cells: "500000000070000000000342000800060003000803000700020006000000284000419000000000179", solution: SOLUTION },
  Hard: { label: "Khó", cells: "000000000000000000000000000800060003000000000700020006000000000000419000000000000", solution: SOLUTION },
};
const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];

function formatElapsedTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function SudokuDevPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>("Easy");
  const [cells, setCells] = useState(PUZZLES.Easy.cells);
  const [readOnly, setReadOnly] = useState(false);
  const [compact, setCompact] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [wrongIndex, setWrongIndex] = useState<number | null>(null);
  const puzzle = PUZZLES[difficulty];

  useEffect(() => {
    const intervalId = window.setInterval(() => setElapsedSeconds((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const resetPuzzle = (nextDifficulty = difficulty) => {
    setCells(PUZZLES[nextDifficulty].cells);
    setMistakes(0);
    setElapsedSeconds(0);
    setWrongIndex(null);
  };

  const selectDifficulty = (nextDifficulty: Difficulty) => {
    setDifficulty(nextDifficulty);
    resetPuzzle(nextDifficulty);
  };

  const handleMove = (index: number, value: number) => {
    setCells((current) => `${current.slice(0, index)}${value}${current.slice(index + 1)}`);
    if (value !== 0 && value !== Number(puzzle.solution[index])) {
      setMistakes((count) => count + 1);
      setWrongIndex(index);
      window.setTimeout(() => setWrongIndex(null), 700);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6">
        <div className="w-full text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-sky-700 dark:text-sky-300">PuzzleArena</p>
          <h1 className="mt-1 text-3xl font-bold">Sudoku Board Demo</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">Đề {puzzle.label.toLowerCase()} · Lỗi giả lập: {mistakes}</p>
        </div>

        <section className="grid w-full max-w-md grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900" aria-label="Thông tin ván chơi">
          <div className="border-r border-slate-200 px-5 py-4 text-center dark:border-slate-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Thời gian chơi</p>
            <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-sky-700 dark:text-sky-300" aria-live="polite">{formatElapsedTime(elapsedSeconds)}</p>
          </div>
          <div className="px-5 py-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Độ khó</p>
            <p className="mt-1 text-2xl font-bold">{puzzle.label}</p>
          </div>
        </section>

        <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Chọn độ khó">
          {DIFFICULTIES.map((level) => (
            <button key={level} type="button" onClick={() => selectDifficulty(level)} aria-pressed={difficulty === level} className={`rounded-lg px-4 py-2 font-semibold transition-colors ${difficulty === level ? "bg-sky-700 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"}`}>
              {PUZZLES[level].label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => setReadOnly((value) => !value)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800">Read only: {readOnly ? "Bật" : "Tắt"}</button>
          <button type="button" onClick={() => setCompact((value) => !value)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">Compact: {compact ? "Bật" : "Tắt"}</button>
          <button type="button" onClick={() => resetPuzzle()} className="rounded-lg bg-sky-700 px-4 py-2 font-semibold text-white hover:bg-sky-600">Đặt lại đề</button>
        </div>

        <SudokuBoard cells={cells} givens={puzzle.cells} readOnly={readOnly} compact={compact} wrongIndex={wrongIndex} onMove={handleMove} />
      </div>
    </main>
  );
}
