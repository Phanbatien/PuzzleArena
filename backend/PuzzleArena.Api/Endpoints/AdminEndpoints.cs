using Microsoft.EntityFrameworkCore;
using PuzzleArena.Api.Contracts;
using PuzzleArena.Api.Data;
using PuzzleArena.Api.Domain;

namespace PuzzleArena.Api.Endpoints;

public static class AdminEndpoints
{
    public static void MapAdminEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/admin").RequireAuthorization(policy => policy.RequireRole(nameof(Role.Admin)));
        group.MapGet("/users", ListUsers);
        group.MapPatch("/users/{id:int}/status", SetStatus);
        group.MapPatch("/users/{id:int}/role", SetRole);
    }

    private static async Task<IResult> ListUsers(AppDb db)
    {
        var users = await db.Users.AsNoTracking()
            .OrderBy(u => u.Id)
            .Select(u => new AdminUserResponse(u.Id, u.Username, u.Role, u.IsLocked, u.CreatedAt))
            .ToListAsync();
        return Results.Ok(users);
    }

    private static async Task<IResult> SetStatus(int id, LockRequest? body, AppDb db)
    {
        if (body is null)
            return ApiResults.Error("Thiếu trạng thái khóa.", StatusCodes.Status400BadRequest);

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user is null)
            return ApiResults.Error("Không tìm thấy người dùng.", StatusCodes.Status404NotFound);

        user.IsLocked = body.IsLocked;
        await db.SaveChangesAsync();
        return Results.Ok(ToResponse(user));
    }

    private static async Task<IResult> SetRole(int id, RoleRequest? body, AppDb db)
    {
        if (body is null || !Enum.IsDefined(body.Role))
            return ApiResults.Error("Vai trò không hợp lệ.", StatusCodes.Status400BadRequest);

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user is null)
            return ApiResults.Error("Không tìm thấy người dùng.", StatusCodes.Status404NotFound);

        user.Role = body.Role;
        await db.SaveChangesAsync();
        return Results.Ok(ToResponse(user));
    }

    private static AdminUserResponse ToResponse(Entities.User user) =>
        new(user.Id, user.Username, user.Role, user.IsLocked, user.CreatedAt);
}
