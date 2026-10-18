import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import type { AdminUser } from "@/types/auth";

type UserTableProps = {
  users: AdminUser[];
  currentUserId: number | undefined; // id của admin đang đăng nhập
  busyId: number | null; // id người dùng đang được cập nhật (nếu có)
  onToggleLock: (user: AdminUser) => void;
  onToggleRole: (user: AdminUser) => void;
};

export default function UserTable({
  users,
  currentUserId,
  busyId,
  onToggleLock,
  onToggleRole,
}: UserTableProps) {
  return (
    <Card>
      {/* Bảng rộng sẽ cuộn ngang trong khung này, không làm cả trang bị tràn */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2 pr-3 font-medium">Tài khoản</th>
              <th className="py-2 pr-3 font-medium">Vai trò</th>
              <th className="py-2 pr-3 font-medium">Trạng thái</th>
              <th className="py-2 font-medium">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isSelf = u.id === currentUserId;
              const isBusy = busyId === u.id;
              // Khi một dòng đang xử lý thì khóa mọi nút để tránh bấm chồng
              const disabled = isSelf || busyId !== null;

              return (
                <tr key={u.id} className="border-b border-slate-100">
                  <td className="py-3 pr-3 font-semibold text-slate-900">
                    {u.username}
                    {isSelf && (
                      <span className="ml-2 text-xs font-normal text-slate-500">
                        (bạn)
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        u.role === "Admin"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-brand-50 text-brand-700"
                      }`}
                    >
                      {u.role === "Admin" ? "Admin" : "Player"}
                    </span>
                  </td>
                  <td className="py-3 pr-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        u.isLocked
                          ? "bg-red-100 text-red-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {u.isLocked ? "Bị khóa" : "Hoạt động"}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={u.isLocked ? "primary" : "danger"}
                        loading={isBusy}
                        disabled={disabled}
                        onClick={() => onToggleLock(u)}
                      >
                        {u.isLocked ? "Mở khóa" : "Khóa"}
                      </Button>
                      <Button
                        variant="secondary"
                        loading={isBusy}
                        disabled={disabled}
                        onClick={() => onToggleRole(u)}
                      >
                        {u.role === "Admin"
                          ? "Đổi thành Player"
                          : "Đổi thành Admin"}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
