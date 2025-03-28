<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>記事追加</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="/css/style.css">
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
</head>
<body class="container mt-5">

    <h2 class="mb-3">カテゴリ</h2>
    <form>
        <div class="dropdown mb-3">
            <button class="btn btn-secondary dropdown-toggle" type="button" id="dropdownMenuButton1" data-bs-toggle="dropdown" aria-expanded="false">
                Dropdown button
            </button>
            <ul class="dropdown-menu" aria-labelledby="dropdownMenuButton1">
                <li><a class="dropdown-item" href="#">カテゴリ1</a></li>
                <li><a class="dropdown-item" href="#">カテゴリ2</a></li>
                <li><a class="dropdown-item" href="#">カテゴリ3</a></li>
            </ul>
        </div>

        <div class="mb-3">
            <label for="title" class="form-label">タイトル</label>
            <input type="text" id="title" name="title" class="form-control" placeholder="記事タイトルを入力">
        </div>

        <!-- 横並びレイアウト開始 -->
        <div class="row">
            <div class="col-md-6">
                <label for="content" class="form-label">本文（Markdown入力）</label>
                <textarea id="content" name="content" class="form-control" rows="10" placeholder="ここに本文を書く" style="height: 400px;"></textarea>
            </div>
            <div class="col-md-6">
                <label class="form-label">プレビュー</label>
                <div id="preview" class="border p-3 bg-light" style="height: 400px; overflow: auto;"></div>
            </div>
        </div>
        <!-- 横並びレイアウト終了 -->

        <button type="submit" class="btn btn-info mt-3">送信</button>
    </form>

    <script>
        document.getElementById('content').addEventListener('input', function() {
            const markdownText = this.value;
            document.getElementById('preview').innerHTML = marked.parse(markdownText);
        });
    </script>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>