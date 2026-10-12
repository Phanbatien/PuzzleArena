# PuzzleArena — Phân công nhóm 6 người (3 Backend · 3 Frontend)

> File duy nhất cả nhóm cần đọc: đề bài, công nghệ, cần học gì, ai code phần nào, giao tiếp giữa các phần, lịch và quy tắc.
> **Nguyên tắc: ai cũng phải code.** Nhóm chia thành **3 cặp, mỗi cặp 1 Backend (BE) + 1 Frontend (FE)**.
> Mỗi cặp làm trọn một mảng tính năng từ database → API → giao diện, nên mảng nào cũng có người chịu trách nhiệm từ đầu tới cuối,
> và BE/FE của cùng cặp luôn biết rõ API mình đang nối với nhau.

---

## 1. Đề bài

Hệ thống tổ chức giải đấu game giải đố trực tuyến: **Sudoku** và **Dò mìn (Minesweeper)**.
Bài toán chính: **kết quả công bằng, không gian lận được** — server sinh đề, giữ đáp án và kiểm tra từng nước đi.

Yêu cầu đã chốt với thầy:

1. **Giải đấu 2 vòng**
   - Vòng loại: không giới hạn người, **bắt đầu cùng lúc, cùng một đề**, xếp hạng theo thời gian (bằng nhau thì ít lỗi hơn đứng trên).
   - Chung kết: **top 6** nhanh nhất giải **một đề khác**.
   - Có **màn hình riêng cho ban tổ chức** chiếu bàn chơi của 6 người chung kết cùng lúc. Khán giả xem được tiến độ.
2. **Daily puzzle** để giữ chân người chơi khi không có giải: mỗi ngày có đề mới, có **top ngày, top tuần**.
   Giải đề càng khó hạng càng lên, giải hỏng thì tụt hạng để về mức vừa sức.
3. **Luật chơi:** Sudoku sai tối đa **3 lần** là thua. Dò mìn mở trúng mìn là thua. Đăng xuất thì ván dừng ngay.
4. **Bổ trợ** (Gợi ý, Khiên): nhận khi xong nhiệm vụ ngày / nhiệm vụ tuần, hoặc admin trao. Không dùng trong giải đấu.
5. Đề sinh **ngẫu nhiên theo độ khó** (Dễ / Vừa / Khó).

## 2. Công nghệ

