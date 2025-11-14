---
filename: 20251114_api_authentication_implementation
status: new
priority: A
attempt_count: 0
tags: [security, critical, authentication, api]
date: 2025/11/14
---

## 概要 (Overview)

> すべてのAPIエンドポイントに認証機構を実装し、デバイスIDベースのアクセス制御を導入する。

## 背景 (Background)

> セキュリティ調査の結果、以下の重大な問題が発見されました:
>
> **現状の問題点:**
> - すべての API エンドポイントが認証なしでアクセス可能
> - `/api/billing/balance` - 誰でもトークン残高を取得可能
> - `/api/billing/credits/add` - 誰でもクレジットを追加可能
> - `/api/billing/tokens/consume` - 誰でもトークンを消費可能
> - `/api/chat` - 誰でもLLMを利用可能
> - `/ws/{client_id}` - 任意のclient_idで接続可能
>
> **リスク:**
> - 攻撃者が無制限にクレジットを追加できる
> - 他のユーザーのトークン残高を閲覧・消費できる
> - LLMを不正利用され、APIコストが急増する可能性
> - 全データを削除される危険性
>
> **深刻度**: Critical (OWASP A01: Broken Access Control)

## 実装方針 (Implementation Strategy)

> FastAPIの依存性注入（Dependency Injection）を活用した認証機構を実装します:
>
> ### 1. 認証ヘッダーの導入
> - リクエストヘッダー `X-Device-ID` でデバイスIDを受け取る
> - デバイスIDから `user_id` を取得する認証Dependencyを作成
>
> ### 2. 全エンドポイントへの適用
> - すべてのAPIエンドポイントに `Depends(verify_user)` を追加
> - WebSocketエンドポイントにも認証を追加
>
> ### 3. BillingService の改修
> - 現在の固定 `DEFAULT_USER_ID` を廃止
> - リクエストごとの `user_id` を動的に渡す設計に変更
>
> ### 4. エラーハンドリング
> - 認証失敗時に 401 Unauthorized を返す
> - 不正なデバイスIDに対するログ記録

## 受け入れ条件 (Acceptance Criteria)

> - [ ] 認証Dependency `verify_user` を実装
>   - `X-Device-ID` ヘッダーからデバイスIDを取得
>   - `DeviceAuth` テーブルから `user_id` を検索
>   - 見つからない場合は 401 エラーを返す
> - [ ] すべての課金APIエンドポイントに認証を適用
>   - `/api/billing/balance`
>   - `/api/billing/credits/add`
>   - `/api/billing/credits/allocate`
>   - `/api/billing/tokens/consume`
>   - `/api/billing/transactions`
>   - `/api/billing/pricing` (認証なしでもOK、または認証必須に)
> - [ ] すべてのLLM APIエンドポイントに認証を適用
>   - `/api/chat`
>   - `/api/chat/summarize`
>   - `/api/document/summarize`
> - [ ] WebSocketエンドポイント `/ws/{client_id}` に認証を追加
>   - 初回接続時に `device_id` を検証
>   - 不正なclient_idでの接続を拒否
> - [ ] `BillingService` の `user_id` 管理を改修
>   - `DEFAULT_USER_ID` の使用を廃止
>   - コンストラクタで `user_id` を受け取る設計に変更
> - [ ] 認証失敗時のログ記録を実装
> - [ ] フロントエンド側で `X-Device-ID` ヘッダーを送信する実装
> - [ ] 認証なしでアクセスした場合に 401 エラーが返ることをテスト
> - [ ] 正しい `device_id` でアクセスした場合に正常動作することを確認

## 関連ファイル (Related Files)

> ### バックエンド
> - `server/src/auth/service.py` - デバイスID検証ロジック追加
> - `server/src/auth/dependencies.py` - **新規作成**: 認証Dependency
> - `server/src/api/billing_router.py` - 認証適用
> - `server/src/billing/service.py` - user_id管理の改修
> - `server/src/llm/routers/chat_router.py` - 認証適用
> - `server/src/llm/routers/knowledge_base_router.py` - 認証適用
> - `server/src/main.py` - WebSocket認証
>
> ### フロントエンド
> - `app/auth/authApiClient.ts` - ヘッダー送信ロジック追加
> - `app/billing/services/billingApiService.ts` - ヘッダー送信
> - `app/features/chat/services/llmApiClient.ts` - ヘッダー送信

