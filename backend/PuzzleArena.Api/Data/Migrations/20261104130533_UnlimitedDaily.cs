using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PuzzleArena.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class UnlimitedDaily : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Puzzles_GameType_Difficulty_DailyDate",
                table: "Puzzles");

            migrationBuilder.CreateIndex(
                name: "IX_Puzzles_GameType_Difficulty_DailyDate",
                table: "Puzzles",
                columns: new[] { "GameType", "Difficulty", "DailyDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Puzzles_GameType_Difficulty_DailyDate",
                table: "Puzzles");

            migrationBuilder.CreateIndex(
                name: "IX_Puzzles_GameType_Difficulty_DailyDate",
                table: "Puzzles",
                columns: new[] { "GameType", "Difficulty", "DailyDate" },
                unique: true);
        }
    }
}
