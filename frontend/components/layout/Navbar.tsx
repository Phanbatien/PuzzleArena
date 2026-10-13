"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Button from "@/components/ui/Button";

const links = [
  { href: "/daily", label: "Daily" },
  { href: "/profile", label: "Hồ sơ" },
  { href: "/admin/users", label: "Quản trị" },
];

export default function Navbar() {
  const pathname = usePathname();

  function handleLogout() {
    // TẠM THỜI: Giai đoạn 3 sẽ thay bằng đăng xuất thật (xóa phiên, về /login)
    alert("Chưa có đăng nhập thật. Nút này sẽ hoạt động ở Giai đoạn 3.");
  }

  return (
    <nav className="sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="text-xl font-bold text-brand-700">
          PuzzleArena
        </Link>

        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          {links.map((link) => {
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

          <Button variant="secondary" onClick={handleLogout}>
            Đăng xuất
          </Button>
        </div>
      </div>
    </nav>
  );
}
