---
filename: 20251114_rate_limiting_implementation
status: new
priority: B
attempt_count: 0
tags: [security, high, rate-limiting, dos-prevention]
date: 2025/11/14
---

## 概要 (Overview)

> すべてのAPIエンドポイントにレート制限を実装し、DoS攻撃とLLM APIコスト急増を防止する。

## 背景 (Background)

> セキュリティ調査の結果、以下の問題が発見されました:
>
> **現状の問題点:**
> - すべてのAPIエンドポイントにレート制限がない
> - 同一ユーザー（またはIP）が無制限にリクエストを送信可能
>
> **リスク:**
> - DoS攻撃によるサービス停止
> - LLM API（Gemini, OpenAI）の不正利用によるコスト急増
> - 正規ユーザーへのサービス品質低下
> - データベース負荷の増大
>
> **深刻度**: High (OWASP A04: Insecure Design)

## 実装方針 (Implementation Strategy)

> SlowAPI（FastAPI用のレート制限ライブラリ）を導入し、エンドポイントごとに適切な制限を設定します:
>
> ### 1. SlowAPI の導入
> - `slowapi` パッケージをインストール
> - FastAPI アプリに統合
>
> ### 2. エンドポイント別のレート制限設定
> - **LLMエンドポイント**: 厳しい制限（例: 10回/分）
> - **課金エンドポイント**: 中程度の制限（例: 5回/時）
> - **読み取りエンドポイント**: 緩い制限（例: 60回/分）
>
> ### 3. レート制限のキー選択
> - デバイスIDベース（認証後）
> - IPアドレスベース（認証前）
>
> ### 4. エラーレスポンス
> - 429 Too Many Requests を返す
> - Retry-After ヘッダーを含める

## 受け入れ条件 (Acceptance Criteria)

> - [ ] `slowapi` を `requirements.txt` に追加
> - [ ] `server/src/main.py` に SlowAPI を統合
>   - Limiter インスタンスを作成
>   - RateLimitExceeded のエラーハンドラーを追加
> - [ ] LLMエンドポイントにレート制限を適用
>   - `/api/chat` - 10回/分
>   - `/api/chat/summarize` - 5回/分
>   - `/api/document/summarize` - 5回/分
> - [ ] 課金エンドポイントにレート制限を適用
>   - `/api/billing/credits/add` - 5回/時
>   - `/api/billing/credits/allocate` - 10回/時
>   - `/api/billing/tokens/consume` - 30回/分
> - [ ] 読み取りエンドポイントにレート制限を適用
>   - `/api/billing/balance` - 60回/分
>   - `/api/billing/transactions` - 30回/分
> - [ ] RAGエンドポイントにレート制限を適用
>   - `/api/knowledge-base/collections` (POST) - 5回/時
>   - `/api/knowledge-base/collections/{id}/documents` (POST) - 10回/時
> - [ ] レート制限超過時に 429 エラーが返ることをテスト
> - [ ] Retry-After ヘッダーが含まれることを確認
> - [ ] レート制限のカウンターがユーザーごとに独立していることを確認
> - [ ] ログにレート制限超過イベントが記録されることを確認

## 関連ファイル (Related Files)

> - `server/requirements.txt` - `slowapi` 追加
> - `server/src/main.py` - SlowAPI統合
> - `server/src/llm/routers/chat_router.py` - レート制限適用
> - `server/src/api/billing_router.py` - レート制限適用
> - `server/src/llm/routers/knowledge_base_router.py` - レート制限適用
> - `server/src/core/rate_limit.py` - **新規作成**: レート制限ヘルパー

## 制約条件 (Constraints)

> - レート制限はメモリベース（サーバー再起動でリセット）
> - 本番環境ではRedisベースのレート制限を検討（将来的な改善）
> - レート制限の値は環境変数で調整可能にする（柔軟性の確保）
> - 正規ユーザーが制限に引っかからないよう、適切な閾値を設定
> - WebSocketエンドポイントには別のレート制限機構が必要（この issue では対象外）

## 開発ログ (Development Log)

> （まだ作業開始前）

---

## AIへの申し送り事項 (Handover to AI)

> - **現在の状況:** セキュリティ調査が完了し、レート制限の欠如を確認。このissueはまだ未着手。
> - **次のアクション:**
>   1. `slowapi` をインストール
>   2. `server/src/main.py` に Limiter を統合
>   3. 各エンドポイントに `@limiter.limit()` デコレーターを追加
>   4. レート制限超過時のテスト
> - **考慮事項/ヒント:**
>   - SlowAPI のデフォルトキーは IP アドレス（`get_remote_address`）
>   - デバイスIDベースのキーにするには、カスタムキー関数を実装
>   - レート制限の値は用途に応じて調整

