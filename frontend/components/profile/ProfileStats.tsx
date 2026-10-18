import Card from "@/components/ui/Card";
import { formatDuration } from "@/lib/format";
import type { PlayHistory } from "@/types/game";

type ProfileStatsProps = {
  streak: number; // từ GET /api/me, do backend tính
  history: PlayHistory[];
};

export default function ProfileStats({ streak, history }: ProfileStatsProps) {
  // GIẢ ĐỊNH (cần BE1 xác nhận): hợp đồng chưa có API thống kê, nên số đề đã giải
  // và thời gian trung bình được đếm từ danh sách lịch sử. Đây chỉ là TỔNG HỢP
  // để hiển thị, KHÔNG phải quyết định thắng/thua (status do backend trả về).
  const solved = history.filter((h) => h.status === "Solved");
  const timed = solved.filter((h) => h.durationMs !== null);
  const averageMs =
    timed.length > 0
      ? timed.reduce((sum, h) => sum + (h.durationMs ?? 0), 0) / timed.length
      : null;

  const items = [
    { label: "Chuỗi ngày chơi liên tục", value: `${streak} ngày` },
    { label: "Số đề đã giải", value: String(solved.length) },
    { label: "Thời gian giải trung bình", value: formatDuration(averageMs) },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <Card key={item.label}>
          <p className="text-sm text-slate-500">{item.label}</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{item.value}</p>
        </Card>
      ))}
    </div>
  );
}
