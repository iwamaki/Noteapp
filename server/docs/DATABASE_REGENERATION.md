# データベース再生成手順

## 概要

開発中にデータベーススキーマを変更した場合、既存のデータベースを削除して再生成することで、最新のモデル定義に基づいたテーブルを作成できます。

## 前提条件

- `server/src/billing/database.py` の `init_db()` 関数が `Base.metadata.create_all(bind=engine)` を呼び出している
- モデル定義が `server/src/billing/models.py` に記述されている

## 手順

### 1. サーバーを停止

```bash
# Docker Composeを使用している場合
docker compose down

# または、実行中のコンテナを停止
docker stop server-api-1
```

### 2. データベースファイルを削除

```bash
# プロジェクトルートから
rm server/billing.db

# または、Docker コンテナ内のファイルを削除
docker exec server-api-1 rm /app/billing.db
```

### 3. サーバーを起動

```bash
# Docker Composeを使用している場合
docker compose up -d

# ログを確認
docker compose logs -f server
```

### 4. データベース初期化の確認

起動ログに以下のメッセージが表示されることを確認:

```
INFO: Initializing billing database...
INFO: Database tables created
INFO: Created default user: default_user
INFO: Created credit record for default_user
INFO: Created pricing for gemini-2.0-flash-exp
...
INFO: Initial data inserted successfully
```

## マルチデバイス対応のスキーマ変更

以下のフィールドが `device_auth` テーブルに追加されました:

- `device_name` (VARCHAR, NULL可) - デバイス名（例: "iPhone 14 Pro"）
- `device_type` (VARCHAR, NULL可) - デバイスタイプ（"ios", "android"）
- `is_active` (BOOLEAN, デフォルト TRUE) - アクティブフラグ（論理削除用）

## 注意事項

- **既存のデータはすべて削除されます**
- 本番環境では絶対に実行しないでください
- 本番環境では、適切なマイグレーションスクリプトを使用してください

## 関連ファイル

- `server/src/billing/models.py` - データベースモデル定義
- `server/src/billing/database.py` - データベース初期化
- `server/migrations/` - マイグレーションスクリプト（本番用）
