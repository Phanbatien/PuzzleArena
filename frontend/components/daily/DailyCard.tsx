"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { ApiError, api } from "@/lib/api";
import type { DailyPuzzle } from "@/types/game";

type DailyCardProps = {
  puzzle: DailyPuzzle;
};

// POST /api/daily/start { game, difficulty } trả về AttemptResponse; ở đây chỉ cần id để chuyển sang /play/{id}.
type StartResponse = {
  id: number;
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
  NotStarted: { label: "Sẵn sàng", className: "bg-slate-100 text-slate-700" },
  InProgress: { label: "Đang chơi dở", className: "bg-amber-100 text-amber-800" },
};

export default function DailyCard({ puzzle }: DailyCardProps) {
  const router = useRouter();
  const status = statusInfo[puzzle.status];

  // Đang gọi API tạo lượt chơi, và lỗi nếu có
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Chơi không giới hạn: có lượt dở thì chơi tiếp lượt đó, không thì ván mới với đề mới.
  const playLabel = puzzle.status === "InProgress" ? "Chơi tiếp" : puzzle.playedToday > 0 ? "Chơi ván mới" : "Chơi ngay";

  async function handlePlay() {
    setError(null);

    // Đã có lượt chơi: vào thẳng phòng chơi, KHÔNG tạo lượt thứ hai
    if (puzzle.attemptId !== null) {
      router.push(`/play/${puzzle.attemptId}`);
      return;
    }

    // Chưa có lượt dở: backend sinh một đề ngẫu nhiên mới, không trùng đề mình đã chơi.
    setStarting(true);
    try {
      const attempt = await api.post<StartResponse>("/api/daily/start", {
        game: puzzle.gameType,
        difficulty: puzzle.difficulty,
      });
      if (attempt === null || attempt.id === undefined) {
        setError("Máy chủ không trả về mã lượt chơi. Vui lòng thử lại.");
        return;
      }
      router.push(`/play/${attempt.id}`);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Không bắt đầu được lượt chơi.",
      );
    } finally {
      setStarting(false);
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

      <p className="mt-3 text-sm text-slate-600">
        Hôm nay: đã chơi {puzzle.playedToday} ván, giải được {puzzle.solvedToday}.
        Mỗi ván là một đề mới.
      </p>

      <div className="mt-4">
        <Button className="w-full" onClick={handlePlay} disabled={starting}>
          {starting ? "Đang vào..." : playLabel}
        </Button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    </Card>
  );
}