| Tầng | Công nghệ | Ai dùng |
|---|---|---|
| Frontend | Next.js (App Router) · React · TypeScript · Tailwind CSS | FE |
| Realtime | SignalR — server (C#) và client (`@microsoft/signalr`) | BE3 + FE3 |
| Backend | ASP.NET Core Minimal API (C#) — server làm trọng tài | BE |
| Data | PostgreSQL qua EF Core · Redis (cache bảng xếp hạng) | BE |
| Test | xUnit (BE) · kiểm thử tay theo checklist (FE) | cả nhóm |

Cài trên máy mỗi người: Git, VS Code. BE thêm .NET SDK 10 + Docker Desktop. FE thêm Node.js 20+.
**FE vẫn phải chạy được backend trên máy mình** (cần .NET SDK) để tự test giao diện với API thật.

## 3. Học gì (tuần 1)

**Cả nhóm:** Git — https://git-scm.com/book/vi/v2 (branch, commit, pull request, xử lý conflict), và đọc kỹ mục 5 (hợp đồng API).

| Backend | Học tới đâu là đủ |
|---|---|
| C# — https://learn.microsoft.com/dotnet/csharp/tour-of-csharp/ | class, record, enum, LINQ, async/await |
| Minimal API — https://learn.microsoft.com/aspnet/core/fundamentals/minimal-apis | MapGet/MapPost, nhận body JSON, trả `Results.Ok/BadRequest` |
| EF Core — https://learn.microsoft.com/ef/core/get-started/overview/first-app | DbContext, quan hệ 1–N, migrations, truy vấn LINQ |
| Xác thực — https://learn.microsoft.com/aspnet/core/security/authentication/ | JWT, `RequireAuthorization`, đọc user id từ claims |
| SignalR — https://learn.microsoft.com/aspnet/core/signalr/introduction | Hub, Groups, gửi sự kiện từ server |
| xUnit — https://learn.microsoft.com/dotnet/core/testing/unit-testing-with-dotnet-test | viết `[Fact]`, `[Theory]`, chạy `dotnet test` |

| Frontend | Học tới đâu là đủ |
|---|---|
| React — https://react.dev/learn | component, props, `useState`, `useEffect`, xử lý sự kiện bàn phím/chuột |
| Next.js — https://nextjs.org/docs/app | thư mục `app/`, trang động `[id]`, `"use client"`, `useRouter` |
| TypeScript — https://www.typescriptlang.org/docs/handbook/2/everyday-types.html | type, union, kiểu cho dữ liệu API |
| Tailwind — https://tailwindcss.com/docs | layout grid/flex, màu, responsive cho điện thoại |
| Fetch API — https://developer.mozilla.org/docs/Web/API/Fetch_API/Using_Fetch | gọi API, gửi token, xử lý lỗi |
| SignalR client (FE3) — https://learn.microsoft.com/aspnet/core/signalr/javascript-client | kết nối, `on(...)`, `invoke(...)` |

**Bài tập khởi động (mỗi cặp làm chung, nộp PR trong tuần 1):** BE viết `GET /api/hello/{ten}` trả `{ "message": "Xin chào <ten>" }`,
FE làm trang `/hello` gọi API đó và hiện kết quả. Hai người review chéo PR của nhau. (Xóa sau tuần 1.)

---

## 4. Phân công

| Cặp | Mảng tính năng | Backend | Frontend |
|---|---|---|---|
| **A** | Tài khoản · Daily · Rating · Nhiệm vụ & bổ trợ | **BE1** _(điền tên)_ | **FE1** _(điền tên)_ |
| **B** | Game Sudoku & Dò mìn · Phòng chơi · Chống gian lận | **BE2** _(điền tên)_ | **FE2** _(điền tên)_ |
| **C** | Giải đấu 2 vòng · Realtime · Màn hình chung kết · Bảng xếp hạng | **BE3** _(điền tên)_ | **FE3** _(điền tên)_ |

Thứ tự phụ thuộc: **cặp A dựng nền** (repo, database, đăng nhập) trong 3 ngày đầu → **cặp B** làm game + phòng chơi →
**cặp C** và phần daily của cặp A xây trên phòng chơi. Để không ai ngồi chờ, mọi người code theo **hợp đồng ở mục 5** ngay từ đầu;
FE dùng dữ liệu giả đúng hình dạng hợp đồng cho tới khi API thật xong.

### Cặp A — Tài khoản, Daily, Rating, Bổ trợ

**BE1**
- [ ] Dựng phần backend của repo: solution, project API, project test, `docker-compose.yml` (PostgreSQL + Redis). **Xong trong 3 ngày đầu.**
- [ ] `AppDb` (DbContext) + entity `User` + migration đầu tiên. Seed tài khoản thử `admin`, `player1`…`player8`.
- [ ] API: `POST /api/auth/register`, `POST /api/auth/login` (trả JWT), `GET /api/me`, đăng nhập nhanh bằng tài khoản thử (chỉ bật ở môi trường dev).
- [ ] API admin: danh sách người dùng, khóa/mở khóa, đổi vai trò. Tài khoản bị khóa không đăng nhập được.
- [ ] Daily: mỗi ngày 3 đề (Dễ / Vừa / Khó) cho mỗi game, cả cộng đồng chung đề, tự sinh ở lần gọi đầu tiên trong ngày (gọi hàm sinh đề của BE2).
- [ ] `UserRating` + Elo: điểm đề Dễ 900 / Vừa 1300 / Khó 1700, K = 32, người mới 1000; gợi ý độ khó vừa sức.
- [ ] Nhiệm vụ & bổ trợ: giải 1 đề daily/ngày → 1 Gợi ý, 5 đề/tuần → 1 Khiên; admin trao bổ trợ; API dùng Gợi ý. Bổ trợ **không dùng trong giải đấu**.
- [ ] Chuỗi ngày liên tục (streak).
- [ ] Test: đăng ký trùng tên bị từ chối; sai mật khẩu bị từ chối; công thức Elo; nhiệm vụ chỉ thưởng một lần.

**FE1**
- [ ] Dựng phần frontend của repo (Next.js + Tailwind), file `lib/api.ts` (hàm gọi API + gửi token, **cả nhóm FE dùng chung**), lưu phiên đăng nhập. **Xong trong 3 ngày đầu.**
- [ ] Bộ style dùng chung: nút, thẻ, ô nhập, màu chủ đạo — FE2, FE3 dùng lại, không tự chế style riêng.
- [ ] Trang `/login`: đăng nhập, đăng ký, khu "Tài khoản dùng thử" bấm vào thẳng.
- [ ] Thanh menu, nút đăng xuất.
- [ ] Trang `/daily`: 3 thẻ đề (điểm cộng/trừ nếu giải được/hỏng), hạng hiện tại + thanh lên hạng, nhiệm vụ ngày/tuần, kho bổ trợ, form admin trao bổ trợ.
- [ ] Trang `/profile`: hạng từng game, số đề đã giải, thời gian trung bình, chuỗi ngày, lịch sử lượt chơi.
- [ ] Trang `/admin/users`: danh sách, khóa/mở khóa, đổi vai trò.

### Cặp B — Game & Phòng chơi

**BE2**
- [ ] `Games/Sudoku.cs`: sinh bàn đầy đủ theo `seed`, xóa bớt ô sao cho **đề luôn có đúng 1 đáp án** (số ô cho sẵn 42 / 34 / 28).
- [ ] `Games/Minesweeper.cs`: sinh mìn theo `seed` (9×9·10 / 16×16·40 / 16×30·99). Vì mọi người chơi cùng một bàn: **ô giữa và 8 ô quanh nó không có mìn**, mở sẵn cho tất cả. Mở ô trống thì loang ra.
- [ ] `GameEngine.cs`: một chỗ duy nhất gọi sang 2 game (các hàm ở mục 5). **Không bao giờ gửi đáp án / vị trí mìn xuống client khi ván chưa kết thúc.**
- [ ] Entity `Puzzle`, `Attempt` + migration (báo BE1 trước khi thêm migration).
- [ ] API: `POST /api/practice`, `GET /api/attempts/{id}`, `POST /api/attempts/{id}/move`, `POST /api/attempts/{id}/abandon`.
- [ ] Luật: Sudoku sai 3 lần là thua (kể cả số trùng hàng/cột/ô), Dò mìn trúng mìn là thua, quá hạn là thua, lượt đã xong không nhận nước đi.
- [ ] Chống gian lận: đồng hồ tính ở server, lưu `MoveLog` (thời điểm + nước đi), API cho admin liệt kê lượt giải nhanh bất thường và hủy kết quả.
- [ ] Test: Sudoku đúng 1 lời giải ở cả 3 độ khó; cùng seed thì cùng bàn mìn; vùng xuất phát an toàn; lỗi thứ 3 → thua; người khác không đi được lượt của mình.

**FE2**
- [ ] `components/SudokuBoard.tsx`: lưới 9×9, viền đậm ô 3×3, chọn ô, nhập số bằng bàn phím + bàn số, tô sáng hàng/cột/ô và số giống nhau, nháy đỏ khi sai, chế độ ghi chú (pencil marks).
- [ ] `components/MinesweeperBoard.tsx`: chuột trái mở, chuột phải cắm cờ, nút chế độ cắm cờ cho điện thoại, đếm mìn còn lại, màu số 1–8, chording.
- [ ] Cả 2 bàn có **chế độ thu nhỏ chỉ xem** (FE3 dùng cho màn hình chung kết).
- [ ] Trang `/play/[id]`: bàn chơi, đồng hồ, số lỗi, tiến độ, nút Gợi ý / Khiên (API của BE1), nút bỏ cuộc, màn kết quả. **Đăng xuất thì ẩn bàn và dừng đồng hồ ngay.**
- [ ] Trang admin "Nghi vấn gian lận" (API của BE2).
- [ ] Làm bàn chơi chạy tốt trên điện thoại.

### Cặp C — Giải đấu & Realtime

**BE3**
- [ ] Entity `Tournament`, `TournamentPuzzle`, `TournamentEntry` + migration (báo BE1 trước).
- [ ] Trạng thái giải: **Mở đăng ký → Vòng loại → Chờ chung kết → Chung kết → Kết thúc**. Admin bấm chuyển vòng; hết giờ thì tự chuyển.
- [ ] Đề mỗi vòng **chỉ sinh lúc vòng bắt đầu**; chung kết dùng đề khác vòng loại. Đồng hồ mọi người tính từ lúc **vòng** bắt đầu.
- [ ] Bảng xếp hạng vòng **tính ra từ `Attempt`**, không lưu bảng riêng: giải xong trước (nhanh hơn → ít lỗi hơn), rồi người chưa xong theo tiến độ. Chốt top N (mặc định 6).
- [ ] SignalR `ArenaHub`: khán giả nhận tiến độ (%, lỗi, thời gian); **chỉ admin** nhận bàn chơi đầy đủ (6 người chung một đề — công khai bàn là lộ đáp án).
- [ ] Bảng xếp hạng chung: theo điểm hạng, top ngày, top tuần (dữ liệu của BE1), cache bằng Redis vài giây.
- [ ] Script bot tự chơi giải để demo một mình; dữ liệu giả cho bảng xếp hạng ở môi trường dev.
- [ ] Test: xếp hạng đúng thứ tự; chỉ người đã đăng ký vào thi được; chỉ top N vào chung kết.

**FE3**
- [ ] `lib/hub.ts`: kết nối SignalR, tự kết nối lại khi rớt mạng.
- [ ] Trang `/tournaments`: danh sách giải, form tạo giải (admin).
- [ ] Trang `/tournaments/[id]`: các bước của giải, đăng ký, nút "Vào thi", đồng hồ đếm ngược vòng, bảng xếp hạng vòng loại cập nhật live, thanh tiến độ chung kết, nút điều khiển của admin.
- [ ] Trang `/tournaments/[id]/monitor`: lưới 3×2 bàn chơi chung kết cập nhật từng nước đi (dùng bàn thu nhỏ của FE2), huy chương khi về đích.
- [ ] Trang `/leaderboard`: 3 bảng (Hạng / Top ngày / Top tuần), chọn game, làm nổi bật dòng của chính mình.
- [ ] Trang chủ `/`.

---

## 5. Hợp đồng chung (thống nhất ngày đầu, ai đổi phải báo cả nhóm)

**Enum dùng chung (C# và TypeScript cùng tên, gửi qua JSON dạng chuỗi):**

```
GameType:         Sudoku | Minesweeper
Difficulty:       Easy | Medium | Hard
Role:             Player | Admin
AttemptStatus:    InProgress | Solved | Failed
TournamentStatus: Open | Qualifier | QualifierDone | Final | Closed
BoosterType:      Hint | Shield
```

**Entity và người chịu trách nhiệm:**

| Entity | Cột chính | Người làm |
|---|---|---|
| User | Id, Username, Email, PasswordHash, Role, IsLocked, CreatedAt | BE1 |
| UserRating | Id, UserId, GameType, Value | BE1 |
| BoosterGrant | Id, UserId, Type, Amount (+ nhận / − dùng), Reason | BE1 |
| Puzzle | Id, GameType, Difficulty, Seed, BoardConfig, Solution (chỉ server), IsDaily, DailyDate | BE2 |
| Attempt | Id, UserId, PuzzleId, TournamentId?, StartedAt, Deadline?, FinishedAt?, DurationMs?, Mistakes, Status, Score, Progress, State, MoveLog | BE2 |
| Tournament | Id, Name, GameType, Difficulty, Status, FinalistCount, RoundMinutes, QualifierStartedAt?, FinalStartedAt? | BE3 |
| TournamentPuzzle | Id, TournamentId, PuzzleId, Stage (Qualifier/Final) | BE3 |
| TournamentEntry | Id, TournamentId, UserId, RegisteredAt, IsFinalist, FinalRank? | BE3 |

**Hàm game (BE2 cung cấp, BE1 và BE3 gọi):**

```csharp
Puzzle Generate(GameType game, Difficulty difficulty, int seed);   // đáp án nằm trong Puzzle.Solution, chỉ server giữ
string InitialState(Puzzle p);
MoveOutcome? Apply(Puzzle p, string state, int index, int value);   // null = nước không hợp lệ
int Progress(Puzzle p, string state);                              // 0..100
BoardView View(Puzzle p, string state, bool finished);             // dữ liệu bàn gửi client, không lộ đáp án

record MoveOutcome(string State, bool Correct, bool Solved);
record BoardView(GameType Game, int Rows, int Cols, int Mines, string Cells, string? Givens);
```

Quy ước `Cells`: Sudoku = 81 ký tự, `'0'` là ô trống. Dò mìn = mỗi ô một ký tự, `'#'` chưa mở, `'0'`–`'8'` đã mở, `'*'` mìn (chỉ khi ván kết thúc).

**API chính (BE viết, FE gọi).** Mọi API trả lỗi dạng `{ "error": "thông báo tiếng Việt" }`; API cần đăng nhập nhận header `Authorization: Bearer <token>`.

| API | Người làm BE | FE dùng |
|---|---|---|
| `POST /api/auth/register`, `/login` → `{ token, user: { id, username, role } }` | BE1 | FE1 |
| `GET /api/daily?game=Sudoku`, `GET /api/boosters`, `POST /api/boosters/grant`, `POST /api/attempts/{id}/hint` | BE1 | FE1, FE2 |
| `POST /api/practice`, `GET /api/attempts/{id}`, `POST /api/attempts/{id}/move` (`{ index, value }` → `{ correct, shielded, attempt }`), `/abandon` | BE2 | FE2 |
| `GET/POST /api/tournaments`, `GET /api/tournaments/{id}`, `/register`, `/play`, `/advance`, `/monitor` | BE3 | FE3 |
| `GET /api/leaderboard/rating?game=`, `/api/leaderboard/daily?game=&period=day\|week` | BE3 | FE3 |
| SignalR `/hubs/arena`: client gọi `Watch(id)` / `Monitor(id)`; server gửi `progress`, `board`, `stage` | BE3 | FE3 |

Khi BE viết xong một API: ghi ví dụ request/response vào phần mô tả PR để FE nối được ngay.

---

## 6. Lịch (4 tuần)

| Tuần | Backend | Frontend |
|---|---|---|
| 1 | Học (mục 3), bài tập khởi động. BE1 dựng repo + đăng nhập trong 3 ngày đầu. Cả 3 BE thống nhất entity và API (mục 5). | Học (mục 3), bài tập khởi động. FE1 dựng Next.js + `lib/api.ts` + bộ style trong 3 ngày đầu. FE2, FE3 vẽ phác giao diện trang mình. |
| 2 | BE2: sinh đề 2 game + phòng chơi chạy được. BE1: daily + Elo. BE3: entity giải đấu + chuyển vòng. | FE2: 2 bàn chơi + trang chơi. FE1: đăng nhập + daily. FE3: danh sách + chi tiết giải (dữ liệu giả nếu API chưa xong). |
| 3 | BE3: SignalR + xếp hạng + bot. BE1: nhiệm vụ & bổ trợ + admin. BE2: chống gian lận. | FE3: live + màn hình chung kết + bảng xếp hạng. FE1: hồ sơ + admin. FE2: Gợi ý/Khiên + trang gian lận. |
| 4 | Sửa lỗi, test chéo, chạy thử PostgreSQL + Redis bằng Docker. | Sửa lỗi, giao diện điện thoại, test chéo. Cả nhóm: slide, tập demo trọn vòng ≤ 10 phút. |

Họp nhanh 15 phút, 2–3 lần mỗi tuần: mỗi người nói đã làm gì, sắp làm gì, đang kẹt ở đâu. BE và FE cùng cặp nên trao đổi hằng ngày.

## 7. Quy tắc làm việc

**Git**
- Không ai push thẳng lên `main`. Mỗi việc một nhánh: `ten/viec`, ví dụ `lan/sudoku-board`.
- Mở Pull Request, có **1 người review** rồi mới merge:
  - Code backend: BE review chéo nhau theo vòng **BE1 → BE2 → BE3 → BE1**.
  - Code frontend: **FE1 → FE2 → FE3 → FE1**.
  - Người review phải đọc và hiểu code, không bấm duyệt cho có.
- PR nhỏ, merge thường xuyên (1–2 ngày một PR). Commit message ghi rõ làm gì: `Thêm sinh đề Sudoku có đáp án duy nhất`.

**Trước khi mở PR**

```bash
dotnet test backend
```

```bash
npm --prefix frontend run lint
```

**Một PR được coi là xong khi:** chạy được trên máy mình, BE có test cho phần logic, FE đã thử với API thật (không chỉ dữ liệu giả), không lộ đáp án ra client.

**Chỗ dễ đụng nhau — báo nhóm trước khi sửa:** `AppDb` và migrations (BE1 gộp, mỗi lần một người tạo migration), `lib/api.ts` và bộ style (FE1 quản lý), thanh menu, và mọi thứ trong mục 5.

**Bảo mật — ai cũng phải nhớ:** không commit mật khẩu hay khóa JWT thật; đáp án chỉ nằm ở server; mọi API kiểm tra người gọi có quyền không (đúng chủ lượt chơi, đúng vai trò admin).

## 8. Thuyết trình (6 người, mỗi người khoảng 1,5 phút)

Mỗi người trình bày phần mình code và phải trả lời được câu thầy hỏi về phần đó:

| Người | Trình bày | Câu thầy dễ hỏi |
|---|---|---|
| FE1 | Giới thiệu, vấn đề, người dùng; demo đăng nhập và Daily | Ứng dụng giải quyết vấn đề gì? Có những loại người dùng nào? Bổ trợ nhận ra sao? |
| BE1 | ERD và database, tài khoản, rating Elo | Mật khẩu lưu thế nào? Sao bảng xếp hạng không có bảng riêng? Elo hoạt động thế nào? |
| BE2 | Game engine & chống gian lận | Làm sao chắc Sudoku chỉ có 1 đáp án? Sao client không biết mìn ở đâu? |
| FE2 | Demo phòng chơi Sudoku & Dò mìn | Đồng hồ và số lỗi lấy từ đâu? Client có tự quyết thắng thua không? |
| BE3 | Main flow giải đấu 2 vòng, realtime | Game 1 người thì "giải đấu" là gì? Sao khán giả không xem được bàn chơi? |
| FE3 | Demo giải đấu + màn hình chung kết, bảng xếp hạng, tech stack, kết luận | Màn hình chung kết cập nhật live bằng cách nào? Vì sao chọn các công nghệ này? |
