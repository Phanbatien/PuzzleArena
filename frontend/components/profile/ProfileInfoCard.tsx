import Card from "@/components/ui/Card";
import type { MeProfile } from "@/types/profile";

type ProfileInfoCardProps = {
  me: MeProfile;
};

// Tên vai trò hiển thị bằng tiếng Việt
const roleLabels: Record<MeProfile["role"], string> = {
  Admin: "Quản trị viên (Admin)",
  Player: "Người chơi (Player)",
};

export default function ProfileInfoCard({ me }: ProfileInfoCardProps) {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Tên người chơi</p>
          <p className="text-2xl font-bold text-slate-900">{me.username}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ${
            me.role === "Admin"
              ? "bg-amber-100 text-amber-800"
              : "bg-brand-50 text-brand-700"
          }`}
        >
          {roleLabels[me.role]}
        </span>
      </div>
    </Card>
  );
}
