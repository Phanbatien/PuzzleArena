"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ErrorMessage from "@/components/ui/ErrorMessage";
import Loading from "@/components/ui/Loading";
import { ApiError } from "@/lib/api";
import { getAdminUsers, grantBooster } from "@/lib/daily";
import type { AdminUser } from "@/types/auth";
import type { BoosterType } from "@/types/common";

const BOOSTER_LABEL: Record<BoosterType, string> = {
  Hint: "Gợi ý",
  Shield: "Khiên",
};

type Step = "form" | "confirm";

export default function AdminGrantForm() {
  // Danh sách người dùng để chọn
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Dữ liệu người dùng nhập vào form
  const [selectedUserId, setSelectedUserId] = useState("");
  const [type, setType] = useState<BoosterType>("Hint");
  const [amountText, setAmountText] = useState("1");
  const [formError, setFormError] = useState<string | null>(null);

  // Trạng thái gửi
  const [step, setStep] = useState<Step>("form");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Tải danh sách người dùng khi mở form (hoặc khi bấm "Thử lại")
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getAdminUsers();
        if (cancelled) return;
        setUsers(data);
        setLoadError(null);
      } catch (err) {
        if (cancelled) return;
        setLoadError(
          err instanceof ApiError
            ? err.message
            : "Không tải được danh sách người dùng.",
        );
      } finally {
        if (!cancelled) setLoadingUsers(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function handleRetry() {
    setLoadingUsers(true);
    setLoadError(null);
    setReloadKey((k) => k + 1);
  }

  const selectedUser = users.find((u) => String(u.id) === selectedUserId);
  const amount = Number(amountText);

  // Bấm "Tiếp tục": kiểm tra dữ liệu rồi sang bước xác nhận
  function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    setSuccessMessage(null);
    setSubmitError(null);

    if (!selectedUser) {
      setFormError("Hãy chọn người nhận.");
      return;
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      setFormError("Số lượng phải là số nguyên lớn hơn 0.");
      return;
    }
    setFormError(null);
    setStep("confirm");
  }

  // Bấm "Xác nhận": gửi lên backend
  async function handleConfirm() {
    if (!selectedUser) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await grantBooster({
        userId: selectedUser.id,
        type,
        amount,
      });
      setSuccessMessage(
        `Đã trao ${amount} ${BOOSTER_LABEL[type]} cho ${selectedUser.username}. ` +
          `Hiện người này có ${result.amount} ${BOOSTER_LABEL[result.type]}.`,
      );
      setAmountText("1");
    } catch (err) {
      // 403: backend trả "Bạn không có quyền thực hiện thao tác này."
      setSubmitError(
        err instanceof ApiError ? err.message : "Có lỗi xảy ra, hãy thử lại.",
      );
    } finally {
      setSubmitting(false);
      setStep("form");
    }
  }

  const selectClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm " +
    "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200";

  return (
    <Card title="Trao bổ trợ (dành cho admin)">
      {loadingUsers ? (
        <Loading text="Đang tải danh sách người dùng..." />
      ) : loadError ? (
        <ErrorMessage message={loadError} onRetry={handleRetry} />
      ) : users.length === 0 ? (
        <p className="text-sm text-slate-600">Chưa có người dùng nào.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {step === "form" ? (
            // SỬA: thêm noValidate để trình duyệt không tự chặn bằng thông báo tiếng Anh
            <form
              onSubmit={handleContinue}
              noValidate
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="grant-user"
                  className="text-sm font-medium text-slate-700"
                >
                  Người nhận
                </label>
                <select
                  id="grant-user"
                  className={selectClass}
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  <option value="">-- Chọn người dùng --</option>
                  {users.map((u) => (
                    <option key={u.id} value={String(u.id)}>
                      {u.username} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="grant-type"
                  className="text-sm font-medium text-slate-700"
                >
                  Loại bổ trợ
                </label>
                <select
                  id="grant-type"
                  className={selectClass}
                  value={type}
                  onChange={(e) => setType(e.target.value as BoosterType)}
                >
                  <option value="Hint">{BOOSTER_LABEL.Hint}</option>
                  <option value="Shield">{BOOSTER_LABEL.Shield}</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="grant-amount"
                  className="text-sm font-medium text-slate-700"
                >
                  Số lượng
                </label>
                <input
                  id="grant-amount"
                  type="number"
                  min={1}
                  step={1}
                  className={selectClass}
                  value={amountText}
                  onChange={(e) => setAmountText(e.target.value)}
                />
              </div>

              {formError && <ErrorMessage message={formError} />}

              <Button type="submit">Tiếp tục</Button>
            </form>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Bạn sắp trao <strong>{amount}</strong> {BOOSTER_LABEL[type]} cho{" "}
                <strong>{selectedUser?.username}</strong>. Xác nhận gửi?
              </p>
              <div className="flex gap-3">
                <Button onClick={handleConfirm} loading={submitting}>
                  Xác nhận
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setStep("form")}
                  disabled={submitting}
                >
                  Quay lại
                </Button>
              </div>
            </div>
          )}

          {successMessage && (
            <p
              role="status"
              className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700"
            >
              {successMessage}
            </p>
          )}
          {submitError && <ErrorMessage message={submitError} />}
        </div>
      )}
    </Card>
  );
}
