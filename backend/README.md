# PuzzleArena backend

ASP.NET Core 10 Minimal API. Cần **.NET SDK 10**.

## Chạy nhanh (không cần Docker)

Dùng SQLite. File `puzzlearena.db` được tạo tự động và đã có trong `.gitignore`.

```bash
cd backend/PuzzleArena.Api
dotnet run --launch-profile sqlite
```

API chạy ở `http://localhost:5000`. Gọi `GET /api/health` thấy `{"status":"ok"}` là được.
Frontend để `NEXT_PUBLIC_API_URL=http://localhost:5000` trong `frontend/.env.local`.

Muốn làm lại dữ liệu từ đầu thì tắt server, xóa `puzzlearena.db` rồi chạy lại.

## Chạy với PostgreSQL + Redis (giống môi trường thật)

```bash
docker compose up -d
cd backend/PuzzleArena.Api
dotnet run
```

Database tự chạy migration lúc khởi động. Redis chỉ được dùng khi có `ConnectionStrings:Redis`,
ví dụ `ConnectionStrings__Redis=localhost:6379`; nếu không có thì cache nằm trong bộ nhớ.

## Mở ra Internet để demo (trycloudflare.com)

Mọi thứ vẫn chạy trên máy bạn (database là file SQLite ở trên); Cloudflare chỉ mở đường hầm vào máy.

```bash
powershell -ExecutionPolicy Bypass -File scripts/tunnel.ps1
```

Script mở 2 đường hầm (backend, frontend), chạy backend với CORS cho đúng địa chỉ frontend,
build frontend trỏ tới địa chỉ backend, rồi in link `https://....trycloudflare.com` để gửi cho người khác.
Ctrl+C tắt tất cả. Cần cài `cloudflared` (`winget install --id Cloudflare.cloudflared`). Log ở `.tunnel-logs/`.

⚠️ Đang ở chế độ Development: ai có link cũng đăng nhập được bằng tài khoản dùng thử, kể cả admin. Chỉ mở trong lúc demo.

Chạy backend ở nơi khác (VPS, Render...) thì đặt địa chỉ frontend qua `Cors__Origins__0`, `Cors__Origins__1`...
(mặc định chỉ cho `http://localhost:3000`).

## Tài khoản dùng thử (chỉ ở môi trường Development)

| Tài khoản | Mật khẩu | Vai trò |
|---|---|---|
| `admin` | `123456` | Admin |
| `player1` … `player8` | `123456` | Player |

Hai launch profile đều bật `Seed:FakeLeaderboard`: thêm 12 người chơi giả cùng kết quả daily
3 ngày gần nhất, để bảng xếp hạng không trống. Các tài khoản giả này không đăng nhập được.

## Test

```bash
dotnet test backend
```

## Giải đấu: thể thức

- Admin đặt **giờ bắt đầu**, số suất nhánh đấu (4/8/16/32), số phút mỗi trận và luật riêng. Đăng ký đóng lúc bắt đầu.
- Tới giờ, giải tự chạy:
  - số người ≤ số suất: vào thẳng **nhánh loại trực tiếp 1-1**, hạt giống theo điểm hạng, hạt giống cao được miễn vòng 1 nếu lẻ;
  - đông hơn: **vòng loại** chung một đề trước, top N vào nhánh đấu (vòng loại đóng sớm khi mọi người đã làm xong).
- Mỗi trận: hai người cùng một đề (mỗi trận một đề riêng). Giải xong trước thắng; sai quá số lỗi / trúng mìn / bỏ cuộc là thua;
  hết giờ thì tiến độ cao hơn thắng, rồi ít lỗi hơn, rồi hạt giống cao hơn. Xong vòng nghỉ 30 giây rồi vào vòng sau.
- Khán giả (`/tournaments/<id>/watch`) xem cả hai người của mỗi trận, nhiều trận cùng lúc, **trễ 30 giây**;
  người đang thi không xem được trận của mình. Admin xem thời gian thực ở `/monitor`.
- Cấu hình (để test/demo): `Tournaments:SpectatorDelaySeconds` (mặc định 30), `Tournaments:RoundBreakSeconds` (mặc định 30).

## Demo giải đấu một mình

1. Admin tạo giải Sudoku ở `/tournaments`, giờ bắt đầu vài phút nữa.
2. Chạy bot trước giờ bắt đầu (bot dùng `player1..8`, tự đăng ký, tự vào thi vòng loại và từng trận của mình):

   ```bash
   node scripts/demo-bots.mjs <tournamentId> [soBot=8] [msMoiNuoc=600]
   ```

3. Giải tự chạy theo giờ; admin bấm "chuyển vòng" ở trang giải để bỏ qua thời gian chờ.
4. Mở `/tournaments/<id>/watch` để xem như khán giả (trễ 30 giây), `/monitor` bằng tài khoản admin để xem thời gian thực.

## Ai làm phần nào

| Thư mục / file | Người |
|---|---|
| `Auth/`, `Boosters/`, `Rating/`, `Data/AppDb.cs`, `DevSeeder.cs`, migrations, các endpoint auth/daily/profile/booster/admin | BE1 |
| `Games/` (Sudoku, Dò mìn, GameEngine, AttemptService, CheatDetector), endpoint attempts | BE2 |
| `Tournaments/`, `Hubs/ArenaHub.cs`, `Entities/Tournament*.cs`, `Endpoints/TournamentEndpoints.cs`, `Endpoints/LeaderboardEndpoints.cs`, `DemoLeaderboardSeeder.cs`, `scripts/demo-bots.mjs` | BE3 |
