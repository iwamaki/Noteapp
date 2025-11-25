# @file iap_verifier.py
# @summary Google Play In-App Purchase レシート検証
# @responsibility Google Play Developer APIを使用したIAPレシート検証、購入確認

import os
from typing import Any

import google.auth
from google.oauth2 import service_account
from googleapiclient.discovery import build  # type: ignore[import-untyped]

from src.core.logger import logger

SCOPES = ['https://www.googleapis.com/auth/androidpublisher']
SERVICE_ACCOUNT_FILE = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
PACKAGE_NAME = os.getenv("ANDROID_PACKAGE_NAME", "com.iwash.NoteApp")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")


def verify_purchase(product_id: str, purchase_token: str) -> dict[str, Any]:
    """
    Google Play Developer APIでレシートを検証

    Args:
        product_id: 商品ID (例: "token_300")
        purchase_token: 購入トークン

    Returns:
        検証結果の辞書 (Google Play Developer APIのレスポンス)

    Raises:
        ValueError: 検証失敗時
    """
    try:
        # Cloud Run環境では自動認証、開発環境ではサービスアカウントファイルを使用
        if ENVIRONMENT == "production" or not SERVICE_ACCOUNT_FILE:
            # Cloud Runの自動認証を使用
            credentials, _ = google.auth.default(scopes=SCOPES)
        else:
            # 開発環境: サービスアカウントファイルから認証情報を読み込む
            if not os.path.exists(SERVICE_ACCOUNT_FILE):
                raise ValueError(f"Service account file not found: {SERVICE_ACCOUNT_FILE}")
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

        # 注意: consumption_stateのチェックは行わない
        # 理由: 消費型アイテム（consumable）は何度でも購入可能
        #       同じproductIdでも新しいpurchaseTokenが発行される
        #       二重購入防止はtransaction_idで行う（billing_router.py）

        logger.info(
            "Purchase verified successfully",
            extra={
                "category": "billing",
                "product_id": product_id,
                "purchase_token": purchase_token[:20] + "...",
                "order_id": result.get('orderId')
            }
        )

        return result  # type: ignore[no-any-return]

    except Exception as e:
        logger.error(
            f"Purchase verification failed: {e}",
            extra={
                "category": "billing",
                "product_id": product_id,
                "purchase_token": purchase_token[:20] + "..." if purchase_token else "None"
            }
        )
        raise ValueError(f"Invalid purchase receipt: {str(e)}") from e


def acknowledge_purchase(product_id: str, purchase_token: str):
    """
    購入を確認済みにマーク

    Google Play側で購入を消費済み状態にする。
    これを行わないと、ユーザーは同じ購入を再度使用できてしまう。

    Args:
        product_id: 商品ID
        purchase_token: 購入トークン

    Note:
        エラーが発生してもユーザーはクレジットを受け取るべきなので、
        例外を再スローせずにログ記録のみ行う。
    """
    try:
        # Cloud Run環境では自動認証、開発環境ではサービスアカウントファイルを使用
        if ENVIRONMENT == "production" or not SERVICE_ACCOUNT_FILE:
            # Cloud Runの自動認証を使用
            credentials, _ = google.auth.default(scopes=SCOPES)
        else:
            # 開発環境: サービスアカウントファイルから認証情報を読み込む
            if not os.path.exists(SERVICE_ACCOUNT_FILE):
                logger.warning(
                    f"Service account file not found: {SERVICE_ACCOUNT_FILE}, skipping acknowledgment",
                    extra={"category": "billing"}
                )
                return
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

        logger.info(f"Purchase acknowledged: {product_id}", extra={"category": "billing"})

    except Exception as e:
        logger.error(f"Purchase acknowledgment failed: {e}", extra={"category": "billing"})
        # エラーでも処理を続行（ユーザーはクレジットを受け取るべき）
