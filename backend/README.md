# PuzzleArena backend

ASP.NET Core 10 Minimal API. Cần **.NET SDK 10**.

## Kiến trúc 3 lớp

```
PuzzleArena.Api          (1) Presentation   HTTP endpoint, SignalR hub, JWT, CORS, đồng hồ nền
      │  chỉ gọi xuống
      ▼
PuzzleArena.Business     (2) Business Logic  luật chơi, giải đấu, rating, bổ trợ, bảng xếp hạng, DTO
      │  chỉ gọi xuống
      ▼
PuzzleArena.DataAccess   (3) Data Access     entity, AppDb (EF Core), migration, chọn SQL Server / SQLite
```

- Mỗi lớp là một project riêng; tham chiếu chỉ đi một chiều **Api → Business → DataAccess**, nên trình biên dịch
  chặn luôn chuyện lớp dưới gọi ngược lên.
- **Api không đụng database**: endpoint chỉ đọc request, lấy người dùng hiện tại, gọi một service, đổi `ServiceResult`
  sang response (`ApiResults.From`).
- **Business không biết HTTP / SignalR**: trả `ServiceResult<T>` (giá trị hoặc lỗi + mã gợi ý). Cần báo tin realtime
  thì gọi interface `ITournamentNotifier`; lớp Api cài đặt nó bằng SignalR (`Realtime/SignalRTournamentNotifier`).
- **DataAccess không biết luật chơi**: chỉ có bảng, quan hệ, migration. EF Core `AppDb` đóng vai trò Repository +
  Unit of Work (mỗi `DbSet<T>` là một repository).
- Đăng ký: `Program.cs` gọi `AddBusiness(config)`; `AddBusiness` gọi `AddDataAccess(config)`.

Tạo migration mới (chạy trong `backend/`):

```bash
dotnet ef migrations add TenMigration --project PuzzleArena.DataAccess --startup-project PuzzleArena.Api --output-dir Migrations
```

## Chạy với SQL Server (mặc định)

Cần SQL Server cài trên máy (Express / Developer, instance mặc định `localhost`) và đăng nhập bằng tài khoản Windows.
Connection string mặc định (`appsettings.json`):

```
Server=localhost;Database=PuzzleArena;Trusted_Connection=True;TrustServerCertificate=True
```

```bash
cd backend/PuzzleArena.Api
dotnet run
```

Lần chạy đầu tự tạo database `PuzzleArena` và các bảng (migration chạy lúc khởi động).
API chạy ở `http://localhost:5000`; `GET /api/health` thấy `{"status":"ok"}` là được.
Frontend để `NEXT_PUBLIC_API_URL=http://localhost:5000` trong `frontend/.env.local`.

Máy dùng instance có tên (ví dụ `localhost\SQLEXPRESS`) hoặc LocalDB thì đổi connection string bằng biến môi trường,
không sửa file chung:

```bash
set ConnectionStrings__Default=Server=(localdb)\MSSQLLocalDB;Database=PuzzleArena;Trusted_Connection=True;TrustServerCertificate=True
```

Muốn làm lại dữ liệu từ đầu: xóa database `PuzzleArena` trong SSMS rồi chạy lại.

### Xem database

Mở **SQL Server Management Studio (SSMS)** → Server name `localhost`, Authentication *Windows Authentication*
(nếu báo lỗi chứng chỉ thì tick *Trust server certificate*) → **Databases → PuzzleArena → Tables** → chuột phải bảng →
*Select Top 1000 Rows*. Bảng `__EFMigrationsHistory` cho biết migration nào đã chạy.
⚠️ Không mở cột `Puzzles.Solution` khi đang chiếu màn hình trong giải: đó là đáp án.

## Chạy nhanh không cần SQL Server (SQLite)

```bash
cd backend/PuzzleArena.Api
dotnet run --launch-profile sqlite
```

Tạo file `puzzlearena.db` ngay trong thư mục này (đã có trong `.gitignore`). Xóa file để làm lại dữ liệu từ đầu.

## Redis (không bắt buộc)

`docker compose up -d` chạy Redis; đặt `ConnectionStrings__Redis=localhost:6379` để cache bảng xếp hạng bằng Redis.
Không có thì cache nằm trong bộ nhớ.

## Mở ra Internet để demo (trycloudflare.com)

Mọi thứ vẫn chạy trên máy bạn, kể cả SQL Server; Cloudflare chỉ mở đường hầm vào cổng web (3000, 5000),
không mở cổng SQL Server ra ngoài.

```bash
powershell -ExecutionPolicy Bypass -File scripts/tunnel.ps1
```

Thêm `-Sqlite` để chạy bằng file SQLite thay cho SQL Server.

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
- Mỗi trận có **phòng chờ**: hai người bấm "Vào thi", đủ cả hai thì đếm ngược rồi bắt đầu **cùng một giờ**
  (trước đó bàn chơi bị che). Không vào trước hạn thì bị xử thua. Đang thi không được bỏ cuộc / thoát trận.
- Cấu hình (để test/demo): `Tournaments:SpectatorDelaySeconds` (30), `Tournaments:RoundBreakSeconds` (30),
  `Tournaments:ReadySeconds` (120, hạn vào phòng), `Tournaments:CountdownSeconds` (5).

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
| Business: `Auth/`, `Admin/`, `Daily/`, `Profile/`, `Boosters/`, `Rating/`, `Seeding/DevSeeder.cs` · DataAccess: `AppDb.cs`, `Entities/User*`, `BoosterGrant`, migrations · Api: endpoint auth/admin/daily/profile/booster | BE1 |
| Business: `Games/` (Sudoku, Dò mìn, GameEngine, AttemptService, CheatDetector) · DataAccess: `Entities/Puzzle`, `Attempt` · Api: endpoint attempts | BE2 |
| Business: `Tournaments/`, `Leaderboard/`, `Seeding/DemoLeaderboardSeeder.cs` · DataAccess: `Entities/Tournament*` · Api: `Hubs/ArenaHub.cs`, `Realtime/`, endpoint tournaments/leaderboard · `scripts/demo-bots.mjs`, `scripts/tunnel.ps1` | BE3 |
