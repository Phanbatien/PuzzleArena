// Địa chỉ backend. Nếu .env.local không khai báo thì dùng giá trị mặc định bên dưới.
// GIẢ ĐỊNH cần xác nhận với BE1: cổng của backend khi chạy trên máy (ở đây tạm để 5000).
export const API_URL: string =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

// Công tắc mock: chỉ khi biến này đúng bằng chữ "true" thì mới dùng dữ liệu giả.
// Không khai báo hoặc khai báo giá trị khác thì mặc định là API thật.
// Như vậy dữ liệu giả không thể vô tình chạy trên production.
export const USE_MOCK: boolean = process.env.NEXT_PUBLIC_USE_MOCK === "true";