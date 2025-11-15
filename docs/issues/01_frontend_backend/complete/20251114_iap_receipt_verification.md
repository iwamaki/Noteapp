---
filename: 20251114_iap_receipt_verification
status: new
priority: A
attempt_count: 0
tags: [security, critical, iap, billing, payment]
date: 2025/11/14
---

## 概要 (Overview)

> アプリ内課金（IAP）のレシート検証をサーバー側で実装し、不正なクレジット追加を防止する。

## 背景 (Background)

> セキュリティ調査の結果、以下の重大な問題が発見されました:
>
> **現状の問題点:**
> - クライアント側でIAP購入を行っているが、サーバー側でレシート検証をしていない
> - `/api/billing/credits/add` エンドポイントは `purchase_record` を受け取るが、その真偽を検証していない
> - 攻撃者が偽の購入レコードを送信することでクレジットを不正取得できる
>
> **リスク:**
> - 実際に課金せずにサービスを利用される
> - 金銭的損失が発生
> - サービスの信頼性低下
>
> **深刻度**: Critical (OWASP A07: Identification and Authentication Failures, A08: Software and Data Integrity Failures)

## 実装方針 (Implementation Strategy)

> Google Play Developer API を使用したサーバーサイドレシート検証を実装します:
>
> ### Phase 1: Google Play Developer API 統合
> - サービスアカウント認証の設定確認
> - `google-api-python-client` を使用したAPI呼び出し
> - レシート検証関数の実装
>
> ### Phase 2: add_credits エンドポイントの改修
> - レシート検証ロジックの追加
> - 二重購入防止（transaction_id の重複チェック）
> - 購入の消費済みマーク
>
> ### Phase 3: エラーハンドリングとログ
> - レシート検証失敗時の適切なエラーレスポンス
> - 不正購入試行のログ記録
> - アラート通知（オプション）

## 受け入れ条件 (Acceptance Criteria)

> - [ ] `google-api-python-client` を `requirements.txt` に追加
> - [ ] レシート検証関数 `verify_purchase` を実装
>   - `packageName`, `productId`, `purchaseToken` を受け取る
>   - Google Play Developer API で検証
>   - `purchaseState` が 0 (Purchased) であることを確認
>   - `consumptionState` が 0 (Not consumed) であることを確認
> - [ ] `add_credits` エンドポイントにレシート検証を追加
>   - レシート検証が成功した場合のみクレジット追加
>   - 検証失敗時は 400 Bad Request を返す
> - [ ] 二重購入防止を実装
>   - `transaction_id` が `transactions` テーブルに存在する場合は 409 Conflict を返す
> - [ ] 購入を消費済みにマーク
>   - クレジット追加後、Google側で購入を消費済み状態にする
> - [ ] 不正購入試行のログ記録
>   - レシート検証失敗時に警告ログを出力
>   - `device_id`, `product_id`, `purchase_token` を記録
> - [ ] テストケースの作成
>   - 正常な購入フローのテスト
>   - 偽のレシートでの購入試行テスト（400エラー）
>   - 二重購入試行テスト（409エラー）
> - [ ] 既存のIAP機能が動作することを確認

## 関連ファイル (Related Files)

> ### バックエンド
> - `server/src/billing/iap_verification.py` - **新規作成**: レシート検証ロジック
> - `server/src/api/billing_router.py` - `add_credits` エンドポイント改修
> - `server/requirements.txt` - `google-api-python-client` 追加
> - `server/.env` - `GOOGLE_APPLICATION_CREDENTIALS`, `ANDROID_PACKAGE_NAME`
>
> ### フロントエンド（参考）
> - `app/billing/services/tokenIapService.ts` - IAPフロー確認
> - `app/billing/services/billingApiService.ts` - `addCredits` 呼び出し
>
> ### 既存の参考実装
> - `docs/archive/subscription/server/payment/google_play.py` - 過去の実装例

## 制約条件 (Constraints)

> - Google Play Developer API の利用には以下が必要:
>   - サービスアカウントの作成と権限設定
>   - サービスアカウントキー（JSON）の配置
>   - `GOOGLE_APPLICATION_CREDENTIALS` 環境変数の設定
> - レシート検証はネットワーク呼び出しを伴うため、タイムアウト処理が必要
> - 検証失敗時にユーザーが購入を失わないように、リトライ機構を検討
> - テスト環境での検証（Sandbox購入）にも対応

## 開発ログ (Development Log)

> （まだ作業開始前）

---

## AIへの申し送り事項 (Handover to AI)

