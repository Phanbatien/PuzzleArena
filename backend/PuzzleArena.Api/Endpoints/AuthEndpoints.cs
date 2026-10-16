using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using PuzzleArena.Api.Auth;
using PuzzleArena.Api.Contracts;
using PuzzleArena.Api.Data;
using PuzzleArena.Api.Domain;
using PuzzleArena.Api.Entities;
using PuzzleArena.Api.Rating;

namespace PuzzleArena.Api.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/auth");
        group.MapPost("/register", Register);
        group.MapPost("/login", Login);
        if (app.Environment.IsDevelopment())
            group.MapPost("/dev-login", DevLogin);

        app.MapGet("/api/me", Me).RequireAuthorization();
    }

    private static async Task<IResult> Register(
        RegisterRequest? body,
        AppDb db,
        IPasswordHasher<User> hasher,
        IConfiguration config)
    {
        if (body is null
            || string.IsNullOrWhiteSpace(body.Username)
            || string.IsNullOrWhiteSpace(body.Email)
            || string.IsNullOrWhiteSpace(body.Password))
        {
            return ApiResults.Error("Tên đăng nhập, email và mật khẩu là bắt buộc.", StatusCodes.Status400BadRequest);
        }

        var username = body.Username.Trim();
        var email = body.Email.Trim();
        if (username.Length is < 3 or > 32)
            return ApiResults.Error("Tên đăng nhập phải từ 3 đến 32 ký tự.", StatusCodes.Status400BadRequest);
        if (email.Length > 256 || !email.Contains('@'))
            return ApiResults.Error("Email không hợp lệ.", StatusCodes.Status400BadRequest);
        if (body.Password.Length < 6)
            return ApiResults.Error("Mật khẩu phải có ít nhất 6 ký tự.", StatusCodes.Status400BadRequest);

        if (await db.Users.AnyAsync(u => u.Username == username))
            return ApiResults.Error("Tên đăng nhập đã được sử dụng.", StatusCodes.Status400BadRequest);

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
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return ApiResults.Error("Tên đăng nhập đã được sử dụng.", StatusCodes.Status400BadRequest);
        }

        return Results.Ok(new AuthResponse(JwtTokenService.Create(user, config), ToUser(user)));
    }

    private static async Task<IResult> Login(
        LoginRequest? body,
        AppDb db,
        IPasswordHasher<User> hasher,
        IConfiguration config)
    {
        if (body is null || string.IsNullOrWhiteSpace(body.Username) || string.IsNullOrWhiteSpace(body.Password))
            return ApiResults.Error("Tên đăng nhập và mật khẩu là bắt buộc.", StatusCodes.Status400BadRequest);

        var user = await db.Users.SingleOrDefaultAsync(u => u.Username == body.Username.Trim());
        if (user is null
            || hasher.VerifyHashedPassword(user, user.PasswordHash, body.Password) == PasswordVerificationResult.Failed)
        {
            return ApiResults.Error("Sai mật khẩu.", StatusCodes.Status401Unauthorized);
        }

        if (user.IsLocked)
            return ApiResults.Error("Tài khoản đã bị khóa.", StatusCodes.Status403Forbidden);

        return Results.Ok(new AuthResponse(JwtTokenService.Create(user, config), ToUser(user)));
    }

    private static async Task<IResult> DevLogin(DevLoginRequest? body, AppDb db, IConfiguration config)
    {
        if (body is null || string.IsNullOrWhiteSpace(body.Username))
            return ApiResults.Error("Thiếu tên đăng nhập.", StatusCodes.Status400BadRequest);

        var user = await db.Users.SingleOrDefaultAsync(u => u.Username == body.Username.Trim());
        if (user is null)
            return ApiResults.Error("Không tìm thấy tài khoản dùng thử.", StatusCodes.Status404NotFound);
        if (user.IsLocked)
            return ApiResults.Error("Tài khoản đã bị khóa.", StatusCodes.Status403Forbidden);

        return Results.Ok(new AuthResponse(JwtTokenService.Create(user, config), ToUser(user)));
    }

    private static async Task<IResult> Me(HttpContext http, AppDb db)
    {
        var userId = CurrentUserId(http);
        if (userId is null)
            return ApiResults.Error("Phiên đăng nhập đã hết hạn hoặc chưa đăng nhập. Vui lòng đăng nhập lại.", StatusCodes.Status401Unauthorized);

        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null)
            return ApiResults.Error("Phiên đăng nhập đã hết hạn hoặc chưa đăng nhập. Vui lòng đăng nhập lại.", StatusCodes.Status401Unauthorized);

        var dates = await db.Attempts.AsNoTracking()
            .Where(a => a.UserId == user.Id
                && a.Status == AttemptStatus.Solved
                && a.TournamentId == null
                && a.FinishedAt != null)
            .Join(db.Puzzles.Where(p => p.IsDaily), a => a.PuzzleId, p => p.Id, (a, _) => a.FinishedAt!.Value)
            .ToListAsync();
        var streak = Streak.Compute(
            dates.Select(t => DateOnly.FromDateTime(t.UtcDateTime)),
            DateOnly.FromDateTime(DateTime.UtcNow));

        return Results.Ok(new MeResponse(user.Id, user.Username, user.Role, streak));
    }

    internal static int? CurrentUserId(HttpContext http)
    {
        var sub = http.User.FindFirst("sub")?.Value;
        return int.TryParse(sub, out var id) ? id : null;
    }

    private static UserResponse ToUser(User user) => new(user.Id, user.Username, user.Role);
}
