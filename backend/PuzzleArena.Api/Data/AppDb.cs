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
    public DbSet<Tournament> Tournaments => Set<Tournament>();
    public DbSet<TournamentEntry> TournamentEntries => Set<TournamentEntry>();
    public DbSet<TournamentMatch> TournamentMatches => Set<TournamentMatch>();

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
            // Daily không giới hạn: một ngày có nhiều đề cùng game + độ khó (mỗi lượt một đề riêng).
            entity.HasIndex(p => new { p.GameType, p.Difficulty, p.DailyDate });
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

        // BE3: tournaments. Standings are computed from Attempt, so there is no ranking table.
        modelBuilder.Entity<Tournament>(entity =>
        {
            entity.Property(t => t.Name).HasMaxLength(80);
            entity.Property(t => t.Description).HasMaxLength(1000);
            entity.Property(t => t.ClosedNote).HasMaxLength(200);
            entity.Property(t => t.GameType).HasConversion<string>().HasMaxLength(16);
            entity.Property(t => t.Difficulty).HasConversion<string>().HasMaxLength(16);
            entity.Property(t => t.Status).HasConversion<string>().HasMaxLength(16);
            entity.HasIndex(t => new { t.Status, t.StartsAt });
        });

        modelBuilder.Entity<TournamentMatch>(entity =>
        {
            entity.Property(m => m.Status).HasConversion<string>().HasMaxLength(16);
            entity.Property(m => m.Note).HasMaxLength(120);
            entity.HasIndex(m => new { m.TournamentId, m.Round, m.Slot }).IsUnique();
            entity.HasOne(m => m.Player1).WithMany().HasForeignKey(m => m.Player1Id).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(m => m.Player2).WithMany().HasForeignKey(m => m.Player2Id).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<TournamentEntry>(entity =>
        {
            entity.HasIndex(e => new { e.TournamentId, e.UserId }).IsUnique();
        });

        modelBuilder.Entity<Attempt>().HasIndex(a => a.TournamentId);
    }
}
