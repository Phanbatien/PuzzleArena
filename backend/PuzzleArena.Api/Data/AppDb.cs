using Microsoft.EntityFrameworkCore;
using PuzzleArena.Api.Domain;
using PuzzleArena.Api.Entities;

namespace PuzzleArena.Api.Data;

public class AppDb(DbContextOptions<AppDb> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<UserRating> UserRatings => Set<UserRating>();
    public DbSet<Puzzle> Puzzles => Set<Puzzle>();
    public DbSet<Attempt> Attempts => Set<Attempt>();
    public DbSet<BoosterGrant> BoosterGrants => Set<BoosterGrant>();
    public DbSet<AttemptRating> AttemptRatings => Set<AttemptRating>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.Property(u => u.Username).HasMaxLength(32);
            entity.Property(u => u.Email).HasMaxLength(256);
            entity.Property(u => u.PasswordHash).HasMaxLength(500);
            entity.Property(u => u.Role).HasConversion<string>().HasMaxLength(16);
            entity.HasIndex(u => u.Username).IsUnique();
        });

        modelBuilder.Entity<UserRating>(entity =>
        {
            entity.Property(r => r.GameType).HasConversion<string>().HasMaxLength(16);
            entity.HasIndex(r => new { r.UserId, r.GameType }).IsUnique();
        });

        modelBuilder.Entity<Puzzle>(entity =>
        {
            entity.Property(p => p.GameType).HasConversion<string>().HasMaxLength(16);
            entity.Property(p => p.Difficulty).HasConversion<string>().HasMaxLength(16);
            entity.HasIndex(p => new { p.GameType, p.Difficulty, p.DailyDate }).IsUnique();
        });

        modelBuilder.Entity<Attempt>(entity =>
        {
            entity.Property(a => a.Status).HasConversion<string>().HasMaxLength(16);
            entity.HasIndex(a => new { a.UserId, a.PuzzleId });
        });

        modelBuilder.Entity<BoosterGrant>(entity =>
        {
            entity.Property(g => g.Type).HasConversion<string>().HasMaxLength(16);
            entity.Property(g => g.Reason).HasMaxLength(64);
            entity.HasIndex(g => new { g.UserId, g.Reason });
        });

        modelBuilder.Entity<AttemptRating>(entity =>
        {
            entity.HasIndex(r => r.AttemptId).IsUnique();
        });
    }
}
