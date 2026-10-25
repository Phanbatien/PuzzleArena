# PuzzleArena — hợp đồng API cho Frontend

> Nguồn: mã hiện có trong `backend/PuzzleArena.Api`. Đây là hợp đồng được trích xuất từ code, không bổ sung hành vi chưa thấy trong repository.
>
> **Lưu ý wire format:** repository không có `Program.cs`, cấu hình JSON hoặc định nghĩa `ApiResults.Error`. Tên thuộc tính C# bên dưới được ghi nguyên dạng từ DTO. Casing JSON thực tế (ví dụ `Id` hay `id`) **chưa xác minh**. FE hiện có types dùng camelCase, nhưng đó chưa phải bằng chứng về serializer backend.

## Xác thực và lỗi chung

| Phạm vi | Yêu cầu từ code |
| --- | --- |
| 6 API người chơi | `.RequireAuthorization()` — cần người dùng đã xác thực. |
| 2 API admin | cần xác thực và role `Admin`. |
| Người dùng không có user ID hiện tại | HTTP 401, gọi `ApiResults.Error` với thông điệp tiếng Việt. |
| Lỗi nghiệp vụ | endpoint gọi `ApiResults.Error(message, status)`. Hình JSON chính xác không nằm trong repository. Tài liệu nhóm dự kiến `{ "error": "..." }`, nhưng cần backend xác nhận. |

Các endpoint người chơi lấy user hiện tại qua `AuthEndpoints.CurrentUserId(http)`; định nghĩa auth/JWT không có trong repository.

## Enum và primitive dùng trong hợp đồng

Các enum declaration không có trong snapshot, nhưng các giá trị sau được dùng trực tiếp trong code:

```ts
export type Game = "Sudoku" | "Minesweeper";
export type Difficulty = "Easy" | "Medium" | "Hard";
export type AttemptStatus = "InProgress" | "Solved" | "Failed";
export type Role = "Admin" | "Player"; // Player xuất hiện trong test; chỉ Admin được endpoint admin chấp nhận.
```

`DateTimeOffset` được trả qua JSON bằng một chuỗi thời gian nếu serializer .NET mặc định được giữ nguyên; định dạng wire chính xác cần xác nhận do không có cấu hình serializer.

## Kiểu response chung

`AttemptResponse` là body thành công của create/get/start/abandon/void. Riêng move bọc response này trong `MoveResponse`.

| Field C# | Kiểu | Nullable | Ý nghĩa từ code |
| --- | --- | --- | --- |
| `Id` | `int` | Không | ID lượt chơi. |
| `PuzzleId` | `int` | Không | ID đề. |
| `Game` | `GameType` | Không | `Sudoku` hoặc `Minesweeper`. |
| `Difficulty` | `Difficulty` | Không | `Easy`, `Medium`, `Hard`. |
| `Status` | `AttemptStatus` | Không | `InProgress`, `Solved`, hoặc `Failed`. |
| `Mistakes` | `int` | Không | Số lỗi không được khiên đỡ. |
| `MaxMistakes` | `int` | Không | Sudoku: `3`; Dò mìn: `1`. |
| `Progress` | `int` | Không | Phần trăm nguyên `0..100`. |
| `StartedAt` | `DateTimeOffset` | Không | Thời điểm server tạo lượt. |
| `Deadline` | `DateTimeOffset` | Có | Hạn của lượt; nếu `null`, code không áp dụng hết hạn. Không có field `ExpiresAt`. |
| `FinishedAt` | `DateTimeOffset` | Có | Có khi lượt kết thúc. |
| `DurationMs` | `long` | Có | Số mili giây server tính từ `StartedAt` đến lúc kết thúc. |
| `ServerNow` | `DateTimeOffset` | Không | Thời điểm server tạo response. Dùng để FE đồng bộ đồng hồ. |
| `RatingDelta` | `int` | Có | Chỉ được truy vấn khi lượt đã kết thúc; có thể vẫn `null`. |
| `Board` | `BoardView` | Không | Dữ liệu bàn an toàn để hiển thị. |

## Bàn chơi (`BoardView`)

DTO: `BoardView(GameType Game, int Rows, int Cols, int Mines, string Cells, string? Givens)`.

### Sudoku

```ts
{
  Game: "Sudoku",
  Rows: 9,
  Cols: 9,
  Mines: 0,
  Cells: string,  // đúng 81 ký tự: "0" là trống, "1".."9" là số đã có/điền đúng
  Givens: string  // đúng 81 ký tự: "0" là ô người chơi được điền; "1".."9" là ô cho sẵn
}
```