> - **現在の状況:** セキュリティ調査が完了し、IAPレシート検証の欠如を確認。このissueはまだ未着手。
> - **次のアクション:**
>   1. `server/src/billing/iap_verification.py` を新規作成し、`verify_purchase` 関数を実装
>   2. `server/src/api/billing_router.py` の `add_credits` にレシート検証を追加
>   3. 二重購入防止ロジックを実装
>   4. Google Play Developer API でのテスト
> - **考慮事項/ヒント:**
>   - サービスアカウントキーは既に `/app/.secrets/iap/key.json` に配置済み
>   - `GOOGLE_APPLICATION_CREDENTIALS` 環境変数は `.env` で設定済み
>   - `docs/archive/subscription/server/payment/google_play.py` に過去の実装例がある
>   - レシート検証は `androidpublisher.v3.purchases.products.get()` を使用

---

## 実装例

### 1. レシート検証関数 (`server/src/billing/iap_verification.py`)

```python
import os
from google.oauth2 import service_account
from googleapiclient.discovery import build
from src.core.logger import logger

SCOPES = ['https://www.googleapis.com/auth/androidpublisher']
SERVICE_ACCOUNT_FILE = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
PACKAGE_NAME = os.getenv("ANDROID_PACKAGE_NAME", "com.iwash.NoteApp")

def verify_purchase(product_id: str, purchase_token: str) -> dict:
    """
    Google Play Developer APIでレシートを検証

    Args:
        product_id: 商品ID (例: "token_300")
        purchase_token: 購入トークン

    Returns:
        検証結果の辞書

    Raises:
        ValueError: 検証失敗時
    """
    try:
        credentials = service_account.Credentials.from_service_account_file(
            SERVICE_ACCOUNT_FILE, scopes=SCOPES
        )

        service = build('androidpublisher', 'v3', credentials=credentials)

        result = service.purchases().products().get(
            packageName=PACKAGE_NAME,
            productId=product_id,
            token=purchase_token
        ).execute()

        # purchaseStateが0 (Purchased) であることを確認
        purchase_state = result.get('purchaseState')
        if purchase_state != 0:
            raise ValueError(f"Purchase not completed. State: {purchase_state}")

        # 既に消費済みでないことを確認
        consumption_state = result.get('consumptionState')
        if consumption_state == 1:
            raise ValueError("Purchase already consumed")

        logger.info(
            "Purchase verified successfully",
            extra={
                "product_id": product_id,
                "purchase_token": purchase_token[:20] + "...",
                "order_id": result.get('orderId')
            }
        )

        return result

    except Exception as e:
        logger.error(
            f"Purchase verification failed: {e}",
            extra={
                "product_id": product_id,
                "purchase_token": purchase_token[:20] + "..."
            }
        )
        raise ValueError(f"Invalid purchase receipt: {str(e)}")


def acknowledge_purchase(product_id: str, purchase_token: str):
    """購入を確認済みにマーク"""
    try:
        credentials = service_account.Credentials.from_service_account_file(
            SERVICE_ACCOUNT_FILE, scopes=SCOPES
        )

        service = build('androidpublisher', 'v3', credentials=credentials)

        service.purchases().products().acknowledge(
            packageName=PACKAGE_NAME,
            productId=product_id,
            token=purchase_token,
            body={}
        ).execute()

        logger.info(f"Purchase acknowledged: {product_id}")

    except Exception as e:
        logger.error(f"Purchase acknowledgment failed: {e}")
        # エラーでも処理を続行（ユーザーはクレジットを受け取るべき）
```

### 2. add_credits エンドポイント改修 (`server/src/api/billing_router.py`)

```python
from src.billing.iap_verification import verify_purchase, acknowledge_purchase

@router.post("/credits/add", response_model=OperationSuccessResponse)
async def add_credits(
    request: AddCreditsRequest,
    user_id: str = Depends(verify_user),
    db: Session = Depends(get_db)
):
    # レシート検証
    try:
        product_id = request.purchase_record.get("productId")
        purchase_token = request.purchase_record.get("purchaseToken")

        if not product_id or not purchase_token:
            raise HTTPException(
                status_code=400,
                detail="Missing productId or purchaseToken in purchase_record"
            )

        # Google Play Developer APIで検証
        verification_result = verify_purchase(product_id, purchase_token)

    except ValueError as e:
        # 検証失敗
        logger.warning(
            "Invalid purchase attempt",
            extra={
                "user_id": user_id,
                "product_id": product_id,
                "error": str(e)
            }
        )
        raise HTTPException(
            status_code=400,
            detail=f"Invalid purchase receipt: {str(e)}"
        )

    # 二重購入防止
    transaction_id = request.purchase_record.get("transactionId")
    existing = db.query(Transaction).filter_by(
        transaction_id=transaction_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Purchase already processed"
        )

    # クレジット追加
    service = BillingService(db, user_id)
    result = service.add_credits(request.credits, request.purchase_record)

    # Google側で購入を確認済みにマーク
    acknowledge_purchase(product_id, purchase_token)

    return OperationSuccessResponse(**result)
```

### 3. requirements.txt に追加

```
google-api-python-client==2.108.0
google-auth==2.25.2
google-auth-httplib2==0.2.0
```
