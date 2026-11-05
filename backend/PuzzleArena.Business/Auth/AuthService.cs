using Microsoft.AspNetCore.Identity;
using PuzzleArena.Business.Contracts;
using PuzzleArena.Business.Rating;

namespace PuzzleArena.Business.Auth;

/// <summary>
/// Tài khoản (BE1): đăng ký, đăng nhập, đăng nhập nhanh tài khoản dùng thử, thông tin "tôi".
/// Mật khẩu chỉ lưu dạng băm (PasswordHasher của ASP.NET Identity: PBKDF2 + salt). Trả về DTO UserResponse
/// (không trả entity); việc tạo JWT thuộc lớp Presentation (Api/Auth/JwtTokenService) vì đó là chuyện của HTTP.
/// </summary>
public sealed class AuthService(AppDb db, IPasswordHasher<User> hasher)
{
    public async Task<ServiceResult<UserResponse>> Register(RegisterRequest? body, CancellationToken ct = default)
    {
        if (body is null
            || string.IsNullOrWhiteSpace(body.Username)
            || string.IsNullOrWhiteSpace(body.Email)
            || string.IsNullOrWhiteSpace(body.Password))
            return ServiceResult<UserResponse>.Fail(StatusCodes.Status400BadRequest, "Tên đăng nhập, email và mật khẩu là bắt buộc.");

        var username = body.Username.Trim();
        var email = body.Email.Trim();
        if (username.Length is < 3 or > 32)
            return ServiceResult<UserResponse>.Fail(StatusCodes.Status400BadRequest, "Tên đăng nhập phải từ 3 đến 32 ký tự.");
        if (email.Length > 256 || !email.Contains('@'))
            return ServiceResult<UserResponse>.Fail(StatusCodes.Status400BadRequest, "Email không hợp lệ.");
        if (body.Password.Length < 6)
            return ServiceResult<UserResponse>.Fail(StatusCodes.Status400BadRequest, "Mật khẩu phải có ít nhất 6 ký tự.");
        if (await db.Users.AnyAsync(u => u.Username == username, ct))
            return ServiceResult<UserResponse>.Fail(StatusCodes.Status400BadRequest, "Tên đăng nhập đã được sử dụng.");

        var user = new User
        {
            Username = username,
            Email = email,
            Role = Role.Player,
            IsLocked = false,
            CreatedAt = DateTimeOffset.UtcNow,
            Ratings =
            [
                new UserRating { GameType = GameType.Sudoku, Value = Elo.Initial },
                new UserRating { GameType = GameType.Minesweeper, Value = Elo.Initial },
            ],
        };
        user.PasswordHash = hasher.HashPassword(user, body.Password);
        db.Users.Add(user);
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            return ServiceResult<UserResponse>.Fail(StatusCodes.Status400BadRequest, "Tên đăng nhập đã được sử dụng.");
        }
        return ServiceResult<UserResponse>.Ok(ToUser(user));
    }

    public async Task<ServiceResult<UserResponse>> Login(LoginRequest? body, CancellationToken ct = default)
    {
        if (body is null || string.IsNullOrWhiteSpace(body.Username) || string.IsNullOrWhiteSpace(body.Password))
            return ServiceResult<UserResponse>.Fail(StatusCodes.Status400BadRequest, "Tên đăng nhập và mật khẩu là bắt buộc.");

        var user = await db.Users.SingleOrDefaultAsync(u => u.Username == body.Username.Trim(), ct);
        if (user is null
            || hasher.VerifyHashedPassword(user, user.PasswordHash, body.Password) == PasswordVerificationResult.Failed)
            return ServiceResult<UserResponse>.Fail(StatusCodes.Status401Unauthorized, "Sai mật khẩu.");
        if (user.IsLocked)
            return ServiceResult<UserResponse>.Fail(StatusCodes.Status403Forbidden, "Tài khoản đã bị khóa.");
        return ServiceResult<UserResponse>.Ok(ToUser(user));
    }

    // Chỉ được map ở môi trường Development (xem AuthEndpoints).
    public async Task<ServiceResult<UserResponse>> DevLogin(DevLoginRequest? body, CancellationToken ct = default)
    {
        if (body is null || string.IsNullOrWhiteSpace(body.Username))
            return ServiceResult<UserResponse>.Fail(StatusCodes.Status400BadRequest, "Thiếu tên đăng nhập.");

        var user = await db.Users.SingleOrDefaultAsync(u => u.Username == body.Username.Trim(), ct);
        if (user is null)
            return ServiceResult<UserResponse>.Fail(StatusCodes.Status404NotFound, "Không tìm thấy tài khoản dùng thử.");
        if (user.IsLocked)
            return ServiceResult<UserResponse>.Fail(StatusCodes.Status403Forbidden, "Tài khoản đã bị khóa.");
        return ServiceResult<UserResponse>.Ok(ToUser(user));
    }

    public async Task<ServiceResult<MeResponse>> Me(int userId, CancellationToken ct = default)
    {
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null)
            return ServiceResult<MeResponse>.Fail(StatusCodes.Status401Unauthorized,
                "Phiên đăng nhập đã hết hạn hoặc chưa đăng nhập. Vui lòng đăng nhập lại.");

        var dates = await db.Attempts.AsNoTracking()
            .Where(a => a.UserId == user.Id && a.Status == AttemptStatus.Solved && a.TournamentId == null && a.FinishedAt != null)
            .Join(db.Puzzles.Where(p => p.IsDaily), a => a.PuzzleId, p => p.Id, (a, _) => a.FinishedAt!.Value)
            .ToListAsync(ct);
        var streak = Streak.Compute(
            dates.Select(t => DateOnly.FromDateTime(t.UtcDateTime)),
            DateOnly.FromDateTime(DateTime.UtcNow));
        return ServiceResult<MeResponse>.Ok(new MeResponse(user.Id, user.Username, user.Role, streak));
    }

    public static UserResponse ToUser(User user) => new(user.Id, user.Username, user.Role);
}
