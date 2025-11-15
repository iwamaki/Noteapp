# @file iap_verification.py
# @summary Google Play In-App Purchase レシート検証
# @responsibility Google Play Developer APIを使用したIAPレシート検証、購入確認

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
        検証結果の辞書 (Google Play Developer APIのレスポンス)

    Raises:
        ValueError: 検証失敗時
    """
    try:
        if not SERVICE_ACCOUNT_FILE:
            raise ValueError("GOOGLE_APPLICATION_CREDENTIALS environment variable is not set")

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
                "purchase_token": purchase_token[:20] + "..." if purchase_token else "None"
            }
        )
        raise ValueError(f"Invalid purchase receipt: {str(e)}")


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
        if not SERVICE_ACCOUNT_FILE:
            logger.warning("GOOGLE_APPLICATION_CREDENTIALS not set, skipping acknowledgment")
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

        logger.info(f"Purchase acknowledged: {product_id}")

    except Exception as e:
        logger.error(f"Purchase acknowledgment failed: {e}")
        # エラーでも処理を続行（ユーザーはクレジットを受け取るべき）
