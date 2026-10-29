using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace PuzzleArena.Tests;

public class ApiFactory : WebApplicationFactory<Program>
{
    private readonly string _environment;
    private readonly string _dbPath;

    public ApiFactory()
        : this("Development")
    {
    }

    protected ApiFactory(string environment)
    {
        _environment = environment;
        _dbPath = Path.Combine(Path.GetTempPath(), $"puzzlearena-{Guid.NewGuid():N}.db");
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(_environment);
        builder.UseSetting("UseSqlite", $"Data Source={_dbPath}");
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        TryDelete(_dbPath);
        TryDelete(_dbPath + "-wal");
        TryDelete(_dbPath + "-shm");
    }

    private static void TryDelete(string path)
    {
        try
        {
            if (File.Exists(path))
                File.Delete(path);
        }
        catch (IOException)
        {
        }
    }
}

public sealed class ProductionApiFactory : ApiFactory
{
    public ProductionApiFactory() : base("Production")
    {
    }
}
