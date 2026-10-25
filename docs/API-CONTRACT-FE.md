# PuzzleArena — hợp đồng API cho Frontend

> Nguồn: mã hiện có trong `backend/PuzzleArena.Api` và xác nhận của BE2 (wire format, auth, mã lỗi, daily/deadline). Những điểm chưa được xác nhận nằm ở mục **Còn chờ xác nhận** cuối file.

## Wire format (đã xác minh)

- JSON dùng **camelCase**: `id`, `puzzleId`, `durationMs`, `serverNow`... Tên PascalCase (`Id`, `PuzzleId`) chỉ là tên thuộc tính C#/cột DB, không xuất hiện trong JSON.
- Enum là **chuỗi**, cả trong response lẫn request: `"Sudoku" | "Minesweeper"`; `"Easy" | "Medium" | "Hard"`; `"InProgress" | "Solved" | "Failed"`.
- `DateTimeOffset` được gửi dưới dạng chuỗi thời gian ISO.

## Xác thực

- Token nằm trong **body JSON**, không dùng cookie.
- `POST /api/auth/register` và `POST /api/auth/login` trả:

```json
{ "token": "<jwt>", "user": { "id": 1, "username": "<username>", "role": "Player" } }
```

- Mọi API còn lại gửi header `Authorization: Bearer <token>`.
- Tài khoản thử và cách đăng nhập nhanh: xem BE1.

| Phạm vi | Yêu cầu từ code |
| --- | --- |
| 6 API người chơi | `.RequireAuthorization()` — cần người dùng đã xác thực. |
| 2 API admin | cần xác thực và role `Admin`. |

Các endpoint người chơi lấy user hiện tại qua `AuthEndpoints.CurrentUserId(http)`.

## Lỗi theo HTTP status

Body lỗi: `{ "error": "thông báo tiếng Việt" }`. Không có mã lỗi riêng. FE dựa vào **HTTP status** và trường `status` của lượt chơi, **không so khớp chuỗi** thông báo. Các thông báo ghi trong từng endpoint bên dưới chỉ để tham khảo khi debug.

