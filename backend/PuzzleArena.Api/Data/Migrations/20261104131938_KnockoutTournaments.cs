using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PuzzleArena.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class KnockoutTournaments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Giải theo thể thức cũ (vòng loại + chung kết top N) không chuyển được sang nhánh loại trực tiếp:
            // trạng thái QualifierDone/Final không còn. Dự án chưa có dữ liệu thật nên xóa giải cũ.
            migrationBuilder.Sql("DELETE FROM \"TournamentEntries\";");
            migrationBuilder.Sql("DELETE FROM \"TournamentPuzzles\";");
            migrationBuilder.Sql("DELETE FROM \"Tournaments\";");

            migrationBuilder.DropTable(
                name: "TournamentPuzzles");

            migrationBuilder.DropColumn(
                name: "IsFinalist",
                table: "TournamentEntries");

            migrationBuilder.RenameColumn(
                name: "FinalistCount",
                table: "Tournaments",
                newName: "RoundCount");

            migrationBuilder.RenameColumn(
                name: "FinalStartedAt",
                table: "Tournaments",
                newName: "RoundStartsAt");

            migrationBuilder.AddColumn<int>(
                name: "BracketSize",
                table: "Tournaments",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "ClosedNote",
                table: "Tournaments",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CurrentRound",
                table: "Tournaments",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Tournaments",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "QualifierPuzzleId",
                table: "Tournaments",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "StartsAt",
                table: "Tournaments",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.AddColumn<int>(
                name: "EliminatedInRound",
                table: "TournamentEntries",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "QualifierRank",
                table: "TournamentEntries",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Seed",
                table: "TournamentEntries",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "TournamentMatches",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TournamentId = table.Column<int>(type: "integer", nullable: false),
                    Round = table.Column<int>(type: "integer", nullable: false),
                    Slot = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    Player1Id = table.Column<int>(type: "integer", nullable: true),
                    Player2Id = table.Column<int>(type: "integer", nullable: true),
                    Seed1 = table.Column<int>(type: "integer", nullable: true),
                    Seed2 = table.Column<int>(type: "integer", nullable: true),
                    PuzzleId = table.Column<int>(type: "integer", nullable: true),
                    Attempt1Id = table.Column<int>(type: "integer", nullable: true),
                    Attempt2Id = table.Column<int>(type: "integer", nullable: true),
                    WinnerId = table.Column<int>(type: "integer", nullable: true),
                    Note = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    StartedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    FinishedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TournamentMatches", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TournamentMatches_Puzzles_PuzzleId",
                        column: x => x.PuzzleId,
                        principalTable: "Puzzles",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_TournamentMatches_Tournaments_TournamentId",
                        column: x => x.TournamentId,
                        principalTable: "Tournaments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TournamentMatches_Users_Player1Id",
                        column: x => x.Player1Id,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TournamentMatches_Users_Player2Id",
                        column: x => x.Player2Id,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Tournaments_QualifierPuzzleId",
                table: "Tournaments",
                column: "QualifierPuzzleId");

            migrationBuilder.CreateIndex(
                name: "IX_Tournaments_Status_StartsAt",
                table: "Tournaments",
                columns: new[] { "Status", "StartsAt" });

            migrationBuilder.CreateIndex(
                name: "IX_TournamentMatches_Player1Id",
                table: "TournamentMatches",
                column: "Player1Id");

            migrationBuilder.CreateIndex(
                name: "IX_TournamentMatches_Player2Id",
                table: "TournamentMatches",
                column: "Player2Id");

            migrationBuilder.CreateIndex(
                name: "IX_TournamentMatches_PuzzleId",
                table: "TournamentMatches",
                column: "PuzzleId");

            migrationBuilder.CreateIndex(
                name: "IX_TournamentMatches_TournamentId_Round_Slot",
                table: "TournamentMatches",
                columns: new[] { "TournamentId", "Round", "Slot" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Tournaments_Puzzles_QualifierPuzzleId",
                table: "Tournaments",
                column: "QualifierPuzzleId",
                principalTable: "Puzzles",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Tournaments_Puzzles_QualifierPuzzleId",
                table: "Tournaments");

            migrationBuilder.DropTable(
                name: "TournamentMatches");

            migrationBuilder.DropIndex(
                name: "IX_Tournaments_QualifierPuzzleId",
                table: "Tournaments");

            migrationBuilder.DropIndex(
                name: "IX_Tournaments_Status_StartsAt",
                table: "Tournaments");

            migrationBuilder.DropColumn(
                name: "BracketSize",
                table: "Tournaments");

            migrationBuilder.DropColumn(
                name: "ClosedNote",
                table: "Tournaments");

            migrationBuilder.DropColumn(
                name: "CurrentRound",
                table: "Tournaments");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "Tournaments");

            migrationBuilder.DropColumn(
                name: "QualifierPuzzleId",
                table: "Tournaments");

            migrationBuilder.DropColumn(
                name: "StartsAt",
                table: "Tournaments");

            migrationBuilder.DropColumn(
                name: "EliminatedInRound",
                table: "TournamentEntries");

            migrationBuilder.DropColumn(
                name: "QualifierRank",
                table: "TournamentEntries");

            migrationBuilder.DropColumn(
                name: "Seed",
                table: "TournamentEntries");

            migrationBuilder.RenameColumn(
                name: "RoundStartsAt",
                table: "Tournaments",
                newName: "FinalStartedAt");

            migrationBuilder.RenameColumn(
                name: "RoundCount",
                table: "Tournaments",
                newName: "FinalistCount");

            migrationBuilder.AddColumn<bool>(
                name: "IsFinalist",
                table: "TournamentEntries",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "TournamentPuzzles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PuzzleId = table.Column<int>(type: "integer", nullable: false),
                    TournamentId = table.Column<int>(type: "integer", nullable: false),
                    Stage = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TournamentPuzzles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TournamentPuzzles_Puzzles_PuzzleId",
                        column: x => x.PuzzleId,
                        principalTable: "Puzzles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TournamentPuzzles_Tournaments_TournamentId",
                        column: x => x.TournamentId,
                        principalTable: "Tournaments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TournamentPuzzles_PuzzleId",
                table: "TournamentPuzzles",
                column: "PuzzleId");

            migrationBuilder.CreateIndex(
                name: "IX_TournamentPuzzles_TournamentId_Stage",
                table: "TournamentPuzzles",
                columns: new[] { "TournamentId", "Stage" },
                unique: true);
        }
    }
}
