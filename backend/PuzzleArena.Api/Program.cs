using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PuzzleArena.Api.Boosters;
using PuzzleArena.Api.Contracts;
using PuzzleArena.Api.Data;
using PuzzleArena.Api.Endpoints;
using PuzzleArena.Api.Entities;
using PuzzleArena.Api.Games;
using PuzzleArena.Api.Hubs;
using PuzzleArena.Api.Rating;
using PuzzleArena.Api.Tournaments;

var builder = WebApplication.CreateBuilder(args);

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

var sqlite = builder.Configuration["UseSqlite"];
if (!string.IsNullOrWhiteSpace(sqlite))
    builder.Services.AddDbContext<AppDb>(options => options.UseSqlite(sqlite));
else
    builder.Services.AddDbContext<AppDb>(options =>
        options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddSingleton<IPuzzleGenerator, GamePuzzleGenerator>();
builder.Services.AddScoped<IRatingService, RatingService>();
builder.Services.AddScoped<IBoosterService, BoosterService>();
builder.Services.AddScoped<AttemptService>();

// BE3: giải đấu, realtime, cache bảng xếp hạng.
builder.Services.AddScoped<TournamentService>();
builder.Services.AddScoped<TournamentEvents>();
builder.Services.AddScoped<IAttemptEvents>(sp => sp.GetRequiredService<TournamentEvents>());
builder.Services.AddHostedService<TournamentClock>();
builder.Services.AddSignalR()
    .AddJsonProtocol(o => o.PayloadSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
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

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins("http://localhost:3000")
            .AllowAnyHeader()
            .WithMethods("GET", "POST", "PATCH")
            .AllowCredentials()); // SignalR client gửi kèm credentials khi negotiate
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDb>();
    if (db.Database.ProviderName?.Contains("Sqlite", StringComparison.OrdinalIgnoreCase) == true)
        db.Database.EnsureCreated();
    else
        db.Database.Migrate();

    if (app.Environment.IsDevelopment())
    {
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>();
        await DevSeeder.SeedAsync(db, hasher);
        if (app.Configuration.GetValue("Seed:FakeLeaderboard", false))
            await DemoLeaderboardSeeder.SeedAsync(db, scope.ServiceProvider.GetRequiredService<IPuzzleGenerator>());
    }
}

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
