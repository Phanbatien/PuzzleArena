import * as signalR from "@microsoft/signalr";
import { API_URL } from "@/lib/config";
import { TOKEN_KEY } from "@/lib/api";

export let hubConnection: signalR.HubConnection | null = null;

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
  }

  if (hubConnection.state === signalR.HubConnectionState.Disconnected) {
    try {
      await hubConnection.start();
      console.log("🟢 Đã kết nối SignalR (/hubs/arena) thành công!");
    } catch (err) {
      console.warn("🟡 Không kết nối được SignalR (chuyển sang chế độ chờ/mock):", err);
      return null;
    }
  }

  return hubConnection;
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