using PuzzleArena.Business.Admin;
using PuzzleArena.Business.Contracts;
using PuzzleArena.DataAccess.Domain;

namespace PuzzleArena.Api.Endpoints;

public static class AdminEndpoints
{
    public static void MapAdminEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/admin").RequireAuthorization(policy => policy.RequireRole(nameof(Role.Admin)));

        group.MapGet("/users", async (AdminUserService admin, CancellationToken ct) => Results.Ok(await admin.List(ct)));

        group.MapPatch("/users/{id:int}/status", async (int id, LockRequest? body, HttpContext http, AdminUserService admin, CancellationToken ct) =>
        {
            if (body is null) return ApiResults.Error("Thiếu trạng thái khóa.", StatusCodes.Status400BadRequest);
            if (AuthEndpoints.CurrentUserId(http) is not { } caller) return ApiResults.Unauthorized();
            return ApiResults.From(await admin.SetLocked(caller, id, body.IsLocked, ct));
        });

        group.MapPatch("/users/{id:int}/role", async (int id, RoleRequest? body, HttpContext http, AdminUserService admin, CancellationToken ct) =>
        {
            if (body is null) return ApiResults.Error("Vai trò không hợp lệ.", StatusCodes.Status400BadRequest);
            if (AuthEndpoints.CurrentUserId(http) is not { } caller) return ApiResults.Unauthorized();
            return ApiResults.From(await admin.SetRole(caller, id, body.Role, ct));
        });
    }
}
