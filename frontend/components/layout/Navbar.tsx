"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { useAuth } from "@/components/auth/AuthProvider";

type NavLink = {
  href: string;
  label: string;
  adminOnly?: boolean;
};

const links: NavLink[] = [
  { href: "/daily", label: "Daily" },
  { href: "/profile", label: "Hồ sơ" },
  { href: "/admin/users", label: "Quản trị", adminOnly: true },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isReady, logout } = useAuth();

  function handleLogout() {
    logout(); // xóa token + user, cả app cập nhật
    router.push("/login");
  }

  // Chỉ admin mới thấy link "Quản trị".
  // LƯU Ý: đây chỉ là ẨN GIAO DIỆN cho gọn, KHÔNG phải bảo mật.
  // Backend vẫn phải tự kiểm tra quyền admin ở mọi API /api/admin/...
  const visibleLinks = links.filter(
    (link) => !link.adminOnly || user?.role === "Admin",
  );

  return (
    <nav className="sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="text-xl font-bold text-brand-700">
          PuzzleArena
        </Link>

        {/* Chỉ hiện phần bên phải khi đã đọc xong phiên đăng nhập, tránh nháy giao diện */}
        {isReady && user && (
          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
            {visibleLinks.map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-brand-100 text-brand-700"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}

            <span className="hidden px-2 text-sm text-slate-500 sm:inline">
              {user.username}
            </span>

            <Button variant="secondary" onClick={handleLogout}>
              Đăng xuất
            </Button>
          </div>
        )}

        {isReady && !user && (
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
          >
            Đăng nhập
          </Link>
        )}
      </div>
    </nav>
  );
}
