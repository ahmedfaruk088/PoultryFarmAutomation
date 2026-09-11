using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FactoryDashboard.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class AddFlockCoopRelationship : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "CoopId",
                table: "Flocks",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "CoopId",
                table: "Coops",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");

            migrationBuilder.CreateIndex(
                name: "IX_Flocks_CoopId",
                table: "Flocks",
                column: "CoopId");

            migrationBuilder.AddForeignKey(
                name: "FK_Flocks_Coops_CoopId",
                table: "Flocks",
                column: "CoopId",
                principalTable: "Coops",
                principalColumn: "CoopId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Flocks_Coops_CoopId",
                table: "Flocks");

            migrationBuilder.DropIndex(
                name: "IX_Flocks_CoopId",
                table: "Flocks");

            migrationBuilder.AlterColumn<string>(
                name: "CoopId",
                table: "Flocks",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<string>(
                name: "CoopId",
                table: "Coops",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50);
        }
    }
}
