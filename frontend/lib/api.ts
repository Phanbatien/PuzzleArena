import { API_URL } from "@/lib/config";

// GIẢ ĐỊNH tạm: khóa lưu token. Giai đoạn 3 (lib/auth.ts) sẽ chốt lại, cả nhóm FE phải dùng chung.
export const TOKEN_KEY = "puzzlearena_token";

// Lỗi chuẩn của ứng dụng: trang nào bắt lỗi cũng nhận đúng kiểu này.
export class ApiError extends Error {
  status: number; // mã HTTP; 0 nghĩa là không kết nối được backend

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

// Hàm xử lý khi token hết hạn (API trả 401). AuthProvider sẽ đăng ký hàm này.
type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

// Lấy token đã lưu (chỉ chạy được trên trình duyệt)
function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

// Thông báo mặc định khi backend không gửi { error: "..." }
function defaultMessage(status: number): string {
  switch (status) {
    case 400:
      return "Dữ liệu gửi lên không hợp lệ.";
    case 401:
      return "Phiên đăng nhập đã hết hạn hoặc chưa đăng nhập. Vui lòng đăng nhập lại.";
    case 403:
      return "Bạn không có quyền thực hiện thao tác này.";
    case 404:
      return "Không tìm thấy dữ liệu yêu cầu.";
    case 500:
      return "Máy chủ đang gặp sự cố. Vui lòng thử lại sau.";
    default:
      return "Có lỗi xảy ra. Vui lòng thử lại.";
  }
}

async function request<T>(
  method: Method,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {};

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    // fetch ném lỗi khi mất mạng, backend chưa chạy, hoặc bị chặn CORS
    throw new ApiError(
      "Không kết nối được tới máy chủ. Hãy kiểm tra mạng hoặc xem backend đã chạy chưa.",
      0,
    );
  }

  // Đọc nội dung dạng chữ trước, rồi tự thử chuyển sang JSON.
  // Làm vậy để không bị crash khi backend trả về rỗng hoặc không phải JSON.
  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    let message = defaultMessage(response.status);
    if (
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "string"
    ) {
      message = (data as { error: string }).error;
    }

    // Token hết hạn: chỉ báo khi đã gửi token đi, và không tính các API đăng nhập/đăng ký
    // (vì đăng nhập sai mật khẩu cũng có thể trả 401, lúc đó không phải hết hạn).
    if (
      response.status === 401 &&
      token &&
      !path.startsWith("/api/auth/") &&
      unauthorizedHandler
    ) {
      unauthorizedHandler();
    }

    throw new ApiError(message, response.status);
  }

  return data as T;
}

// Cách dùng: api.get<DailyPuzzle[]>("/api/daily?game=Sudoku")
export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};

// Định dạng thông báo lỗi cho phòng chơi và trang quản trị chống gian lận
export function formatApiError(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 400:
        return "Nước đi không hợp lệ, lượt chơi đã kết thúc, hết giờ hoặc đề daily không phải hôm nay.";
      case 401:
        return "Phiên đăng nhập đã hết hạn hoặc chưa đăng nhập. Vui lòng đăng nhập lại.";
      case 403:
        return "Lượt chơi này không thuộc về bạn.";
      case 404:
        return "Không tìm thấy lượt chơi hoặc đề bài.";
      default:
        return error.message || `Yêu cầu thất bại (mã ${error.status}).`;
    }
  }
  return "Đã xảy ra lỗi không xác định.";
}
