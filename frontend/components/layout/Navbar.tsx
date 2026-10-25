
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

type NavLink = {
  href: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
};

const links: NavLink[] = [
  { href: "/tournaments", label: "Giải đấu", icon: "♜" },
  { href: "/leaderboard", label: "Xếp hạng", icon: "↗" },
  { href: "/daily", label: "Daily Puzzle", icon: "✦" },
  { href: "/profile", label: "Hồ sơ", icon: "◉" },
  {
    href: "/admin/users",
    label: "Quản trị",
    icon: "⌘",
    adminOnly: true,
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isReady, logout } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Chỉ xác nhận component đã mount sau lần render đầu tiên.
  // Giúp server và client có cùng HTML ban đầu.
  useEffect(() => {
    setMounted(true);
  }, []);

  // Đóng menu mobile khi chuyển trang.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Chỉ sử dụng trạng thái xác thực sau khi component đã mount.
  const authReady = mounted && isReady;
  const currentUser = authReady ? user : null;

  const visibleLinks = links.filter((link) => {
    // Trong lúc chờ xác thực, chưa hiển thị link cần quyền đặc biệt.
    if (!authReady) {
      return !link.adminOnly &&
        link.href !== "/daily" &&
        link.href !== "/profile";
    }

    if (link.adminOnly) {
      return currentUser?.role === "Admin";
    }

    if (
      !currentUser &&
      (link.href === "/daily" || link.href === "/profile")
    ) {
      return false;
    }

    return true;
  });

  function isActive(href: string) {
    return (
      pathname === href ||
      (href !== "/" && pathname.startsWith(`${href}/`))
    );
  }

  function handleLogout() {
    setMenuOpen(false);
    logout();
    router.push("/login");
  }

  function renderLinks(mobile = false) {
    return visibleLinks.map((link) => {
      const active = isActive(link.href);

      return (
        <Link
          key={link.href}
          href={link.href}
          aria-current={active ? "page" : undefined}
          className={[
            "group flex items-center gap-2.5 rounded-xl px-3 py-2.5",
            "text-sm font-semibold transition-colors duration-200",
            mobile ? "w-full" : "whitespace-nowrap",
            active
              ? "border border-violet-400/20 bg-violet-500/15 text-violet-200"
              : "border border-transparent text-slate-400 hover:bg-white/[0.05] hover:text-white",
          ].join(" ")}
        >
          <span
            className={[
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg",
              "text-base transition-colors",
              active
                ? "bg-violet-400/15 text-cyan-300"
                : "text-slate-500 group-hover:text-cyan-300",
            ].join(" ")}
            aria-hidden="true"
          >
            {link.icon}
          </span>

          {link.label}

          {active && (
            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-300" />
          )}
        </Link>
      );
    });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#090D1B]/90 backdrop-blur-2xl">
      <nav
        className="mx-auto flex min-h-[72px] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-9"
        aria-label="Điều hướng chính"
      >
        {/* Logo */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-3"
          aria-label="PuzzleArena - Trang chủ"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-300/20 bg-gradient-to-br from-violet-500 to-indigo-700 text-xl font-black text-white shadow-lg shadow-violet-950/40">
            P
          </span>

          <span className="leading-tight">
            <span className="block text-[17px] font-black tracking-tight text-white">
              Puzzle<span className="text-cyan-300">Arena</span>
            </span>

            <span className="mt-1 hidden text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500 sm:block">
              Play smart. Rise higher.
            </span>
          </span>
        </Link>

        {/* Desktop navigation */}
        <div className="hidden items-center gap-1 xl:flex">
          {renderLinks()}
        </div>

        {/* Account actions */}
        <div className="flex shrink-0 items-center gap-2">
          {!authReady ? (
            <span className="h-10 w-24 animate-pulse rounded-xl bg-white/5" />
          ) : currentUser ? (
            <>
              <Link
                href="/profile"
                className="hidden items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 transition hover:border-violet-400/30 hover:bg-violet-500/10 md:flex"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/30 to-cyan-400/20 text-sm font-black text-cyan-200">
                  {currentUser.username?.slice(0, 1).toUpperCase() || "P"}
                </span>

                <span className="max-w-28 truncate text-xs font-bold text-slate-200">
                  {currentUser.username}
                </span>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="hidden rounded-xl border border-white/10 px-3 py-2.5 text-xs font-bold text-slate-300 transition hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-200 sm:block"
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-violet-950/30 transition hover:brightness-110"
            >
              Đăng nhập
              <span className="ml-1.5" aria-hidden="true">
                ↗
              </span>
            </Link>
          )}

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-lg text-slate-200 transition hover:border-violet-400/30 hover:bg-violet-500/10 xl:hidden"
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </nav>

      {/* Mobile navigation */}
      {menuOpen && (
        <div
          id="mobile-navigation"
          className="border-t border-white/[0.07] bg-[#0B1020] px-4 py-4 shadow-2xl xl:hidden sm:px-6"
        >
          <div className="mx-auto max-w-[1440px] space-y-1">
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Menu chính
            </p>

            {renderLinks(true)}

            {authReady && currentUser && (
              <>
                <div className="my-3 border-t border-white/[0.07]" />

                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="truncate text-sm font-semibold text-slate-300">
                    {currentUser.username}
                  </span>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="shrink-0 rounded-lg border border-rose-400/20 px-3 py-2 text-xs font-bold text-rose-200 transition hover:bg-rose-500/10"
                  >
                    Đăng xuất
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
