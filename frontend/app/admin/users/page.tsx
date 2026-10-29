"use client";

import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@/components/auth/RequireAuth";
import { useAuth } from "@/components/auth/AuthProvider";
import PageContainer from "@/components/layout/PageContainer";
import UserTable from "@/components/admin/UserTable";
import ErrorMessage from "@/components/ui/ErrorMessage";
import Input from "@/components/ui/Input";
import Loading from "@/components/ui/Loading";
import { ApiError } from "@/lib/api";
import { getUsers, setUserLocked, setUserRole } from "@/lib/admin";
import type { AdminUser } from "@/types/auth";

function AdminUsersContent() {
  const { user: me } = useAuth();

  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Tải danh sách khi mở trang (hoặc khi bấm "Thử lại")
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const list = await getUsers();
        if (cancelled) return;
        setUsers(list);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Không tải được danh sách người dùng.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function handleRetry() {
    setLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  }

  // Lọc theo tên tài khoản ngay trên trình duyệt (hợp đồng chưa có API tìm kiếm)
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const keyword = search.trim().toLowerCase();
    if (keyword === "") return users;
    return users.filter((u) => u.username.toLowerCase().includes(keyword));
  }, [users, search]);

  // Chạy một thao tác PATCH, rồi TẢI LẠI danh sách từ backend để dữ liệu chính xác.
  async function runAction(id: number, action: () => Promise<unknown>) {
    setBusyId(id);
    setActionError(null);
    try {
      await action();
      const list = await getUsers();
      setUsers(list);
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : "Không thực hiện được thao tác.",
      );
    } finally {
      setBusyId(null);
    }
  }

  function handleToggleLock(target: AdminUser) {
    const nextLocked = !target.isLocked;
    const question = nextLocked
      ? `Khóa tài khoản "${target.username}"? Người này sẽ không đăng nhập được.`
      : `Mở khóa tài khoản "${target.username}"?`;
    if (!window.confirm(question)) return;
    runAction(target.id, () => setUserLocked(target.id, nextLocked));
  }

  function handleToggleRole(target: AdminUser) {
    const nextRole = target.role === "Admin" ? "Player" : "Admin";
    const question = `Đổi vai trò của "${target.username}" thành ${nextRole}?`;
    if (!window.confirm(question)) return;
    runAction(target.id, () => setUserRole(target.id, nextRole));
  }

  if (loading) {
    return <Loading text="Đang tải danh sách người dùng..." />;
  }

  if (error || !users) {
    return (
      <ErrorMessage
        message={error ?? "Không tải được danh sách người dùng."}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Input
        label="Tìm theo tên tài khoản"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Ví dụ: player1"
      />

      {/* Lỗi của thao tác khóa/đổi vai trò (ví dụ 403) hiện ở đây */}
      {actionError && <ErrorMessage message={actionError} />}

      {users.length === 0 ? (
        <p className="text-sm text-slate-600">Chưa có người dùng nào.</p>
      ) : filteredUsers.length === 0 ? (
        <p className="text-sm text-slate-600">
          Không tìm thấy tài khoản nào khớp với &quot;{search}&quot;.
        </p>
      ) : (
        <UserTable
          users={filteredUsers}
          currentUserId={me?.id}
          busyId={busyId}
          onToggleLock={handleToggleLock}
          onToggleRole={handleToggleRole}
        />
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <RequireAuth adminOnly>
      <PageContainer
        title="Quản lý người dùng"
        description="Xem danh sách, khóa hoặc mở khóa tài khoản và đổi vai trò."
      >
        <AdminUsersContent />
      </PageContainer>
    </RequireAuth>
  );
}
