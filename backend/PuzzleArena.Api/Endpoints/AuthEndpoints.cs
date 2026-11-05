using PuzzleArena.Api.Auth;
using PuzzleArena.Business;
using PuzzleArena.Business.Auth;
using PuzzleArena.Business.Contracts;

namespace PuzzleArena.Api.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/auth");
        group.MapPost("/register", async (RegisterRequest? body, AuthService auth, IConfiguration config, CancellationToken ct) =>
            WithToken(await auth.Register(body, ct), config));
        group.MapPost("/login", async (LoginRequest? body, AuthService auth, IConfiguration config, CancellationToken ct) =>
            WithToken(await auth.Login(body, ct), config));
        if (app.Environment.IsDevelopment())
            group.MapPost("/dev-login", async (DevLoginRequest? body, AuthService auth, IConfiguration config, CancellationToken ct) =>
                WithToken(await auth.DevLogin(body, ct), config));

        app.MapGet("/api/me", async (HttpContext http, AuthService auth, CancellationToken ct) =>
            CurrentUserId(http) is { } userId ? ApiResults.From(await auth.Me(userId, ct)) : ApiResults.Unauthorized())
            .RequireAuthorization();
    }

    // Lớp Business xác thực tài khoản; tạo JWT là việc của lớp Presentation.
    private static IResult WithToken(ServiceResult<UserResponse> result, IConfiguration config) =>
        result.Error is not null
            ? ApiResults.Error(result.Error, result.Status)
            : Results.Ok(new AuthResponse(JwtTokenService.Create(result.Value!, config), result.Value!));

    /// <summary>Id người dùng trong JWT (claim "sub"); null nếu chưa đăng nhập.</summary>
    internal static int? CurrentUserId(HttpContext http)
    {
        var sub = http.User.FindFirst("sub")?.Value;
        return int.TryParse(sub, out var id) ? id : null;
    }
}
