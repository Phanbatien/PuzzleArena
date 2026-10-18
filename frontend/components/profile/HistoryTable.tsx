import Card from "@/components/ui/Card";
import { formatDateTime, formatDuration } from "@/lib/format";
import type { PlayHistory } from "@/types/game";

type HistoryTableProps = {
  history: PlayHistory[];
};

const gameLabels: Record<PlayHistory["gameType"], string> = {
  Sudoku: "Sudoku",
  Minesweeper: "Dò mìn",
};

const difficultyLabels: Record<PlayHistory["difficulty"], string> = {
  Easy: "Dễ",
  Medium: "Vừa",
  Hard: "Khó",
};

const statusLabels: Record<PlayHistory["status"], string> = {
  Solved: "Thắng",
  Failed: "Thua",
  InProgress: "Đang chơi",
};

const statusClasses: Record<PlayHistory["status"], string> = {
  Solved: "bg-green-100 text-green-800",
  Failed: "bg-red-100 text-red-800",
  InProgress: "bg-amber-100 text-amber-800",
};

// null (chưa chấm Elo) -> "—"; dương thêm dấu "+"
function formatRatingChange(change: number | null): string {
  if (change === null) return "—";
  return change > 0 ? `+${change}` : String(change);
}

export default function HistoryTable({ history }: HistoryTableProps) {
  if (history.length === 0) {
    return (
      <Card>
        <p className="text-sm text-slate-600">Bạn chưa chơi ván nào.</p>
      </Card>
    );
  }

  return (
    <Card>
      {/* Bảng rộng sẽ cuộn ngang trong khung này, không làm cả trang bị tràn */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2 pr-3 font-medium">Game</th>
              <th className="py-2 pr-3 font-medium">Độ khó</th>
              <th className="py-2 pr-3 font-medium">Ngày chơi</th>
              <th className="py-2 pr-3 font-medium">Thời gian</th>
              <th className="py-2 pr-3 font-medium">Lỗi</th>
              <th className="py-2 pr-3 font-medium">Kết quả</th>
              <th className="py-2 font-medium">Điểm</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.attemptId} className="border-b border-slate-100">
                <td className="py-2 pr-3">{gameLabels[h.gameType]}</td>
                <td className="py-2 pr-3">{difficultyLabels[h.difficulty]}</td>
                <td className="py-2 pr-3">{formatDateTime(h.startedAt)}</td>
                <td className="py-2 pr-3">{formatDuration(h.durationMs)}</td>
                <td className="py-2 pr-3">{h.mistakes}</td>
                <td className="py-2 pr-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClasses[h.status]}`}
                  >
                    {statusLabels[h.status]}
                  </span>
                </td>
                <td className="py-2 font-semibold">
                  {formatRatingChange(h.ratingChange)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
