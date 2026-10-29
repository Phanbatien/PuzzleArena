using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace PuzzleArena.Api.Data;

public sealed class AppDbFactory : IDesignTimeDbContextFactory<AppDb>
{
    public AppDb CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<AppDb>()
            .UseNpgsql("Host=localhost;Port=5433;Database=puzzlearena;Username=puzzle;Password=puzzle")
            .Options;
        return new AppDb(options);
    }
}
