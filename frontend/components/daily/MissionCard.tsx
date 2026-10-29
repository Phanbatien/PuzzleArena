import Card from "@/components/ui/Card";
import type { Mission } from "@/types/game";

type MissionCardProps = {
  mission: Mission;
};

// Tên phần thưởng hiển thị bằng tiếng Việt
const rewardLabels: Record<Mission["rewardType"], string> = {
  Hint: "Gợi ý",
  Shield: "Khiên",
};

// Nhãn chu kỳ hiển thị bằng tiếng Việt
const periodLabels: Record<Mission["period"], string> = {
  Daily: "Nhiệm vụ ngày",
  Weekly: "Nhiệm vụ tuần",
};

export default function MissionCard({ mission }: MissionCardProps) {
  const {
    period,
    title,
    progress,
    target,
    completed,
    rewardType,
    rewardAmount,
    rewardClaimed,
  } = mission;

  // Chỉ để VẼ thanh tiến độ, giới hạn trong khoảng 0..100.
  // Nếu target là 0 thì để 0% (tránh chia cho 0).
  const percent =
    target > 0 ? Math.min(100, Math.max(0, (progress / target) * 100)) : 0;

  // Trạng thái phần thưởng: hoàn toàn dựa trên dữ liệu API
  let rewardText = "Chưa hoàn thành";
  let rewardClass = "bg-slate-100 text-slate-700";
  if (completed && rewardClaimed) {
    rewardText = "Đã nhận thưởng";
    rewardClass = "bg-green-100 text-green-800";
  } else if (completed && !rewardClaimed) {
    rewardText = "Hoàn thành, chờ nhận thưởng";
    rewardClass = "bg-amber-100 text-amber-800";
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{periodLabels[period]}</p>
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${rewardClass}`}
        >
          {rewardText}
        </span>
      </div>

      <div className="mt-4">
        <div
          className="h-3 w-full overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(percent)}
        >
          <div
            className="h-full rounded-full bg-brand-600 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Tiến độ: {progress}/{target}
        </p>
      </div>

      <p className="mt-3 text-sm text-slate-700">
        Phần thưởng:{" "}
        <span className="font-semibold">
          {rewardAmount} {rewardLabels[rewardType]}
        </span>
      </p>
    </Card>
  );
}
