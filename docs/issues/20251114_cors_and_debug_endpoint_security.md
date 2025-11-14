---
filename: 20251114_cors_and_debug_endpoint_security
status: new
priority: A
attempt_count: 0
tags: [security, high, cors, configuration]
date: 2025/11/14
---

## 概要 (Overview)

> CORS設定を厳格化し、デバッグエンドポイントを本番環境で無効化する。

## 背景 (Background)

> セキュリティ調査の結果、以下の問題が発見されました:
>
> **問題1: CORS設定の全開放**
> - 現在、`allow_origins=["*"]` となっており、すべてのオリジンからのアクセスを許可
> - 任意のWebサイトからAPIにアクセス可能
>
> **問題2: デバッグエンドポイントの本番環境露出**
> - `/api/billing/reset` エンドポイントが環境チェックなしでアクセス可能
> - 誰でも全データをリセット可能
>
> **リスク:**
> - CSRF攻撃のリスク
> - 悪意のあるサイトがユーザーのトークンを不正利用できる
> - 本番環境で全ユーザーのデータが削除される危険性
> - サービス妨害攻撃に利用される
>
> **深刻度**: High (OWASP A05: Security Misconfiguration)

## 実装方針 (Implementation Strategy)

> 環境変数ベースのセキュリティ設定を導入します:
>
> ### 1. CORS設定の環境別管理
> - 本番環境: 許可するオリジンを明示的に指定
> - 開発環境: localhost のみ許可
> - 環境変数 `ALLOWED_ORIGINS` で管理
>
> ### 2. デバッグエンドポイントの保護
> - 環境変数 `ENV` で環境を判定
> - 本番環境 (`ENV=production`) では 403 Forbidden を返す
> - または、デバッグエンドポイントを完全に削除
>
> ### 3. 環境設定ファイルの整備
> - `.env.development` (開発環境用)
> - `.env.production` (本番環境用)
> - Docker Compose での環境変数注入

## 受け入れ条件 (Acceptance Criteria)

> - [ ] 環境変数 `ALLOWED_ORIGINS` を導入
>   - カンマ区切りでオリジンを指定
>   - 例: `ALLOWED_ORIGINS=https://noteapp.example.com,https://app.noteapp.com`
> - [ ] `server/src/main.py` の CORS 設定を修正
>   - `allow_origins` を環境変数から読み込む
>   - デフォルトは開発環境用（localhost）
> - [ ] 環境変数 `ENV` を導入
>   - 値: `development`, `production`
>   - デフォルトは `development`
> - [ ] `/api/billing/reset` エンドポイントに環境チェックを追加
>   - `ENV=production` の場合は 403 Forbidden を返す
>   - または、エンドポイント自体を削除
> - [ ] `.env.development` ファイルを作成
> - [ ] `.env.production` ファイルのサンプルを作成
> - [ ] `docker-compose.yml` を環境別に分割
>   - `docker-compose.development.yml`
>   - `docker-compose.production.yml`
> - [ ] 本番環境で CORS が正しく機能することをテスト
> - [ ] 本番環境で `/api/billing/reset` がアクセス不可であることを確認

## 関連ファイル (Related Files)

> - `server/src/main.py` - CORS設定修正
> - `server/src/api/billing_router.py` - `/reset` エンドポイント保護
> - `server/.env` - 環境変数追加
> - `server/.env.development` - **新規作成**: 開発環境用設定
> - `server/.env.production.example` - **新規作成**: 本番環境用サンプル
> - `server/docker-compose.yml` - 環境変数注入
> - `server/docker-compose.production.yml` - **新規作成**: 本番用設定

## 制約条件 (Constraints)

> - CORS設定を厳格化すると、フロントエンドのドメインを事前に登録する必要がある
> - 開発環境では localhost、ngrok URL など複数のオリジンを許可する必要がある
> - `/api/billing/reset` を削除すると、開発・テスト時に不便になる可能性（環境チェックで対応）
> - Docker Compose の環境別ファイルを使い分ける運用フローの整備が必要