## 制約条件 (Constraints)

> - フロントエンド側も同時に修正が必要（ヘッダー送信）
> - 既存のデータベーステーブル構造は変更しない（`DeviceAuth` テーブルを活用）
> - 認証処理のパフォーマンスオーバーヘッドを最小限に抑える
> - デバイスIDのバリデーション（UUID形式のチェック）を追加
> - 環境変数 `ENV=production` の場合、デバッグエンドポイント `/api/billing/reset` を無効化

## 開発ログ (Development Log)

> （まだ作業開始前）

---

## AIへの申し送り事項 (Handover to AI)

> - **現在の状況:** セキュリティ調査が完了し、認証機構の欠如を確認。このissueはまだ未着手。
> - **次のアクション:**
>   1. `server/src/auth/dependencies.py` を新規作成し、`verify_user` 関数を実装
>   2. `server/src/api/billing_router.py` の全エンドポイントに `Depends(verify_user)` を追加
>   3. `server/src/billing/service.py` の `__init__` を修正し、`user_id` をパラメータで受け取る
>   4. フロントエンド側で `X-Device-ID` ヘッダーを送信する実装
> - **考慮事項/ヒント:**
>   - 認証Dependencyは他のDependency（`get_db`）と組み合わせて使用
>   - WebSocketの認証は初回接続時に `auth` メッセージで `device_id` を受け取る
>   - `/api/billing/reset` は `ENV != "production"` の場合のみアクセス可能にする

---

## 実装例

### 1. 認証Dependency (`server/src/auth/dependencies.py`)

```python
from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import Optional
from src.billing.database import get_db
from src.auth.service import AuthService

async def verify_user(
    device_id: Optional[str] = Header(None, alias="X-Device-ID"),
    db: Session = Depends(get_db)
) -> str:
    """デバイスIDを検証し、user_idを返す"""
    if not device_id:
        raise HTTPException(
            status_code=401,
            detail="Device ID required. Please provide X-Device-ID header."
        )

    # デバイスIDの形式チェック（UUID v4）
    import re
    uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    if not re.match(uuid_pattern, device_id, re.IGNORECASE):
        raise HTTPException(
            status_code=401,
            detail="Invalid device ID format"
        )

    auth_service = AuthService(db)
    user_id = auth_service.get_user_id_by_device(device_id)

    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid device ID"
        )

    return user_id
```

### 2. AuthService に追加 (`server/src/auth/service.py`)

```python
def get_user_id_by_device(self, device_id: str) -> Optional[str]:
    """デバイスIDからuser_idを取得"""
    device_auth = self.db.query(DeviceAuth).filter_by(device_id=device_id).first()
    if device_auth:
        # 最終ログイン日時を更新
        device_auth.last_login_at = datetime.now()
        self.db.commit()
        return device_auth.user_id
    return None
```

### 3. エンドポイントへの適用例 (`server/src/api/billing_router.py`)

```python
from src.auth.dependencies import verify_user

@router.get("/balance", response_model=TokenBalanceResponse)
async def get_balance(
    user_id: str = Depends(verify_user),  # 追加
    db: Session = Depends(get_db)
):
    service = BillingService(db, user_id)  # user_idを渡す
    balances = service.get_token_balances()
    return TokenBalanceResponse(balances=balances)
```

### 4. BillingService の改修 (`server/src/billing/service.py`)

```python
class BillingService:
    def __init__(self, db: Session, user_id: str):
        self.db = db
        self.user_id = user_id  # 動的に受け取る
        # DEFAULT_USER_ID は削除
```

### 5. フロントエンド側の実装例 (`app/auth/authApiClient.ts`)

```typescript
import { getOrCreateDeviceId } from './deviceIdService';

export const getAuthHeaders = async () => {
  const deviceId = await getOrCreateDeviceId();
  return {
    'X-Device-ID': deviceId,
  };
};
```

```typescript
// app/billing/services/billingApiService.ts
import { getAuthHeaders } from '../../auth/authApiClient';

const getBalance = async (): Promise<TokenBalanceResponse> => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/billing/balance`, {
    headers,
  });
  // ...
};
```
