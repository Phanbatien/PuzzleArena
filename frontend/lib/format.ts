// Hàm định dạng ngày giờ và thời lượng theo kiểu Việt Nam.

// "2026-10-17T07:30:00Z" -> "17/10/2026 14:30" (giờ Việt Nam)
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

// 245000 -> "4 phút 5 giây"; 45000 -> "45 giây"; null -> "—"
export function formatDuration(ms: number | null): string {
  if (ms === null || ms < 0) return "—";
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds} giây`;
  return `${minutes} phút ${seconds} giây`;
}