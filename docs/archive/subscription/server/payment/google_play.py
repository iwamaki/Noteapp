"""
@file google_play.py
@summary Google Play Billing API integration for receipt verification
@responsibility Verify Android IAP receipts using Google Play Developer API
"""
from google.oauth2 import service_account  # type: ignore[import-untyped]
from googleapiclient.discovery import build  # type: ignore[import-untyped]
from typing import Optional, Dict, Any
from datetime import datetime
import os
from src.core.logger import logger


class GooglePlayVerifier:
    """Google Play レシート検証クラス"""

    def __init__(self):
        """初期化

        環境変数から認証情報を読み込みます：
        - GOOGLE_APPLICATION_CREDENTIALS: サービスアカウントJSONファイルのパス
        - ANDROID_PACKAGE_NAME: Androidアプリのパッケージ名
        """
        self.package_name = os.getenv("ANDROID_PACKAGE_NAME", "com.iwash.NoteApp")
        self.credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

        if not self.credentials_path:
            logger.warning("GOOGLE_APPLICATION_CREDENTIALS not set. Receipt verification will fail.")
            self.service = None
            return

        try:
            # サービスアカウント認証
            credentials = service_account.Credentials.from_service_account_file(
                self.credentials_path,
                scopes=['https://www.googleapis.com/auth/androidpublisher']
            )

            # Google Play Developer API v3
            self.service = build('androidpublisher', 'v3', credentials=credentials)
            logger.info("Google Play Verifier initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Google Play Verifier: {e}")
            self.service = None

    async def verify_subscription(
        self,
        product_id: str,
        purchase_token: str,
        package_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """サブスクリプション購入を検証

        Args:
            product_id: プロダクトID（例: noteapp.pro.monthly）
            purchase_token: 購入トークン
            package_name: パッケージ名（Noneの場合はデフォルトを使用）

        Returns:
            検証結果の辞書:
            {
                "valid": bool,
                "tier": str,
                "status": str,  # "active", "canceled", "expired"
                "expires_at": str,  # ISO 8601
                "auto_renew": bool,
                "error": Optional[str]
            }
        """
        if not self.service:
            return {
                "valid": False,
                "error": "Google Play Verifier not initialized"
            }

        try:
            pkg_name = package_name or self.package_name

            # Google Play Developer API で購入を検証
            result = self.service.purchases().subscriptions().get(
                packageName=pkg_name,
                subscriptionId=product_id,
                token=purchase_token
            ).execute()

            logger.info(f"Subscription verification result: {result}")

            # 期限をミリ秒からdatetimeに変換
            expiry_time_millis = int(result.get('expiryTimeMillis', 0))
            expires_at = datetime.fromtimestamp(expiry_time_millis / 1000).isoformat()

            # 自動更新フラグ
            auto_renew = result.get('autoRenewing', False)

            # ステータス判定
            # paymentState: 0=Pending, 1=Received, 2=Free trial, 3=Pending deferred upgrade/downgrade
            # cancelReason: 0=User, 1=System, 2=Replaced, 3=Developer
            payment_state = result.get('paymentState', 0)
            cancel_reason = result.get('cancelReason')

            now = datetime.now()
            expiry_date = datetime.fromtimestamp(expiry_time_millis / 1000)
            is_expired = now >= expiry_date

            # ステータス判定ロジック
            if is_expired:
                status = "expired"
            elif cancel_reason is not None:
                # キャンセルされているが期限内
                status = "canceled"
            elif payment_state == 1:
                # 支払い完了、有効
                status = "active"
            elif payment_state == 2:
                # 無料トライアル
                status = "trial"
            else:
                # その他（保留中など）
                status = "none"

            # Tierの判定（productIdから）
            tier = self._get_tier_from_product_id(product_id)

            return {
                "valid": True,
                "tier": tier,
                "status": status,
                "expires_at": expires_at,
                "auto_renew": auto_renew,
                "is_valid": status in ["active", "trial", "canceled"] and not is_expired
            }

        except Exception as e:
            logger.error(f"Failed to verify subscription: {e}")
            return {
                "valid": False,
                "error": str(e)
            }

    def _get_tier_from_product_id(self, product_id: str) -> str:
        """プロダクトIDからTierを判定"""
        if "premium" in product_id:
            return "premium"
        elif "pro" in product_id:
            return "pro"
        elif "standard" in product_id:
            return "standard"
        return "free"
