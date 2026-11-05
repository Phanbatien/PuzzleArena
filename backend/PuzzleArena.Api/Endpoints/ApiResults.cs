using PuzzleArena.Business;
using PuzzleArena.Business.Contracts;

namespace PuzzleArena.Api.Endpoints;

// Đổi kết quả của lớp Business sang response HTTP. Lỗi luôn có dạng { "error": "..." }.
public static class ApiResults
{
    public static IResult Error(string message, int statusCode) =>
        Results.Json(new ErrorResponse(message), ApiJson.Options, statusCode: statusCode);

    public static IResult From<T>(ServiceResult<T> result) =>
        result.Error is null ? Results.Ok(result.Value) : Error(result.Error, result.Status);

    public static IResult Unauthorized() =>
        Error("Phiên đăng nhập đã hết hạn hoặc chưa đăng nhập. Vui lòng đăng nhập lại.", StatusCodes.Status401Unauthorized);
}
