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

## Demo giải đấu một mình

1. Admin tạo giải Sudoku ở `/tournaments`.
2. Chạy bot (bot dùng `player1..8`, tự đăng ký và tự chơi cả 2 vòng):

   ```bash
   node scripts/demo-bots.mjs <tournamentId> [soBot=8] [msMoiNuoc=600]
   ```

3. Admin bấm chuyển vòng ở trang giải. Hết giờ thì vòng tự đóng.
4. Mở `/tournaments/<id>/monitor` bằng tài khoản admin để xem bàn chơi chung kết chạy live.

## Ai làm phần nào

| Thư mục / file | Người |
|---|---|
| `Auth/`, `Boosters/`, `Rating/`, `Data/AppDb.cs`, `DevSeeder.cs`, migrations, các endpoint auth/daily/profile/booster/admin | BE1 |
| `Games/` (Sudoku, Dò mìn, GameEngine, AttemptService, CheatDetector), endpoint attempts | BE2 |
| `Tournaments/`, `Hubs/ArenaHub.cs`, `Entities/Tournament*.cs`, `Endpoints/TournamentEndpoints.cs`, `Endpoints/LeaderboardEndpoints.cs`, `DemoLeaderboardSeeder.cs`, `scripts/demo-bots.mjs` | BE3 |
