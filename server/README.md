# NoteApp - Backend API

FastAPIを使用したバックエンドAPI（Google Cloud Run対応）

## セットアップ

### 1. 環境変数の設定

```bash
cd server
cp .env.example .env
```

`.env`ファイルを編集して、APIキーを設定してください：

```
OPENAI_API_KEY=your_actual_openai_api_key
GOOGLE_API_KEY=your_actual_google_api_key
```

### 2. Dockerを使用する場合（推奨）

プロジェクトルートディレクトリで：

```bash
docker compose up --build
```

### 3. ローカル環境で直接実行する場合

```bash
cd server
pip install -r requirements.txt
python -m uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

## APIエンドポイント

### チャット機能

**POST /api/chat**
```json
{
  "message": "こんにちは",
  "provider": "openai",
  "model": "gpt-3.5-turbo",
  "context": {
    "currentFileContent": {
      "filename": "test.md",
      "content": "# テスト"
    }
  }
}
```

**GET /api/chat**（テスト用）
```
/api/chat?message=こんにちは&provider=openai&model=gpt-3.5-turbo
```

### プロバイダー情報

**GET /api/llm-providers**

利用可能なLLMプロバイダーのリストを取得

### ヘルスチェック

**GET /api/health**

APIの状態を確認

## テスト方法

### curlでテスト

```bash
# ヘルスチェック
curl http://localhost:8000/api/health

# プロバイダー一覧
curl http://localhost:8000/api/llm-providers

# チャット（GET）
curl "http://localhost:8000/api/chat?message=こんにちは"

# チャット（POST）
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "こんにちは", "provider": "openai", "model": "gpt-3.5-turbo"}'
```

### ブラウザでテスト

1. http://localhost:8000 にアクセス
2. http://localhost:8000/docs にアクセス（Swagger UI）

## 注意事項

- 開発環境ではCORSが全て許可されています（`allow_origins=["*"]`）
- 本番環境では適切なCORS設定を行ってください
- APIキーは必ず`.env`ファイルで管理し、Gitにコミットしないでください
