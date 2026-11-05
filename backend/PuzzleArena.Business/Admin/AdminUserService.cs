using PuzzleArena.Business.Contracts;

namespace PuzzleArena.Business.Admin;

/// <summary>Quản trị người dùng (BE1): danh sách, khóa / mở khóa, đổi vai trò. Admin không tự khóa / tự đổi vai trò mình.</summary>
public sealed class AdminUserService(AppDb db)
{
    public Task<List<AdminUserResponse>> List(CancellationToken ct = default) =>
        db.Users.AsNoTracking()
            .OrderBy(u => u.Id)
            .Select(u => new AdminUserResponse(u.Id, u.Username, u.Role, u.IsLocked, u.CreatedAt))
            .ToListAsync(ct);

    public async Task<ServiceResult<AdminUserResponse>> SetLocked(int callerId, int userId, bool isLocked, CancellationToken ct = default)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null)
            return ServiceResult<AdminUserResponse>.Fail(StatusCodes.Status404NotFound, "Không tìm thấy người dùng.");
        if (user.Id == callerId && isLocked)
            return ServiceResult<AdminUserResponse>.Fail(StatusCodes.Status400BadRequest, "Bạn không thể tự khóa tài khoản của mình.");

        user.IsLocked = isLocked;
        await db.SaveChangesAsync(ct);
        return ServiceResult<AdminUserResponse>.Ok(ToResponse(user));
    }

    public async Task<ServiceResult<AdminUserResponse>> SetRole(int callerId, int userId, Role role, CancellationToken ct = default)
    {
        if (!Enum.IsDefined(role))
            return ServiceResult<AdminUserResponse>.Fail(StatusCodes.Status400BadRequest, "Vai trò không hợp lệ.");
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null)
            return ServiceResult<AdminUserResponse>.Fail(StatusCodes.Status404NotFound, "Không tìm thấy người dùng.");
        if (user.Id == callerId)
            return ServiceResult<AdminUserResponse>.Fail(StatusCodes.Status400BadRequest, "Bạn không thể tự đổi vai trò của mình.");

        user.Role = role;
        await db.SaveChangesAsync(ct);
        return ServiceResult<AdminUserResponse>.Ok(ToResponse(user));
    }

    private static AdminUserResponse ToResponse(User user) =>
        new(user.Id, user.Username, user.Role, user.IsLocked, user.CreatedAt);
}