---

## 実装例

### 1. requirements.txt に追加

```
slowapi==0.1.9
```

### 2. SlowAPI 統合 (`server/src/main.py`)

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Limiter インスタンスを作成
limiter = Limiter(key_func=get_remote_address)

# FastAPIアプリに統合
app = FastAPI(title="Noteapp API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

### 3. カスタムキー関数（デバイスIDベース）

```python
# server/src/core/rate_limit.py
from fastapi import Request, Header
from typing import Optional

def get_device_id_or_ip(request: Request) -> str:
    """デバイスIDがあればそれを、なければIPアドレスをキーにする"""
    device_id = request.headers.get("X-Device-ID")
    if device_id:
        return f"device:{device_id}"

    # IPアドレスをフォールバック
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return f"ip:{forwarded.split(',')[0]}"

    client_host = request.client.host if request.client else "unknown"
    return f"ip:{client_host}"
```

```python
# server/src/main.py で使用
from src.core.rate_limit import get_device_id_or_ip

limiter = Limiter(key_func=get_device_id_or_ip)
```

### 4. エンドポイントへの適用例

```python
# server/src/llm/routers/chat_router.py
from slowapi import Limiter
from fastapi import Request

# main.py で定義したlimiterを取得
from src.main import limiter

@router.post("/chat", response_model=ChatResponse)
@limiter.limit("10/minute")  # 1分間に10回まで
async def chat_post(
    request: Request,  # 必須: レート制限に使用
    chat_request: ChatRequest,
    user_id: str = Depends(verify_user),
    db: Session = Depends(get_db)
):
    # ...
```

```python
# server/src/api/billing_router.py
@router.post("/credits/add", response_model=OperationSuccessResponse)
@limiter.limit("5/hour")  # 1時間に5回まで
async def add_credits(
    request: Request,
    add_request: AddCreditsRequest,
    user_id: str = Depends(verify_user),
    db: Session = Depends(get_db)
):
    # ...
```

### 5. 環境変数での制限値管理（オプション）

```python
import os

CHAT_RATE_LIMIT = os.getenv("CHAT_RATE_LIMIT", "10/minute")
PURCHASE_RATE_LIMIT = os.getenv("PURCHASE_RATE_LIMIT", "5/hour")

@router.post("/chat")
@limiter.limit(CHAT_RATE_LIMIT)
async def chat_post(...):
    # ...
```

### 6. エラーレスポンスのカスタマイズ

```python
from slowapi.errors import RateLimitExceeded
from fastapi.responses import JSONResponse

@app.exception_handler(RateLimitExceeded)
async def custom_rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={
            "error": "rate_limit_exceeded",
            "message": "リクエストが多すぎます。しばらく待ってから再試行してください。",
            "retry_after": exc.detail
        },
        headers={"Retry-After": str(exc.detail)}
    )
```

### 7. テストケース例

```python
import pytest
from fastapi.testclient import TestClient

def test_rate_limit_chat(client: TestClient):
    """チャットエンドポイントのレート制限テスト"""
    headers = {"X-Device-ID": "test-device-123"}

    # 10回までは成功
    for i in range(10):
        response = client.post(
            "/api/chat",
            json={"message": "test", "provider": "gemini", "model": "gemini-2.5-flash"},
            headers=headers
        )
        assert response.status_code in [200, 201]

    # 11回目は429エラー
    response = client.post(
        "/api/chat",
        json={"message": "test", "provider": "gemini", "model": "gemini-2.5-flash"},
        headers=headers
    )
    assert response.status_code == 429
    assert "retry_after" in response.json() or "Retry-After" in response.headers
```

## 推奨レート制限値

| エンドポイント | レート制限 | 理由 |
|---------------|-----------|------|
| `/api/chat` | 10/分 | LLM API コスト管理 |
| `/api/chat/summarize` | 5/分 | 重い処理 |
| `/api/billing/credits/add` | 5/時 | 課金操作の保護 |
| `/api/billing/credits/allocate` | 10/時 | 通常操作 |
| `/api/billing/balance` | 60/分 | 読み取りのみ |
| `/api/knowledge-base/.../documents` (POST) | 10/時 | ファイルアップロード |
