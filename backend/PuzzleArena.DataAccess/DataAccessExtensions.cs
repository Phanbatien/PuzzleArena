using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace PuzzleArena.DataAccess;

public static class DataAccessExtensions
{
    /// <summary>
    /// Đăng ký AppDb. Có "UseSqlite" (launch profile sqlite, test) thì dùng file SQLite,
    /// không thì SQL Server theo ConnectionStrings:Default.
    /// </summary>
    public static IServiceCollection AddDataAccess(this IServiceCollection services, IConfiguration config)
    {
        var sqlite = config["UseSqlite"];
        if (!string.IsNullOrWhiteSpace(sqlite))
            services.AddDbContext<AppDb>(options => options.UseSqlite(sqlite));
        else
            services.AddDbContext<AppDb>(options => options.UseSqlServer(config.GetConnectionString("Default")));
        return services;
    }

    /// <summary>Tạo bảng: SQLite thì EnsureCreated, SQL Server thì chạy migration.</summary>
    public static async Task MigrateAsync(this AppDb db)
    {
        if (db.Database.ProviderName?.Contains("Sqlite", StringComparison.OrdinalIgnoreCase) == true)
            await db.Database.EnsureCreatedAsync();
        else
            await db.Database.MigrateAsync();
    }
}
