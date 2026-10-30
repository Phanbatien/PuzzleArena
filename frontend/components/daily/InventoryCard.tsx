import Card from "@/components/ui/Card";
import type { InventoryItem } from "@/types/game";

type InventoryCardProps = {
  items: InventoryItem[];
};

// Hai loại bổ trợ luôn được hiển thị, theo thứ tự này
const boosterTypes: InventoryItem["type"][] = ["Hint", "Shield"];

// Tên hiển thị bằng tiếng Việt
const boosterLabels: Record<InventoryItem["type"], string> = {
  Hint: "Gợi ý",
  Shield: "Khiên",
};

// Mô tả tác dụng: lời BE1 xác nhận ngày 2026-10-22.
// ASSUMPTION: BE1 nói theo code nhánh be1/tai-khoan-daily-rating,
// chưa kiểm chứng bằng backend thật.
const boosterDescriptions: Record<InventoryItem["type"], string> = {
  Hint: "Mở một ô còn trống trên bàn chơi hiện tại. Tốn 1. Không dùng trong giải đấu.",
  Shield:
    "Hủy một nước Sudoku sai, nước đó không tính là lỗi. Tốn 1. Không dùng trong giải đấu.",
};

// Cách nhận: cũng là lời BE1 (cùng ASSUMPTION như trên).
const boosterHowToEarn: Record<InventoryItem["type"], string> = {
  Hint: "Cách nhận: giải 1 đề daily trong ngày được 1 Gợi ý (một lần). Đề hỏng không tính.",
  Shield:
    "Cách nhận: giải 5 đề daily trong tuần được 1 Khiên (một lần). Đề hỏng không tính.",
};

export default function InventoryCard({ items }: InventoryCardProps) {
  // Không đặt title ở đây: tiêu đề "Kho bổ trợ" đã có ở app/daily/page.tsx
  return (
    <Card>
      <div className="grid gap-3 sm:grid-cols-2">
        {boosterTypes.map((type) => {
          // Tìm loại này trong dữ liệu API; nếu API không trả thì coi như 0
          const found = items.find((item) => item.type === type);
          const amount = found ? found.amount : 0;

          return (
            <div key={type} className="rounded-lg bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-slate-900">
                  {boosterLabels[type]}
                </p>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-bold ${
                    amount > 0
                      ? "bg-brand-50 text-brand-700"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {amount}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                {boosterDescriptions[type]}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {boosterHowToEarn[type]}
              </p>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Việc kiểm tra và sử dụng bổ trợ trong ván chơi do hệ thống chơi game xử
        lý.
      </p>
    </Card>
  );
}
