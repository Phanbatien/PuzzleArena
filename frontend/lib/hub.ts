import * as signalR from "@microsoft/signalr";

export let hubConnection: signalR.HubConnection | null = null;

export const startConnection = async () => {
    if (hubConnection?.state === signalR.HubConnectionState.Connected) return;

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    hubConnection = new signalR.HubConnectionBuilder()
        .withUrl("http://localhost:5000/hubs/arena", {
            accessTokenFactory: () => token || "" 
        })
        .withAutomaticReconnect([0, 2000, 10000, 30000])
        .configureLogging(signalR.LogLevel.Information)
        .build();

    try {
        await hubConnection.start();
        console.log("🟢 Đã kết nối SignalR thành công!");
    } catch (err) {
        console.error("🔴 Lỗi kết nối SignalR: ", err);
    }
};

export const stopConnection = async () => {
    if (hubConnection?.state === signalR.HubConnectionState.Connected) {
        await hubConnection.stop();
        console.log("Đã ngắt kết nối SignalR.");
    }
};