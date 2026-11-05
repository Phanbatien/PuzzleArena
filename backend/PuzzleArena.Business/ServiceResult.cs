namespace PuzzleArena.Business;

/// <summary>
/// Kết quả của một nghiệp vụ: có giá trị, hoặc có lỗi (thông báo tiếng Việt + mã HTTP gợi ý).
/// Lớp Presentation chỉ việc đổi sang response; lớp Business không tạo response HTTP.
/// </summary>
public sealed record ServiceResult<T>(T? Value, string? Error = null, int Status = StatusCodes.Status200OK)
{
    public static ServiceResult<T> Ok(T value) => new(value);
    public static ServiceResult<T> Fail(int status, string error) => new(default, error, status);
}
