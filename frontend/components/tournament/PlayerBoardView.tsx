"use client";

import MinesweeperBoard from "@/components/MinesweeperBoard";
import SudokuBoard from "@/components/SudokuBoard";
import type { PlayerBoard } from "@/types/tournament";

const STATUS: Record<PlayerBoard["status"], { text: string; className: string }> = {
  InProgress: { text: "Đang giải", className: "border-cyan-400/25 bg-cyan-400/10 text-cyan-200" },
  Solved: { text: "Đã giải xong", className: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200" },
  Failed: { text: "Thua", className: "border-rose-400/25 bg-rose-400/10 text-rose-200" },
};

// Bàn chơi chỉ xem của một người (khán giả: trễ 30 giây; admin: thời gian thực).
export default function PlayerBoardView({ player, highlight = false }: { player: PlayerBoard; highlight?: boolean }) {
  const status = STATUS[player.status];
  return (
    <div className={`flex min-w-0 flex-col gap-3 rounded-2xl border p-4 ${highlight ? "border-amber-300/40 bg-amber-300/[0.04]" : "border-slate-800 bg-slate-950/60"}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-white">
            {player.seed !== null && <span className="mr-1.5 text-xs font-bold text-slate-500">#{player.seed}</span>}
            {player.username}
          </p>
          <p className="text-xs text-slate-400">
            {player.progress}% · {player.mistakes} lỗi
          </p>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${status.className}`}>{status.text}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all" style={{ width: `${Math.min(100, Math.max(0, player.progress))}%` }} />
      </div>
      {player.board ? (
        <div className="flex justify-center overflow-x-auto">
          {player.board.game === "Sudoku" ? (
            <SudokuBoard cells={player.board.cells} givens={player.board.givens} readOnly compact />
          ) : (
            <MinesweeperBoard rows={player.board.rows} cols={player.board.cols} mines={player.board.mines} cells={player.board.cells} readOnly compact />
          )}
        </div>
      ) : (
        <p className="py-8 text-center text-xs text-slate-500">Chưa có bàn chơi.</p>
      )}
    </div>
  );
}
