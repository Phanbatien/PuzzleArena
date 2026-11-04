import * as signalR from "@microsoft/signalr";
import { API_URL } from "@/lib/config";
import { TOKEN_KEY } from "@/lib/api";

export let hubConnection: signalR.HubConnection | null = null;

// Nhiều trang/effect có thể gọi startConnection cùng lúc: tất cả chờ chung một lần start().
let starting: Promise<void> | null = null;

// Nhóm đã tham gia (Watch/Monitor + id). Kết nối lại thì server cấp connection id mới và
// quên nhóm cũ, nên phải tham gia lại, nếu không trang sẽ ngừng nhận dữ liệu live.
// ponytail: không bỏ nhóm khi rời trang; chỉ tốn vài event thừa, thêm leaveGroup nếu cần.
const joined = new Map<string, () => Promise<unknown>>();

export const joinGroup = (conn: signalR.HubConnection, method: "Watch" | "Monitor", tournamentId: number | string) => {
  const join = () => conn.invoke(method, Number(tournamentId) || tournamentId);
  joined.set(`${method}:${tournamentId}`, join);
  return join();
};

export const startConnection = async (): Promise<signalR.HubConnection | null> => {
  if (typeof window === "undefined") return null;

  if (hubConnection?.state === signalR.HubConnectionState.Connected) {
    return hubConnection;
  }

  if (!hubConnection) {
    hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_URL}/hubs/arena`, {
        accessTokenFactory: () => window.localStorage.getItem(TOKEN_KEY) || "",
      })
      .withAutomaticReconnect([0, 2000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();
    hubConnection.onreconnected(() => {
      joined.forEach((join) => void join().catch(() => {}));
    });
  }

  if (hubConnection.state === signalR.HubConnectionState.Disconnected && !starting) {
    starting = hubConnection.start().finally(() => {
      starting = null;
    });
  }

  try {
    if (starting) await starting;
  } catch (err) {
    console.warn("🟡 Không kết nối được SignalR (chuyển sang chế độ chờ/mock):", err);
    return null;
  }

  return hubConnection.state === signalR.HubConnectionState.Connected ? hubConnection : null;
};

export const stopConnection = async () => {
  if (hubConnection && hubConnection.state === signalR.HubConnectionState.Connected) {
    try {
      await hubConnection.stop();
    } catch {
      // Bỏ qua lỗi khi ngắt kết nối
    }
  }
};