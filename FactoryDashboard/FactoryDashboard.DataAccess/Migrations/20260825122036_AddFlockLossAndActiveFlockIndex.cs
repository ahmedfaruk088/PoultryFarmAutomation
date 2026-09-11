using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FactoryDashboard.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class AddFlockLossAndActiveFlockIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Flocks_CoopId",
                table: "Flocks");

            migrationBuilder.CreateTable(
                name: "FlockLosses",
                columns: table => new
                {
                    LossId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    FlockId = table.Column<int>(type: "int", nullable: false),
                    LossCount = table.Column<int>(type: "int", nullable: false),
                    RecordedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FlockLosses", x => x.LossId);
                    table.ForeignKey(
                        name: "FK_FlockLosses_Flocks_FlockId",
                        column: x => x.FlockId,
                        principalTable: "Flocks",
                        principalColumn: "FlockId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "UX_Flocks_CoopId_Active",
                table: "Flocks",
                column: "CoopId",
                unique: true,
                filter: "[EndDate] IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_FlockLosses_FlockId",
                table: "FlockLosses",
                column: "FlockId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FlockLosses");

            migrationBuilder.DropIndex(
                name: "UX_Flocks_CoopId_Active",
                table: "Flocks");

            migrationBuilder.CreateIndex(
                name: "IX_Flocks_CoopId",
                table: "Flocks",
                column: "CoopId");
        }
    }
}
