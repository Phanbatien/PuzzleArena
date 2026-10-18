"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import PageContainer from "@/components/layout/PageContainer";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/components/auth/AuthProvider";
import type { AuthResponse, LoginRequest, RegisterRequest } from "@/types/auth";

type Mode = "login" | "register";

// Trang đến sau khi đăng nhập hoặc đăng ký thành công.
const AFTER_LOGIN_PATH = "/daily";

type FieldErrors = {
  username?: string;
  email?: string;
  password?: string;
  confirm?: string;
};

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  // Đổi giữa đăng nhập và đăng ký: xóa lỗi và ô xác nhận mật khẩu.
  function switchMode(next: Mode) {
    setMode(next);
    setFieldErrors({});
    setServerError("");
    setConfirm("");
  }

  // Kiểm tra cơ bản ở frontend để người dùng biết lỗi ngay.
  // Luật chi tiết (độ dài tối thiểu, ký tự cho phép...) do backend quyết định
  // và backend trả lỗi dạng { error: "..." }, nên ở đây chỉ kiểm tra rỗng,
  // email có dấu "@" và xác nhận mật khẩu.
  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (username.trim() === "") {
      errors.username = "Vui lòng nhập tên tài khoản.";
    }
    if (mode === "register") {
      if (email.trim() === "") {
        errors.email = "Vui lòng nhập email.";
      } else if (!email.includes("@")) {
        errors.email = "Email không hợp lệ.";
      }
    }
    if (password === "") {
      errors.password = "Vui lòng nhập mật khẩu.";
    }
    if (mode === "register" && password !== "" && confirm !== password) {
      errors.confirm = "Mật khẩu xác nhận không khớp.";
    }
    return errors;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); // không cho trình duyệt tải lại trang khi bấm gửi
    setServerError("");

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      let auth: AuthResponse;
      if (mode === "login") {
        // BE1 đã xác nhận: login chỉ cần { username, password }.
        const body: LoginRequest = {
          username: username.trim(),
          password,
        };
        auth = await api.post<AuthResponse>("/api/auth/login", body);
      } else {
        // BE1 đã xác nhận: register cần { username, email, password }.
        const body: RegisterRequest = {
          username: username.trim(),
          email: email.trim(),
          password,
        };
        auth = await api.post<AuthResponse>("/api/auth/register", body);
      }
      login(auth); // lưu token + user, cả app cập nhật
      router.push(AFTER_LOGIN_PATH);
    } catch (err) {
      setServerError(
        err instanceof ApiError
          ? err.message
          : "Có lỗi xảy ra. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  }

  const isLogin = mode === "login";

  return (
    <PageContainer
      title={isLogin ? "Đăng nhập" : "Đăng ký"}
      description="Đăng nhập để chơi Daily Puzzle và theo dõi xếp hạng."
    >
      <div className="mx-auto max-w-md">
        <Card>
          <div className="mb-4 flex gap-2">
            <Button
              variant={isLogin ? "primary" : "secondary"}
              onClick={() => switchMode("login")}
              className="flex-1"
            >
              Đăng nhập
            </Button>
            <Button
              variant={isLogin ? "secondary" : "primary"}
              onClick={() => switchMode("register")}
              className="flex-1"
            >
              Đăng ký
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              label="Tên tài khoản"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              error={fieldErrors.username}
              autoComplete="username"
              disabled={loading}
            />
            {!isLogin && (
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={fieldErrors.email}
                autoComplete="email"
                disabled={loading}
              />
            )}
            <Input
              label="Mật khẩu"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              autoComplete={isLogin ? "current-password" : "new-password"}
              disabled={loading}
            />
            {!isLogin && (
              <Input
                label="Xác nhận mật khẩu"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                error={fieldErrors.confirm}
                autoComplete="new-password"
                disabled={loading}
              />
            )}

            {serverError && <ErrorMessage message={serverError} />}

            <Button type="submit" loading={loading} className="w-full">
              {isLogin ? "Đăng nhập" : "Tạo tài khoản"}
            </Button>
          </form>
        </Card>
      </div>
    </PageContainer>
  );
}
