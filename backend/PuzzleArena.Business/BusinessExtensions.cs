using Microsoft.AspNetCore.Identity;
using PuzzleArena.Business.Admin;
using PuzzleArena.Business.Auth;
using PuzzleArena.Business.Boosters;
using PuzzleArena.Business.Daily;
using PuzzleArena.Business.Games;
using PuzzleArena.Business.Leaderboard;
using PuzzleArena.Business.Profile;
using PuzzleArena.Business.Rating;
using PuzzleArena.Business.Seeding;
using PuzzleArena.Business.Tournaments;

namespace PuzzleArena.Business;

public static class BusinessExtensions
{
    /// <summary>
    /// Đăng ký lớp Business (và lớp Data Access bên dưới). Lớp Presentation chỉ gọi hàm này,
    /// nên không cần biết AppDb hay SQL Server / SQLite.
    /// </summary>
    public static IServiceCollection AddBusiness(this IServiceCollection services, IConfiguration config)
    {
        services.AddDataAccess(config);

        services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();
        services.AddSingleton<IPuzzleGenerator, GamePuzzleGenerator>();
        services.AddScoped<AuthService>();
        services.AddScoped<AdminUserService>();
        services.AddScoped<DailyService>();
        services.AddScoped<ProfileService>();
        services.AddScoped<IRatingService, RatingService>();
        services.AddScoped<IBoosterService, BoosterService>();
        services.AddScoped<AttemptService>();
        services.AddScoped<LeaderboardService>();
        services.AddScoped<TournamentService>();
        services.AddScoped<TournamentEvents>();
        services.AddScoped<IAttemptEvents>(sp => sp.GetRequiredService<TournamentEvents>());
        return services;
    }

    /// <summary>Lúc khởi động: tạo / cập nhật bảng; môi trường dev thì thêm tài khoản dùng thử và dữ liệu giả.</summary>
    public static async Task InitializeDatabaseAsync(this IServiceProvider services, bool isDevelopment, bool seedFakeLeaderboard)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDb>();
        await db.MigrateAsync();
        if (!isDevelopment)
            return;

        await DevSeeder.SeedAsync(db, scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>());
        if (seedFakeLeaderboard)
            await DemoLeaderboardSeeder.SeedAsync(db, scope.ServiceProvider.GetRequiredService<IPuzzleGenerator>());
    }
}
