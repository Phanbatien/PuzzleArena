import Card from "@/components/ui/Card";
import type { UserRating } from "@/types/game";

type RatingCardProps = {
  rating: UserRating;
};

// Tên game hiển thị bằng tiếng Việt
const gameLabels: Record<UserRating["gameType"], string> = {
  Sudoku: "Sudoku",
  Minesweeper: "Dò mìn",
};

// Độ khó hiển thị bằng tiếng Việt
const difficultyLabels: Record<UserRating["suggestedDifficulty"], string> = {
  Easy: "Dễ",
  Medium: "Vừa",
  Hard: "Khó",
};

export default function RatingCard({ rating }: RatingCardProps) {
  const { gameType, value, rankName, nextMilestone, suggestedDifficulty } =
    rating;

  // Chỉ để VẼ thanh tiến độ (không phải tính điểm Elo):
  // phần trăm = điểm hiện tại / điểm mốc, giới hạn trong khoảng 0..100.
  let percent = 100;
  let pointsLeft = 0;
  if (nextMilestone !== null) {
    percent = Math.min(100, Math.max(0, (value / nextMilestone) * 100));
    pointsLeft = Math.max(0, nextMilestone - value);
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{gameLabels[gameType]}</p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
        </div>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
          {rankName}
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
          {nextMilestone === null
            ? "Bạn đang ở hạng cao nhất."
            : `Còn ${pointsLeft} điểm nữa để lên hạng tiếp theo (mốc ${nextMilestone}).`}
        </p>
      </div>

      <p className="mt-3 text-sm text-slate-700">
        Độ khó phù hợp với bạn:{" "}
        <span className="font-semibold">
          {difficultyLabels[suggestedDifficulty]}
        </span>
      </p>
    </Card>
  );
}