- Client không nhận `Puzzle.Solution`.
- Nước Sudoku sai không thay đổi `Cells`; server chỉ trả `Correct: false` trong response move.
- Bởi vậy FE cần dùng `Givens[index] !== "0"` để khóa ô cho sẵn, không dựa vào `Cells`.
- Với trạng thái kết thúc, code vẫn chỉ trả state hiện tại và givens; không có logic lộ lời giải Sudoku.

### Dò mìn

```ts
{
  Game: "Minesweeper",
  Rows: 9 | 16,
  Cols: 9 | 16 | 30,
  Mines: 10 | 40 | 99,
  Cells: string,  // dài Rows * Cols
  Givens: null
}
```

Mapping difficulty: `Easy = 9×9, 10 mìn`; `Medium = 16×16, 40 mìn`; `Hard = 16×30, 99 mìn`.

`Cells[index]` chỉ có các ký tự sau:

- `#`: ô chưa mở.
- `0`–`8`: ô an toàn đã mở, là số mìn kề bên.
- `*`: mìn. Khi `Status === "InProgress"`, server giữ nguyên state và **không lộ mìn**. Khi trạng thái không còn `InProgress`, `Reveal` thay mọi vị trí mìn bằng `*`.

Cờ không thuộc trạng thái server và không có request để cắm cờ. FE giữ cờ cục bộ. Bàn ban đầu mở ô giữa (và có thể loang thêm khi là `0`); vùng 3×3 quanh ô giữa không có mìn.

## Endpoint

### `POST /api/practice`

- Auth: bắt buộc; không yêu cầu admin.
- Body `PracticeRequest`:

```json
{ "Game": "Sudoku", "Difficulty": "Easy" }
```

| Field | Kiểu | Bắt buộc |
| --- | --- | --- |
| `Game` | `Game \| null` | Có; `null` bị từ chối. |
| `Difficulty` | `Difficulty \| null` | Có; `null` bị từ chối. |

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
{ Index: number; Value: number }
```

Không có nullable trong record; việc field JSON thiếu sẽ bind thành giá trị mặc định của `int` (`0`) nếu dùng model binding .NET mặc định, nhưng config binding/validation không có nên FE phải luôn gửi đủ hai field.

**Move theo game**

| Game | `Index` | `Value` | Nước bị coi không hợp lệ |
| --- | --- | --- | --- |
| Sudoku | `0..80` | `1..9` | ngoài bàn, ô cho sẵn, ô đã điền đúng, hoặc `Value` ngoài `1..9`. |
| Minesweeper | `0..Rows*Cols-1` | bắt buộc `0` | index ngoài bàn, ô đã mở, hoặc `Value !== 0`. |

- Thành công: HTTP 200, `MoveResponse`:

```ts
{ Correct: boolean; Shielded: boolean; Attempt: AttemptResponse }
```

  - `Correct`: `true` khi nước được game engine đánh giá đúng/an toàn; sai ở Sudoku hoặc trúng mìn là `false`.
  - `Shielded`: `true` khi nước sai được tự dùng khiên đỡ. Chỉ có thể xảy ra ngoài giải đấu, tối đa một lần trong attempt.
  - Khiên đỡ Dò mìn vẫn khiến state có ô mìn `*`; trong lúc attempt còn `InProgress`, response đó do `View(..., finished: false)` trả state với ô `*` đã mở, còn các mìn khác vẫn ẩn.
- Lỗi:
  - 400: quá hạn — `"Đã hết giờ, lượt chơi kết thúc."`
  - 400: đã kết thúc — `"Lượt chơi đã kết thúc."`
  - 400: nước không hợp lệ — `"Nước đi không hợp lệ."`
  - 401: chưa xác thực.
  - 403: không phải chủ lượt.
  - 404: không tìm thấy lượt chơi.

Khi Sudoku sai không có khiên: tăng `Mistakes`; lỗi thứ ba kết thúc lượt. Dò mìn sai không có khiên: tăng `Mistakes`, kết thúc khi đạt 1. Sau khi kết thúc, mìn được lộ trong `Board.Cells`.

### `POST /api/attempts/{id}/abandon`

- Auth: bắt buộc; chỉ chủ lượt.
- Body: không có.
- Thành công: HTTP 200, `AttemptResponse`. Nếu lượt đang `InProgress` và chưa hết hạn, server kết thúc nó với `Status = "Failed"`. Gọi lại attempt đã kết thúc là idempotent và trả trạng thái hiện có.
- Lỗi: 401, 403 (`"Đây không phải lượt chơi của bạn."`), 404 (`"Không tìm thấy lượt chơi."`).

### `POST /api/daily/{puzzleId}/start`

- Auth: bắt buộc; không yêu cầu admin.
- Path: `puzzleId: int`.
- Body: không có.
- Thành công: HTTP 200, `AttemptResponse`. Nếu user đã có attempt (đang chơi, thắng hoặc thua) cho puzzle daily này ngoài giải, trả lại attempt mới nhất đó thay vì tạo attempt mới.
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

```ts
{
  AttemptId: number;
  UserId: number;
  Username: string;
  Game: Game;
  Difficulty: Difficulty;
  DurationMs: number | null;
  Mistakes: number;
  Moves: number;
  TournamentId: number | null;
  FinishedAt: string | null;
  Reasons: string[];
}
```

- Lỗi thấy trong endpoint: 400 nếu `game` parse không được — `"Loại game không hợp lệ."`
- Các lỗi xác thực/role khi policy chặn request: status/body cụ thể không có trong repository.

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
- Các lỗi xác thực/role từ policy chưa có cấu hình để xác minh.

## TypeScript types đề xuất

Các type sau giữ tên PascalCase đúng DTO C#. Chỉ đổi sang camelCase sau khi backend xác nhận JSON naming policy.

```ts
export type Game = "Sudoku" | "Minesweeper";
export type Difficulty = "Easy" | "Medium" | "Hard";
export type AttemptStatus = "InProgress" | "Solved" | "Failed";

