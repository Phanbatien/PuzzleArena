using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PuzzleArena.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class MatchReadyCheck : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "Ready1At",
                table: "TournamentMatches",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "Ready2At",
                table: "TournamentMatches",
                type: "datetimeoffset",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Ready1At",
                table: "TournamentMatches");

            migrationBuilder.DropColumn(
                name: "Ready2At",
                table: "TournamentMatches");
        }
    }
}
