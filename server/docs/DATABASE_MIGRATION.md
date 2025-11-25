# Supabase データベースマイグレーション手順

本番環境（Supabase）のデータベーススキーマを変更する際のベストプラクティスと手順書。

## 概要

このプロジェクトでは、Alembicを使用してデータベースマイグレーションを管理しています。
本番環境のSupabaseに対してマイグレーションを実行する際は、ローカル環境から直接接続して実行します。

## 前提条件

- Google Cloud SDK (`gcloud`) がインストール済み
- Secret Manager に `DATABASE_URL` が登録済み
- Python 3.x がインストール済み

## マイグレーションファイルの作成

### 1. 新しいマイグレーションファイルを生成

```bash
# serverディレクトリで実行
cd /path/to/Noteapp/server

# 自動生成（モデルの変更を検出）
uv run alembic revision --autogenerate -m "Add description of changes"

# または手動作成
uv run alembic revision -m "Add description of changes"
```

### 2. マイグレーションファイルの確認

生成されたファイルを確認し、必要に応じて編集：

```
alembic/versions/YYYYMMDD_XXXX_description.py
```

### 3. ローカルDBでテスト

```bash
# ローカルのDockerコンテナでテスト
docker compose exec api alembic upgrade head
```

## 本番環境へのマイグレーション実行

### なぜDockerコンテナから直接実行できないのか？

ローカルのDockerコンテナから本番Supabaseへ接続しようとすると、以下のエラーが発生する場合があります：

```
psycopg2.OperationalError: connection to server at "db.xxx.supabase.co"
(2406:da18:...), port 5432 failed: Network is unreachable
```

**原因**: DockerのネットワークがIPv6でSupabaseに接続しようとして失敗するため。
ホストマシンからは正常に接続できます。

### 方法1: 一時venvを使用（推奨）

Dockerコンテナからは、ネットワーク的にSupabaseに到達できないため、
ホストマシンから直接実行します。

#### Step 1: 一時的なPython仮想環境を作成

```bash
python3 -m venv /tmp/alembic_venv
```

#### Step 2: 必要な依存関係をインストール

```bash
/tmp/alembic_venv/bin/pip install alembic psycopg2-binary sqlalchemy pydantic pydantic-settings
```

#### Step 3: DATABASE_URLを取得してマイグレーション実行

```bash
# Secret ManagerからDATABASE_URLを取得して実行
export DATABASE_URL=$(gcloud secrets versions access latest --secret=DATABASE_URL)
export PYTHONPATH=/path/to/Noteapp/server
/tmp/alembic_venv/bin/alembic upgrade head
```

#### Step 4: クリーンアップ

```bash
rm -rf /tmp/alembic_venv
```

### 方法2: Dockerコンテナ経由（参考：通常は動作しない）

> **注意**: 現在の環境では、DockerからSupabaseへのネットワーク接続ができないため、
> この方法は動作しません。将来的にネットワーク設定が変更された場合の参考として残しています。

```bash
# 通常は「Network is unreachable」エラーになる
export DATABASE_URL=$(gcloud secrets versions access latest --secret=DATABASE_URL)
docker compose exec -e DATABASE_URL="$DATABASE_URL" api alembic upgrade head
```

## マイグレーション状態の確認

### 現在のリビジョンを確認

```bash
# 本番環境の状態確認
export DATABASE_URL=$(gcloud secrets versions access latest --secret=DATABASE_URL)
export PYTHONPATH=/path/to/Noteapp/server
/tmp/alembic_venv/bin/alembic current
```

### 履歴を確認

```bash
/tmp/alembic_venv/bin/alembic history
```

## ロールバック

問題が発生した場合のロールバック手順：

```bash
# 1つ前のリビジョンに戻す
/tmp/alembic_venv/bin/alembic downgrade -1

# 特定のリビジョンに戻す
/tmp/alembic_venv/bin/alembic downgrade <revision_id>

# 全てのマイグレーションを取り消す（危険！）
/tmp/alembic_venv/bin/alembic downgrade base
```

## トラブルシューティング

### 「Network is unreachable」エラー

DockerコンテナからSupabaseへの接続ができない場合：
- **原因**: DockerのネットワークがIPv6でSupabaseに接続しようとして失敗
- **解決策**: ホストマシンから直接実行（方法1を使用）

### 「relation does not exist」エラー

マイグレーションが実行されていない状態：
- **解決策**: `alembic upgrade head` を実行

### 「ModuleNotFoundError」エラー

依存関係が不足：
- **解決策**: 必要なパッケージを追加インストール

```bash
/tmp/alembic_venv/bin/pip install <missing_package>
```

### Secret Managerへのアクセスエラー

```bash
# 認証を確認
gcloud auth list

# 必要に応じて再認証
gcloud auth login
```

## CI/CDでの自動マイグレーション（将来的な改善）

Cloud Buildでデプロイ時に自動的にマイグレーションを実行する設定も可能です：

```yaml
# cloudbuild.yaml に追加
steps:
  # ... 既存のビルドステップ ...

  - name: 'gcr.io/cloud-builders/docker'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        docker run --rm \
          -e DATABASE_URL=$$DATABASE_URL \
          $_IMAGE_NAME \
          alembic upgrade head
    secretEnv: ['DATABASE_URL']

availableSecrets:
  secretManager:
    - versionName: projects/$PROJECT_ID/secrets/DATABASE_URL/versions/latest
      env: 'DATABASE_URL'
```

## 参考リンク

- [Alembic Documentation](https://alembic.sqlalchemy.org/)
- [Supabase Database](https://supabase.com/docs/guides/database)
- [Google Secret Manager](https://cloud.google.com/secret-manager/docs)
