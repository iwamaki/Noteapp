"""
@file iap_verifier.py
@summary Google Play In-App Purchase検証
@responsibility Google Play Developer APIを使用したIAP検証
"""

from typing import Dict, Any
from google.oauth2 import service_account
from googleapiclient.discovery import build


class GooglePlayIAPError(Exception):
    """Google Play IAP関連エラー"""
    pass


class GooglePlayIAPVerifier:
    """Google Play In-App Purchase検証クライアント

    Google Play Developer APIを使用して、アプリ内課金の検証を行う。
    """

    SCOPES = ["https://www.googleapis.com/auth/androidpublisher"]

    def __init__(
        self,
        service_account_file: str,
        package_name: str,
    ):
        """
        Args:
            service_account_file: GCPサービスアカウントキーのパス
            package_name: Androidアプリのパッケージ名
        """
        self.service_account_file = service_account_file
        self.package_name = package_name
        self._service = None

    @property
    def service(self):
        """Google Play Developer APIサービスを取得（遅延初期化）"""
        if self._service is None:
            credentials = service_account.Credentials.from_service_account_file(
                self.service_account_file,
                scopes=self.SCOPES,
            )
            self._service = build("androidpublisher", "v3", credentials=credentials)
        return self._service

    def verify_product_purchase(
        self,
        product_id: str,
        purchase_token: str,
    ) -> Dict[str, Any]:
        """プロダクト購入を検証

        Args:
            product_id: プロダクトID（例: "token_300"）
            purchase_token: 購入トークン

        Returns:
            検証結果（Google Play Developer APIのレスポンス）
            {
                "purchaseState": int,  # 0: Purchased, 1: Canceled, 2: Pending
                "consumptionState": int,  # 0: Yet to be consumed, 1: Consumed
                "orderId": str,
                "purchaseTimeMillis": str,
                ...
            }

        Raises:
            GooglePlayIAPError: 検証失敗
        """
        try:
            result = self.service.purchases().products().get(
                packageName=self.package_name,
                productId=product_id,
                token=purchase_token,
            ).execute()

            # purchaseStateが0 (Purchased) であることを確認
            purchase_state = result.get("purchaseState")
            if purchase_state != 0:
                raise GooglePlayIAPError(
                    f"Purchase not completed. State: {purchase_state}"
                )

            return result

        except Exception as e:
            raise GooglePlayIAPError(f"Purchase verification failed: {str(e)}")

    def acknowledge_purchase(
        self,
        product_id: str,
        purchase_token: str,
    ) -> None:
        """購入を承認（Acknowledge）

        Args:
            product_id: プロダクトID
            purchase_token: 購入トークン

        Raises:
            GooglePlayIAPError: 承認失敗
        """
        try:
            self.service.purchases().products().acknowledge(
                packageName=self.package_name,
                productId=product_id,
                token=purchase_token,
            ).execute()

        except Exception as e:
            raise GooglePlayIAPError(f"Purchase acknowledgment failed: {str(e)}")

    def verify_subscription_purchase(
        self,
        subscription_id: str,
        purchase_token: str,
    ) -> Dict[str, Any]:
        """サブスクリプション購入を検証

        Args:
            subscription_id: サブスクリプションID
            purchase_token: 購入トークン

        Returns:
            検証結果

        Raises:
            GooglePlayIAPError: 検証失敗
        """
        try:
            result = self.service.purchases().subscriptions().get(
                packageName=self.package_name,
                subscriptionId=subscription_id,
                token=purchase_token,
            ).execute()

            return result

        except Exception as e:
            raise GooglePlayIAPError(f"Subscription verification failed: {str(e)}")
