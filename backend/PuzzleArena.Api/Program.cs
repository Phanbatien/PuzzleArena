// Lớp 1 - Presentation: cấu hình HTTP (JWT, CORS, JSON), SignalR, đồng hồ nền và các endpoint.
// Mọi nghiệp vụ nằm ở lớp Business (AddBusiness); lớp này không biết database là gì.
using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using PuzzleArena.Api.Endpoints;
using PuzzleArena.Api.Hubs;
using PuzzleArena.Api.Realtime;
using PuzzleArena.Business;
using PuzzleArena.Business.Contracts;
using PuzzleArena.Business.Tournaments;

var builder = WebApplication.CreateBuilder(args);

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

// Lớp 2 (Business) + lớp 3 (Data Access: SQL Server, hoặc SQLite khi có UseSqlite).
builder.Services.AddBusiness(builder.Configuration);

// Realtime: lớp Business báo tin qua ITournamentNotifier, ở đây cài đặt bằng SignalR.
builder.Services.AddSignalR()
    .AddJsonProtocol(o => o.PayloadSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddScoped<ITournamentNotifier, SignalRTournamentNotifier>();
builder.Services.AddHostedService<TournamentClock>();

// Cache bảng xếp hạng: Redis nếu có ConnectionStrings:Redis, không thì bộ nhớ.
var redis = builder.Configuration.GetConnectionString("Redis");
if (string.IsNullOrWhiteSpace(redis))
    builder.Services.AddDistributedMemoryCache();
else
    builder.Services.AddStackExchangeRedisCache(options => options.Configuration = redis);

var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("Jwt:Key is missing.");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            NameClaimType = "sub",
            RoleClaimType = "role",
        };
        options.Events = new JwtBearerEvents
        {
            // Trình duyệt không gửi được header Authorization qua WebSocket: SignalR đưa token vào ?access_token=.
            OnMessageReceived = context =>
            {
                var token = context.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(token) && context.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                    context.Token = token;
                return Task.CompletedTask;
            },
            OnChallenge = async context =>
            {
                context.HandleResponse();
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await context.Response.WriteAsJsonAsync(
                    new ErrorResponse("Phiên đăng nhập đã hết hạn hoặc chưa đăng nhập. Vui lòng đăng nhập lại."),
                    ApiJson.Options);
            },
            OnForbidden = async context =>
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                await context.Response.WriteAsJsonAsync(
                    new ErrorResponse("Bạn không có quyền thực hiện thao tác này."),
                    ApiJson.Options);
            },
        };
    });
builder.Services.AddAuthorization();

// Địa chỉ frontend được gọi API: Cors:Origins trong appsettings, hoặc biến môi trường
// Cors__Origins__0, Cors__Origins__1... (scripts/tunnel.ps1 đặt địa chỉ trycloudflare.com vào đây).
var corsOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() is { Length: > 0 } configured
    ? configured
    : ["http://localhost:3000"];
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins(corsOrigins)
            .AllowAnyHeader()
            .WithMethods("GET", "POST", "PATCH")
            .AllowCredentials()); // SignalR client gửi kèm credentials khi negotiate
});

var app = builder.Build();

// Tạo / cập nhật bảng; môi trường dev thì thêm tài khoản dùng thử và (tùy chọn) dữ liệu giả cho bảng xếp hạng.
await app.Services.InitializeDatabaseAsync(
    app.Environment.IsDevelopment(),
    app.Configuration.GetValue("Seed:FakeLeaderboard", false));

app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));
app.MapGet("/api/hello/{ten}", (string ten) => Results.Ok(new { message = $"Xin chào {ten}" }));
app.MapAuthEndpoints();
app.MapDailyEndpoints();
app.MapProfileEndpoints();
app.MapBoosterEndpoints();
app.MapAdminEndpoints();
app.MapAttemptEndpoints();
app.MapAdminAttemptEndpoints();
app.MapTournamentEndpoints();
app.MapLeaderboardEndpoints();
app.MapHub<ArenaHub>("/hubs/arena");

app.Run();

public partial class Program;