| Status | Ý nghĩa | FE xử lý |
| --- | --- | --- |
| 400 | nước đi không hợp lệ, lượt đã kết thúc, đã hết giờ, đề daily không phải của hôm nay | Hiện thông báo chung, refetch attempt; nếu `status !== "InProgress"` thì chuyển sang màn kết quả. |
| 401 | chưa đăng nhập hoặc token hết hạn | Báo phiên hết hạn, yêu cầu đăng nhập lại (luồng cụ thể: mục chờ xác nhận #4). |
| 403 | không phải lượt chơi của bạn | Báo "Lượt chơi này không thuộc về bạn", không hiện bàn chơi. |
| 404 | không tìm thấy lượt chơi hoặc đề | Báo không tìm thấy, không hiện bàn chơi. |

## Enum và primitive dùng trong hợp đồng

Enum được serialize thành chuỗi, cả khi server trả về lẫn khi FE gửi lên:

```ts
export type Game = "Sudoku" | "Minesweeper";
export type Difficulty = "Easy" | "Medium" | "Hard";
export type AttemptStatus = "InProgress" | "Solved" | "Failed";
export type Role = "Admin" | "Player"; // Player xuất hiện trong test; chỉ Admin được endpoint admin chấp nhận.
```

`DateTimeOffset` là chuỗi thời gian ISO; FE parse bằng `Date.parse`.

## Kiểu response chung

`AttemptResponse` là body thành công dùng chung cho:

- `POST /api/practice` (body `{ "game": Game, "difficulty": Difficulty }`)
- `GET /api/attempts/{id}`
- `POST /api/daily/{puzzleId}/start`
- `POST /api/attempts/{id}/abandon`
- `POST /api/admin/attempts/{id}/void`

Riêng `/move` bọc response này trong `MoveResponse`.

| Field JSON | Kiểu C# | Nullable | Ý nghĩa từ code |
| --- | --- | --- | --- |
| `id` | `int` | Không | ID lượt chơi. |
| `puzzleId` | `int` | Không | ID đề. |
| `game` | `GameType` | Không | `"Sudoku"` hoặc `"Minesweeper"`. |
| `difficulty` | `Difficulty` | Không | `"Easy"`, `"Medium"`, `"Hard"`. |
| `status` | `AttemptStatus` | Không | `"InProgress"`, `"Solved"`, hoặc `"Failed"`. |
| `mistakes` | `int` | Không | Số lỗi không được khiên đỡ. |
| `maxMistakes` | `int` | Không | Sudoku: `3`; Dò mìn: `1`. |
| `progress` | `int` | Không | Phần trăm nguyên `0..100`. |
| `startedAt` | `DateTimeOffset` | Không | Thời điểm server tạo lượt. |
| `deadline` | `DateTimeOffset` | Có | Hạn của lượt. Daily và practice luôn `null`; chỉ lượt giải đấu có deadline. Không có field `expiresAt`. |
| `finishedAt` | `DateTimeOffset` | Có | Có khi lượt kết thúc. |
| `durationMs` | `long` | Có | Số mili giây server tính từ `startedAt` đến lúc kết thúc. |
| `serverNow` | `DateTimeOffset` | Không | Thời điểm server tạo response. FE dùng để tính độ lệch giờ client–server. |
| `ratingDelta` | `int` | Có | Chỉ được truy vấn khi lượt đã kết thúc; có thể vẫn `null`. |
| `board` | `BoardView` | Không | Dữ liệu bàn an toàn để hiển thị. |

Ví dụ: lượt practice, Sudoku Easy, đang chơi (giá trị chỉ để minh họa):

```json
{
  "id": 42,
  "puzzleId": 17,
  "game": "Sudoku",
  "difficulty": "Easy",
  "status": "InProgress",
  "mistakes": 0,
  "maxMistakes": 3,
  "progress": 0,
  "startedAt": "2026-10-25T08:00:00+00:00",
  "deadline": null,
  "finishedAt": null,
  "durationMs": null,
  "serverNow": "2026-10-25T08:00:00.120+00:00",
  "ratingDelta": null,
  "board": {
    "game": "Sudoku",
    "rows": 9,
    "cols": 9,
    "mines": 0,
    "cells": "530070000600195000098000060800060003400803001700020006060000280000419005000080079",
    "givens": "530070000600195000098000060800060003400803001700020006060000280000419005000080079"
  }
}
```

## Bàn chơi (`BoardView`)

DTO: `BoardView(GameType Game, int Rows, int Cols, int Mines, string Cells, string? Givens)`.

### Sudoku

```ts
{
  game: "Sudoku",
  rows: 9,
  cols: 9,
  mines: 0,
  cells: string,  // đúng 81 ký tự: "0" là trống, "1".."9" là số đã có/điền đúng
  givens: string  // đúng 81 ký tự: "0" là ô người chơi được điền; "1".."9" là ô cho sẵn
}
```

- Client không nhận `Puzzle.Solution`.
- Nước Sudoku sai không thay đổi `cells`; server chỉ trả `correct: false` trong response move.
- Bởi vậy FE cần dùng `givens[index] !== "0"` để khóa ô cho sẵn, không dựa vào `cells`.
- Với trạng thái kết thúc, code vẫn chỉ trả state hiện tại và givens; không có logic lộ lời giải Sudoku.

### Dò mìn

```ts
{
  game: "Minesweeper",
  rows: 9 | 16,
  cols: 9 | 16 | 30,
  mines: 10 | 40 | 99,
  cells: string,  // dài rows * cols
  givens: null
}
```

Mapping difficulty: `Easy = 9×9, 10 mìn`; `Medium = 16×16, 40 mìn`; `Hard = 16×30, 99 mìn`.

`cells[index]` chỉ có các ký tự sau:

- `#`: ô chưa mở.
- `0`–`8`: ô an toàn đã mở, là số mìn kề bên.
- `*`: mìn. Khi `status === "InProgress"`, server giữ nguyên state và **không lộ mìn**. Khi trạng thái không còn `InProgress`, `Reveal` thay mọi vị trí mìn bằng `*`. Trường hợp khiên đỡ mìn: xem mục chờ xác nhận #2.

Cờ không thuộc trạng thái server và không có request để cắm cờ. FE giữ cờ cục bộ. Bàn ban đầu mở ô giữa (và có thể loang thêm khi là `0`); vùng 3×3 quanh ô giữa không có mìn.

## Endpoint

### `POST /api/practice`

- Auth: bắt buộc; không yêu cầu admin.
- Body `PracticeRequest`:

```json
{ "game": "Sudoku", "difficulty": "Easy" }
```

| Field | Kiểu | Bắt buộc |
| --- | --- | --- |
| `game` | `Game \| null` | Có; `null` bị từ chối. |
| `difficulty` | `Difficulty \| null` | Có; `null` bị từ chối. |

- Thành công: HTTP 200, body `AttemptResponse`.
- Lỗi thấy trong code:
  - 400: thiếu `Game` hoặc `Difficulty` — `"Thiếu loại game hoặc độ khó."`
  - 401: không có user hiện tại — `"Phiên đăng nhập đã hết hạn hoặc chưa đăng nhập. Vui lòng đăng nhập lại."`

Server tạo puzzle với `Random.Shared.Next()`, gắn `IsDaily = false`, rồi tạo attempt.

### `GET /api/attempts/{id}`

- Auth: bắt buộc. Chủ lượt được lấy attempt; admin cũng được phép xem; người chơi khác bị cấm.
- Path: `id` có route constraint `int`.
- Thành công: HTTP 200, `AttemptResponse`. Khi gọi, server có thể đánh dấu lượt quá hạn thành `Failed` trước khi trả về.
- Lỗi:
  - 401: chưa xác thực/không có user ID.
  - 403: không phải chủ lượt và không phải admin — `"Đây không phải lượt chơi của bạn."`
  - 404: không tìm thấy — `"Không tìm thấy lượt chơi."`

### `POST /api/attempts/{id}/move`

- Auth: bắt buộc; chỉ chủ lượt.
- Path: `id: int`.
- Body `MoveRequest`:

```ts
{ index: number; value: number }
```

Không có nullable trong record; việc field JSON thiếu sẽ bind thành giá trị mặc định của `int` (`0`) nếu dùng model binding .NET mặc định, nhưng config binding/validation không có nên FE phải luôn gửi đủ hai field.

**Move theo game**

| Game | `index` | `value` | Nước bị coi không hợp lệ (400) |
| --- | --- | --- | --- |
| Sudoku | `0..80` | `1..9` | ngoài bàn, ô cho sẵn, ô đã điền đúng, hoặc `value` ngoài `1..9`. |
| Minesweeper | `0..rows*cols-1` | luôn là `0` | index ngoài bàn, ô đã mở, hoặc `value !== 0`. |

- Thành công: HTTP 200, `MoveResponse`:

```ts
{ correct: boolean; shielded: boolean; attempt: AttemptResponse }
```

  - `correct`: `true` khi nước được game engine đánh giá đúng/an toàn; sai ở Sudoku hoặc trúng mìn là `false`.
  - `shielded`: `true` khi nước sai được tự dùng khiên đỡ. Chỉ có thể xảy ra ngoài giải đấu, tối đa một lần trong attempt.
  - Khiên đỡ Dò mìn: theo code, state có ô `*` đã mở trong lúc attempt còn `InProgress` (`View(..., finished: false)`), các mìn khác vẫn ẩn. Chưa được BE xác nhận — xem mục chờ xác nhận #2.
- **Thứ tự xử lý ở FE:** xét `shielded` trước `correct`. Khi khiên đỡ, `mistakes` không tăng; FE luôn lấy `mistakes` từ `attempt` server trả về, không tự cộng.
- **Hết giờ:** `/move` trả 400 `"Đã hết giờ, lượt chơi kết thúc."` và lượt chuyển `Failed` → FE refetch `GET /api/attempts/{id}` để lấy `status`.
- Lỗi:
  - 400: quá hạn — `"Đã hết giờ, lượt chơi kết thúc."`
  - 400: đã kết thúc — `"Lượt chơi đã kết thúc."`
  - 400: nước không hợp lệ — `"Nước đi không hợp lệ."`
  - 401: chưa xác thực.
  - 403: không phải chủ lượt.
  - 404: không tìm thấy lượt chơi.

Khi Sudoku sai không có khiên: tăng `mistakes`; lỗi thứ ba kết thúc lượt. Dò mìn sai không có khiên: tăng `mistakes`, kết thúc khi đạt 1. Sau khi kết thúc, mìn được lộ trong `board.cells`.

### `POST /api/attempts/{id}/abandon`

- Auth: bắt buộc; chỉ chủ lượt.
- Body: không có.
- Thành công: HTTP 200, `AttemptResponse`. Nếu lượt đang `InProgress` và chưa hết hạn, server kết thúc nó với `Status = "Failed"`. Gọi lại attempt đã kết thúc là idempotent và trả trạng thái hiện có.
- Lỗi: 401, 403 (`"Đây không phải lượt chơi của bạn."`), 404 (`"Không tìm thấy lượt chơi."`).

### `POST /api/daily/{puzzleId}/start`

- Auth: bắt buộc; không yêu cầu admin.
- Path: `puzzleId: int`.
- Body: không có.
- Thành công: HTTP 200, `AttemptResponse`. Nếu user đã có attempt (đang chơi, thắng hoặc thua) cho puzzle daily này ngoài giải, trả lại attempt mới nhất đó thay vì tạo attempt mới. **Đây không phải lỗi** — xem quy tắc daily bên dưới.
- Lỗi:
  - 400: puzzle daily không thuộc ngày hiện tại — `"Đề daily này không phải của hôm nay."`
  - 401: chưa xác thực.
  - 404: không tìm thấy daily puzzle — `"Không tìm thấy đề daily."`

Ngày hiện tại trong logic dùng `DateTime.UtcNow`, không phải timezone của client.

### `GET /api/admin/attempts/suspicious`

- Auth/role: bắt buộc role `Admin`.
- Query:

| Field | Kiểu | Bắt buộc | Hành vi |
| --- | --- | --- | --- |
| `game` | `string` | Không | Nếu có, `Enum.TryParse<GameType>(ignoreCase: false)`; `"Sudoku"`/`"Minesweeper"` là các giá trị thấy trong code. |
| `limit` | `int` | Không | Mặc định `50`; server clamp vào `1..200`. |

- Thành công: HTTP 200, mảng `SuspiciousAttemptResponse`. Chỉ xét attempt `Solved` có `DurationMs`, rồi lấy tối đa 500 attempt gần nhất trước khi phân tích.

Shape dưới đây suy từ DTO theo quy tắc camelCase; chưa được BE xác nhận (mục chờ xác nhận #3).

```ts
{
  attemptId: number;
  userId: number;
  username: string;
  game: Game;
  difficulty: Difficulty;
  durationMs: number | null;
  mistakes: number;
  moves: number;
  tournamentId: number | null;
  finishedAt: string | null;
  reasons: string[];
}
```

- Lỗi thấy trong endpoint: 400 nếu `game` parse không được — `"Loại game không hợp lệ."`
- Lỗi xác thực/role: xem mục chờ xác nhận #3.

### `POST /api/admin/attempts/{id}/void`

- Auth/role: bắt buộc role `Admin`.
- Path: `id: int`.
- Body: không có.
- Thành công: HTTP 200, `AttemptResponse`.
  - Với attempt `Solved`, server đổi `Status` sang `Failed`, thêm marker vào move log và hoàn lại rating delta nếu có.
  - Nếu đã void trước đó, trả attempt nguyên trạng.
- Lỗi:
  - 400: attempt không có trạng thái `Solved` — `"Chỉ hủy được lượt đã giải xong."`
  - 404: không tìm thấy lượt — `"Không tìm thấy lượt chơi."`
- Lỗi xác thực/role: xem mục chờ xác nhận #3.

## Quy tắc daily và deadline

- `POST /api/daily/{puzzleId}/start` với đề người chơi đã chơi: trả **200** kèm lượt cũ (`status` là `Solved`/`Failed`), không phải lỗi. FE thấy `status !== "InProgress"` thì hiện màn kết quả, không hiện bàn chơi.
- `deadline`: daily và practice luôn `null` (không đếm ngược). Chỉ lượt giải đấu có `deadline`. Không có field `expiresAt`.
- Đồng hồ dùng `serverNow` để tính độ lệch giờ client–server: `offset = Date.parse(serverNow) - thời điểm client nhận response`; thời gian còn lại = `Date.parse(deadline) - (Date.now() + offset)`.
- Hết giờ do server quyết định: `/move` trả 400 và lượt chuyển `Failed`; FE refetch attempt để lấy `status`.

## TypeScript types

Tên field theo JSON camelCase. Bản đang dùng trong code: `frontend/src/lib/api/types.ts`.

```ts
export type Game = "Sudoku" | "Minesweeper";
export type Difficulty = "Easy" | "Medium" | "Hard";
export type AttemptStatus = "InProgress" | "Solved" | "Failed";

export type SudokuBoardView = {
  game: "Sudoku";
  rows: 9;
  cols: 9;
  mines: 0;
  cells: string;
  givens: string;
};

export type MinesweeperBoardView = {
  game: "Minesweeper";
  rows: number;
  cols: number;
  mines: number;
  cells: string;
  givens: null;
};

export type BoardView = SudokuBoardView | MinesweeperBoardView;

export type AttemptResponse = {
  id: number;
  puzzleId: number;
  game: Game;
  difficulty: Difficulty;
  status: AttemptStatus;
  mistakes: number;
  maxMistakes: number;
  progress: number;
  startedAt: string;
  deadline: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  serverNow: string;
  ratingDelta: number | null;
  board: BoardView;
};

export type PracticeRequest = {
  game: Game;
  difficulty: Difficulty;
};

export type SudokuMoveRequest = { index: number; value: number }; // value 1..9
export type MinesweeperMoveRequest = { index: number; value: 0 };
export type MoveRequest = SudokuMoveRequest | MinesweeperMoveRequest;

export type MoveResponse = {
  correct: boolean;
  shielded: boolean;
  attempt: AttemptResponse;
};

// Shape chờ xác nhận (mục #3).
export type SuspiciousAttemptResponse = {
  attemptId: number;
  userId: number;
  username: string;
  game: Game;
  difficulty: Difficulty;
  durationMs: number | null;
  mistakes: number;
  moves: number;
  tournamentId: number | null;
  finishedAt: string | null;
  reasons: string[];
};

export type ApiError = { error: string };

// Chưa có trong types.ts.
export type AuthResponse = { token: string; user: { id: number; username: string; role: "Admin" | "Player" } };
```

## Còn chờ xác nhận

1. Endpoint lấy `puzzleId` daily của hôm nay (hiện chỉ có `POST /api/daily/{puzzleId}/start`).
2. Dò mìn khi khiên đỡ mìn: lượt vẫn `InProgress` và `cells` có `"*"`? Có lộ mìn khác không? `mistakes`/`maxMistakes` lúc đó thế nào?
3. Shape `SuspiciousAttemptResponse` và quy tắc role `Admin` cho 2 API admin.
4. Key lưu token và ai xử lý 401 (chờ FE1).
