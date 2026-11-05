using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace PuzzleArena.DataAccess;

public sealed class AppDbFactory : IDesignTimeDbContextFactory<AppDb>
{
    public AppDb CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<AppDb>()
            // Chỉ dùng cho lệnh dotnet ef (tạo migration). Chạy app thì lấy ConnectionStrings:Default.
            .UseSqlServer(Environment.GetEnvironmentVariable("ConnectionStrings__Default")
                ?? "Server=localhost;Database=PuzzleArena;Trusted_Connection=True;TrustServerCertificate=True")
            .Options;
        return new AppDb(options);
    }
}