export type SudokuBoard = {
  Game: "Sudoku";
  Rows: 9;
  Cols: 9;
  Mines: 0;
  Cells: string;
  Givens: string;
};

export type MinesweeperBoard = {
  Game: "Minesweeper";
  Rows: number;
  Cols: number;
  Mines: number;
  Cells: string;
  Givens: null;
};

export type BoardView = SudokuBoard | MinesweeperBoard;

export type AttemptResponse = {
  Id: number;
  PuzzleId: number;
  Game: Game;
  Difficulty: Difficulty;
  Status: AttemptStatus;
  Mistakes: number;
  MaxMistakes: number;
  Progress: number;
  StartedAt: string;
  Deadline: string | null;
  FinishedAt: string | null;
  DurationMs: number | null;
  ServerNow: string;
  RatingDelta: number | null;
  Board: BoardView;
};

export type PracticeRequest = {
  Game: Game;
  Difficulty: Difficulty;
};

export type SudokuMoveRequest = { Index: number; Value: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 };
export type MinesweeperMoveRequest = { Index: number; Value: 0 };
export type MoveRequest = SudokuMoveRequest | MinesweeperMoveRequest;

export type MoveResponse = {
  Correct: boolean;
  Shielded: boolean;
  Attempt: AttemptResponse;
};

export type SuspiciousAttemptResponse = {
  AttemptId: number;
  UserId: number;
  Username: string;
  Game: Game;
  Difficulty: Difficulty;
  DurationMs: number | null;
  Mistakes: number;
  Moves: number;
  TournamentId: number | null;
  FinishedAt: string | null;
  Reasons: string[];
};

// Chưa xác minh được vì ApiResults.Error không có trong repository.
export type ApiError = { error: string };
```

## Câu hỏi cho backend

1. JSON serializer có camelCase hay giữ PascalCase? Enum có được serialize thành chuỗi không? Cần `Program.cs`/cấu hình JSON để FE chốt types và mapping.
2. `ApiResults.Error` thực tế trả body gì, và authorization middleware trả body/status gì khi thiếu token hoặc thiếu role?
3. `POST /api/attempts/{id}/move` thiếu `Index`/`Value` được validation thế nào? Có trả model-validation 400 chuẩn hay binding thành `0`?
4. Khi khiên đỡ một lần mở mìn, attempt vẫn `InProgress` nhưng `Board.Cells` chứa một `*`. Đây có phải UI contract mong muốn không, hay service cần không ghi ô mìn khi shielded?
5. `Deadline` hiện là tên field duy nhất; FE có cần một `expiresAt` alias hay chỉ dùng `Deadline`?
6. Có endpoint riêng để dùng Hint không? Mã hiện tại chỉ có shield auto-consume trong `AttemptService`; API hint không có trong snapshot.
7. Có nên giới hạn `game` admin query ở đúng 2 string enum names thay vì chấp nhận các số enum mà `Enum.TryParse` có thể parse?
