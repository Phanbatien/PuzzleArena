"use client";

import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import type { DailyPuzzle } from "@/types/game";

type DailyCardProps = {
  puzzle: DailyPuzzle;
};

// Tên game hiển thị bằng tiếng Việt
const gameLabels: Record<DailyPuzzle["gameType"], string> = {
  Sudoku: "Sudoku",
  Minesweeper: "Dò mìn",
};

// Độ khó hiển thị bằng tiếng Việt
const difficultyLabels: Record<DailyPuzzle["difficulty"], string> = {
  Easy: "Dễ",
  Medium: "Vừa",
  Hard: "Khó",
};

// Nhãn và màu cho từng trạng thái
const statusInfo: Record<
  DailyPuzzle["status"],
  { label: string; className: string }
> = {
  NotStarted: { label: "Chưa chơi", className: "bg-slate-100 text-slate-700" },
  InProgress: { label: "Đang chơi", className: "bg-amber-100 text-amber-800" },
  Solved: { label: "Đã giải xong", className: "bg-green-100 text-green-800" },
  Failed: { label: "Chưa giải được", className: "bg-red-100 text-red-800" },
};

export default function DailyCard({ puzzle }: DailyCardProps) {
  const router = useRouter();
  const status = statusInfo[puzzle.status];

  // Chỉ cho chơi khi đề chưa kết thúc
  const canPlay =
    puzzle.status === "NotStarted" || puzzle.status === "InProgress";
  const playLabel = puzzle.status === "InProgress" ? "Chơi tiếp" : "Chơi ngay";

  // GIẢ ĐỊNH (cần FE2/BE2 xác nhận): trang chơi là /play/[id],
  // trong đó id là attemptId (vì GET /api/attempts/{id} dùng attemptId).
  // Khi attemptId là null (chưa chơi), chưa biết endpoint nào tạo lượt chơi
  // cho đề daily (cần BE1/BE2 xác nhận) nên tạm thời chưa cho bấm.
  const playPath =
    puzzle.attemptId !== null ? `/play/${puzzle.attemptId}` : null;

  function handlePlay() {
    if (playPath) {
      router.push(playPath);
    }
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">
            {gameLabels[puzzle.gameType]}
          </p>
          <h3 className="text-xl font-bold text-slate-900">
            {difficultyLabels[puzzle.difficulty]}
          </h3>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      {/* Điểm do backend tính cho đúng người đang đăng nhập */}
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-green-50 p-3">
          <p className="text-slate-600">Nếu giải được</p>
          <p className="text-lg font-bold text-green-700">
            +{puzzle.ratingIfSolved}
          </p>
        </div>
        <div className="rounded-lg bg-red-50 p-3">
          <p className="text-slate-600">Nếu hỏng</p>
          {/* ratingIfFailed đã là số âm nên hiển thị thẳng */}
          <p className="text-lg font-bold text-red-700">
            {puzzle.ratingIfFailed}
          </p>
        </div>
      </div>

      {canPlay && (
        <div className="mt-4">
          <Button
            className="w-full"
            onClick={handlePlay}
            disabled={playPath === null}
          >
            {playLabel}
          </Button>
          {playPath === null && (
            <p className="mt-2 text-xs text-slate-500">
              Chưa nối được lượt chơi (đang chờ BE1/BE2 xác nhận).
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
