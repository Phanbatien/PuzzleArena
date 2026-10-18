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

// GIẢ ĐỊNH (cần xác nhận với BE1/BE2): mô tả tác dụng chỉ viết chung chung,
// vì hợp đồng chưa nói rõ chính xác Gợi ý và Khiên hoạt động thế nào.
const boosterDescriptions: Record<InventoryItem["type"], string> = {
  Hint: "Giúp bạn khi bị bí trong lúc chơi.",
  Shield: "Bảo vệ bạn khi mắc lỗi trong lúc chơi.",
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
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Bổ trợ không được dùng trong giải đấu. Việc kiểm tra và sử dụng bổ trợ
        trong ván chơi do hệ thống chơi game xử lý.
      </p>
    </Card>
  );
}