## 開発ログ (Development Log)

> （まだ作業開始前）

---

## AIへの申し送り事項 (Handover to AI)

> - **現在の状況:** セキュリティ調査が完了し、CORS設定とデバッグエンドポイントの問題を確認。このissueはまだ未着手。
> - **次のアクション:**
>   1. `server/src/main.py` の CORS 設定を環境変数ベースに修正
>   2. `server/src/api/billing_router.py` の `/reset` に環境チェックを追加
>   3. `.env.development`, `.env.production.example` を作成
>   4. `docker-compose.production.yml` を作成
> - **考慮事項/ヒント:**
>   - CORS設定は `app.add_middleware(CORSMiddleware, ...)` で行われている
>   - 環境変数は `os.getenv("ENV", "development")` で取得
>   - 開発環境では ngrok URL も CORS に含める必要がある

---

## 実装例

### 1. CORS設定の修正 (`server/src/main.py`)

```python
import os

# 環境変数から許可オリジンを取得
allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "")
if allowed_origins_str:
    allowed_origins = [origin.strip() for origin in allowed_origins_str.split(",")]
else:
    # デフォルトは開発環境用
    allowed_origins = [
        "http://localhost:8081",
        "http://localhost:19006",
        "http://127.0.0.1:8081",
    ]

# CORSミドルウェアの設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # 環境変数から取得
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization", "X-Device-ID"],
)
```

### 2. デバッグエンドポイントの保護 (`server/src/api/billing_router.py`)

```python
import os

@router.post("/reset", response_model=OperationSuccessResponse)
async def reset_all_data(db: Session = Depends(get_db)):
    # 本番環境では無効化
    env = os.getenv("ENV", "development")
    if env == "production":
        raise HTTPException(
            status_code=403,
            detail="This endpoint is not available in production"
        )

    service = BillingService(db)
    result = service.reset_all_data()
    return OperationSuccessResponse(**result)
```

### 3. 環境変数ファイル (`.env.development`)

```bash
# 開発環境用設定
ENV=development
LOG_LEVEL=DEBUG

# CORS設定（開発環境）
ALLOWED_ORIGINS=http://localhost:8081,http://localhost:19006,https://0bbc35a79143.ngrok-free.app

# その他の設定
GCP_PROJECT_ID=strategic-haven-450402-p6
OPENAI_API_SECRET_ID=OPENAI_API_KEY
GEMINI_API_SECRET_ID=GOOGLE_API_KEY
GOOGLE_APPLICATION_CREDENTIALS=/app/.secrets/iap/key.json
ANDROID_PACKAGE_NAME=com.iwash.NoteApp
```

### 4. 本番環境用サンプル (`.env.production.example`)

```bash
# 本番環境用設定
ENV=production
LOG_LEVEL=INFO

# CORS設定（本番環境）
# 実際のドメインに置き換えてください
ALLOWED_ORIGINS=https://noteapp.example.com,https://app.noteapp.com

# Secret Manager設定
GCP_PROJECT_ID=your-production-project-id
OPENAI_API_SECRET_ID=OPENAI_API_KEY
GEMINI_API_SECRET_ID=GOOGLE_API_KEY
GOOGLE_APPLICATION_CREDENTIALS=/app/.secrets/iap/key.json
ANDROID_PACKAGE_NAME=com.iwash.NoteApp
```

### 5. Docker Compose 本番用 (`docker-compose.production.yml`)

```yaml
version: '3.8'

services:
  server:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    volumes:
      - ./billing.db:/app/billing.db
      - ./.secrets:/app/.secrets:ro
    env_file:
      - .env.production  # 本番環境用の.envを読み込む
    restart: unless-stopped
```

使用方法:
```bash
# 開発環境
docker-compose up

# 本番環境
docker-compose -f docker-compose.production.yml up -d
```
