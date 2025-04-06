var builder = WebApplication.CreateBuilder(args);

// CORSの設定（フロントエンドからAPIを呼び出せるように）
builder.Services.AddCors();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// CORSを有効にする
app.UseCors(policy =>
    policy.WithOrigins("http://localhost:3000")  // Reactのフロントエンドが動いているURLを指定
        .AllowAnyHeader()
        .AllowAnyMethod()
);

// Swaggerを開発環境で使えるようにする
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// シンプルなGET APIエンドポイント
app.MapGet("/weatherforecast", () =>
{
    var forecast = new[] 
    {
        new { Date = DateTime.Now.ToString("yyyy-MM-dd"), TemperatureC = 22, Summary = "Warm" },
        new { Date = DateTime.Now.AddDays(1).ToString("yyyy-MM-dd"), TemperatureC = 18, Summary = "Cool" },
        new { Date = DateTime.Now.AddDays(2).ToString("yyyy-MM-dd"), TemperatureC = 25, Summary = "Hot" }
    };

    return forecast;
});

app.Run();
