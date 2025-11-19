# 新アーキテクチャ（フェーズ1）動作確認ガイド

このガイドでは、フェーズ1で実装した新しい基盤アーキテクチャの動作確認方法を説明します。

## 📋 前提条件

- Docker & Docker Compose がインストールされていること
- （オプション）GCPサービスアカウントキー（Secret Manager使用時）

## 🚀 クイックスタート

### 1. 環境変数の設定

`.env.development`ファイルに必要な環境変数を設定するか、`.env.test`をコピーして使用：

```bash
cp .env.test .env.development
```

**最小限の設定（Secret Manager不使用）:**
```env
USE_SECRET_MANAGER=false
DEBUG=true
ENVIRONMENT=development
DATABASE_URL=sqlite:///./billing.db
REDIS_URL=redis://redis:6379/0
JWT_SECRET_KEY=your-secret-key-minimum-32-characters-long
```

### 2. Docker Composeで起動

```bash
# 新アーキテクチャのテスト環境を起動
docker-compose -f docker-compose.new.yml up --build
```

### 3. 動作確認

#### ヘルスチェック
```bash
curl http://localhost:8001/health
```

**期待されるレスポンス:**
```json
{
  "status": "healthy",
  "environment": "development",
  "database": "connected",
  "redis": "connected"
}
```

#### 設定情報確認
```bash
curl http://localhost:8001/config
```

#### ルート確認
```bash
curl http://localhost:8001/
```

## 🧪 テストエンドポイント

新しい例外処理システムのテスト用エンドポイント：

### バリデーションエラーのテスト
```bash
curl http://localhost:8001/test/exception
```

### 認証エラーのテスト
```bash
curl http://localhost:8001/test/auth-exception
```

### 課金エラーのテスト
```bash
curl http://localhost:8001/test/billing-exception
```

すべて統一されたエラーレスポンス形式で返されます：
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "details": {}
  }
}
```

## 📊 ログの確認

新しい構造化ログシステムが動作していることを確認：

```bash
# ログをリアルタイムで確認
docker-compose -f docker-compose.new.yml logs -f api-new
```

JSON形式のログが出力されます（LOG_FORMAT=jsonの場合）：
```json
{
  "timestamp": "2025-11-19T10:00:00.000000Z",
  "severity": "INFO",
  "logger": "middleware.logging",
  "event": "request_completed",
  "request_id": "uuid-here",
  "method": "GET",
  "path": "/health",
  "status_code": 200,
  "duration_ms": 12.34
}
```

## 🔧 トラブルシューティング

### ポートが既に使用されている
```bash
# 既存のサービスを停止
docker-compose down

# または別のポートを使用（docker-compose.new.ymlを編集）
```

### データベース接続エラー
```bash
# コンテナ内でデータベースファイルを確認
docker-compose -f docker-compose.new.yml exec api-new ls -la /app/billing.db
```

### Redis接続エラー
```bash
# Redisコンテナが起動しているか確認
docker-compose -f docker-compose.new.yml ps

# Redis接続テスト
docker-compose -f docker-compose.new.yml exec redis redis-cli ping
```

### Secret Manager接続エラー
```bash
# Secret Managerを使用しない設定に変更
# .env.developmentで USE_SECRET_MANAGER=false に設定
```

## 🏗️ 新しいアーキテクチャの構成

### 初期化される主要コンポーネント

1. **Infrastructure層**
   - ✅ Database（SQLite/PostgreSQL対応）
   - ✅ Redis Cache
   - ✅ 構造化ログ（JSON/テキスト）
   - ✅ 統一設定管理（Pydantic Settings）

2. **Shared層**
   - ✅ 統一例外処理
   - ✅ グローバルエラーハンドラー
   - ✅ ロギングミドルウェア
   - ✅ レート制限ミドルウェア

3. **利用可能なエンドポイント**
   - `/` - ルート（バージョン情報）
   - `/health` - ヘルスチェック
   - `/config` - 設定情報
   - `/test/*` - テストエンドポイント

## 📝 次のステップ

フェーズ1の基盤が正しく動作することを確認したら：

1. **フェーズ2**: Billingドメインの移行
2. **フェーズ3**: Authドメインの移行
3. **フェーズ4**: LLMドメインの移行

各フェーズで段階的に既存のルーターを新しいアーキテクチャに統合していきます。

## 🛑 停止方法

```bash
docker-compose -f docker-compose.new.yml down

# データも削除する場合
docker-compose -f docker-compose.new.yml down -v
```

## 📚 参考資料

- 詳細なアーキテクチャ計画: `docs/issues/02_Refactoring/20251119_server_architecture_refactoring_plan.md`
- 新しいディレクトリ構造: `server/src/infrastructure/`, `server/src/shared/`
