---
filename: 20251115_add_rate_limiting_auth_endpoints
status: new
priority: high
attempt_count: 0
tags: [security, backend, auth, DDoS]
date: 2025/11/15
---

## 概要 (Overview)

認証エンドポイント（`/api/auth/register` と `/api/auth/verify`）にレート制限が実装されていない。ブルートフォース攻撃、大量のアカウント作成、DDoS攻撃を防ぐため、IPアドレスベースのレート制限を実装する。

## 背景 (Background)

### Explorerの調査結果

> **2. レート制限の欠如**
> - `/api/auth/register` と `/api/auth/verify` にレート制限なし
> - **リスク:** 大量のアカウント作成、ブルートフォース攻撃
> - **CVSS Score:** 6.5 (Medium)

### 攻撃シナリオ

#### シナリオ1: 大量アカウント作成
```
攻撃者が自動スクリプトで /api/auth/register を連続呼び出し
→ 数千〜数万のユーザーアカウントを作成
→ データベースが肥大化
→ 不正利用（スパム、リソース消費など）
```

#### シナリオ2: デバイスID列挙攻撃
```
攻撃者が /api/auth/verify を大量に呼び出し
→ 有効なdevice_idを探索
→ 有効なIDが見つかれば、そのアカウントを乗っ取り
```

#### シナリオ3: DDoS攻撃
```
複数のIPアドレスから /api/auth/register を連続呼び出し
→ データベース負荷が増大
→ サーバーがダウン
→ 正規ユーザーがアクセスできない
```

## 実装方針 (Implementation Strategy)

### 1. slowapi の導入

FastAPIでは `slowapi` ライブラリが推奨される。

```bash
# requirements.txt に追加
slowapi==0.1.9
```

### 2. レート制限の設定

```python
# server/src/main.py

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Limiterインスタンスを作成
limiter = Limiter(key_func=get_remote_address)

# FastAPIアプリに登録
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

### 3. 認証エンドポイントへの適用

```python
# server/src/auth/router.py

from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request

# Limiterインスタンスを取得（main.pyで作成済み）
limiter = Limiter(key_func=get_remote_address)

@router.post("/register")
@limiter.limit("10/minute")  # 1分間に10リクエストまで
async def register_device(
    request: Request,  # ← 追加（slowapiが必要）
    body: DeviceRegisterRequest,
    db: Session = Depends(get_db)
):
    # 既存の処理
    ...

@router.post("/verify")
@limiter.limit("20/minute")  # 検証は少し緩め
async def verify_device(
    request: Request,  # ← 追加
    body: DeviceVerifyRequest,
    db: Session = Depends(get_db)
):
    # 既存の処理
    ...
```

### 4. カスタムエラーレスポンス

```python
# server/src/auth/router.py

from slowapi.errors import RateLimitExceeded

@app.exception_handler(RateLimitExceeded)
async def custom_rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Too many requests. Please try again later.",
            "retry_after": exc.retry_after  # 何秒後にリトライ可能か
        }
    )
```

### 5. レート制限の設定値

| エンドポイント | 制限 | 理由 |
|--------------|------|------|
| `/api/auth/register` | 10/分 | アカウント作成は低頻度 |
| `/api/auth/verify` | 20/分 | 検証はやや高頻度（再起動など） |
| その他のAPI | 100/分 | 通常の使用に影響しない程度 |

### 6. 環境別の設定

```python
# 開発環境ではレート制限を緩める
import os

RATE_LIMIT_REGISTER = "10/minute" if os.getenv("ENV") == "production" else "100/minute"
RATE_LIMIT_VERIFY = "20/minute" if os.getenv("ENV") == "production" else "100/minute"

@router.post("/register")
@limiter.limit(RATE_LIMIT_REGISTER)
async def register_device(...):
    ...
```

## 受け入れ条件 (Acceptance Criteria)

### 実装
- [ ] `slowapi` を requirements.txt に追加
- [ ] `pip install -r requirements.txt` でインストール
- [ ] `main.py` に Limiter を初期化
- [ ] `auth/router.py` の `/register` にレート制限を追加
- [ ] `auth/router.py` の `/verify` にレート制限を追加
- [ ] カスタムエラーハンドラーを実装（429 レスポンス）

### テスト
- [ ] 手動テスト: 1分間に11回 `/register` を呼び出し
  - [ ] 11回目が 429 エラーになることを確認
- [ ] 手動テスト: 1分待ってから再度呼び出し
  - [ ] 成功することを確認
- [ ] 単体テスト: pytest でレート制限をテスト
  ```python
  def test_register_rate_limit():
      # 10回は成功
      for i in range(10):
          response = client.post("/api/auth/register", json={"device_id": f"device-{i}"})
          assert response.status_code == 200

      # 11回目は429
      response = client.post("/api/auth/register", json={"device_id": "device-11"})
      assert response.status_code == 429
  ```

### ドキュメント
- [ ] OpenAPI スキーマに 429 レスポンスを追加
- [ ] README にレート制限の説明を追加

## 関連ファイル (Related Files)

### 修正対象
- `server/requirements.txt` - slowapi 追加
- `server/src/main.py` - Limiter 初期化
- `server/src/auth/router.py` - レート制限適用

### テストファイル
- `server/tests/test_auth_rate_limit.py` - **新規作成**

## 制約条件 (Constraints)

1. **正規ユーザーへの影響を最小化**
   - レート制限が厳しすぎると、正常な使用が妨げられる
   - 10/分は十分緩い（通常は1回のみ）

2. **分散型攻撃への対応**
   - IPアドレスベースの制限では、複数IPからの攻撃は防げない
   - → 将来的には device_id ベースの制限も検討

3. **パフォーマンス**
   - レート制限のチェックはメモリ内で高速に処理
   - Redisなどの外部ストレージは不要（現時点）

4. **開発環境での利便性**
   - 開発環境ではレート制限を緩める
   - テストが容易になる

## 開発ログ (Development Log)

---
### 試行 #1

*（作業開始前）*

---

## AIへの申し送り事項 (Handover to AI)

### 現在の状況
- 認証エンドポイントにレート制限が全くない
- ブルートフォース攻撃、大量アカウント作成、DDoS攻撃のリスク
- slowapi を使った実装が推奨される

### 次のアクション

#### Step 1: slowapi のインストール
1. `requirements.txt` に `slowapi==0.1.9` を追加
2. `pip install -r requirements.txt`

#### Step 2: main.py の修正
1. Limiter を初期化
2. app.state.limiter に設定
3. RateLimitExceeded ハンドラーを追加

#### Step 3: auth/router.py の修正
1. `/register` に `@limiter.limit("10/minute")` を追加
2. `/verify` に `@limiter.limit("20/minute")` を追加
3. 関数シグネチャに `request: Request` を追加

#### Step 4: テスト
1. 手動で連続リクエストを送信
2. 11回目が 429 になることを確認
3. pytest でテストコードを作成

### 考慮事項/ヒント
- FastAPI公式ドキュメント: https://slowapi.readthedocs.io/
- `request: Request` パラメータは slowapi が内部で使用（明示的な使用は不要）
- 環境変数 `ENV` は `.env` ファイルで設定済み
- Redisなどの外部ストレージは現時点では不要（メモリ内で十分）
