"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

type RequireAuthProps = {
  children: ReactNode;
  adminOnly?: boolean;
};

export default function RequireAuth({
  children,
  adminOnly = false,
}: RequireAuthProps) {
  const { user, isReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isReady && !user) {
      router.replace("/login");
    }
  }, [isReady, user, router]);

  if (!isReady || !user) {
    return <p className="p-6 text-slate-600">Đang kiểm tra đăng nhập...</p>;
  }

  if (adminOnly && user.role !== "Admin") {
    return (
      <p className="p-6 text-red-600">
        Bạn không có quyền truy cập khu vực này.
      </p>
    );
  }

  return <>{children}</>;
}
