"""
@file token_service.py
@summary TokenServiceドメインサービス - トークン管理
@responsibility JWT生成・検証・ブラックリスト管理のビジネスロジック
"""

from datetime import datetime
from typing import Any, Protocol

from src.core.logger import logger


class TokenBlacklistManager(Protocol):
    """トークンブラックリストマネージャーのプロトコル（依存性逆転）"""

    def add_to_blacklist(self, token: str, expires_in_seconds: int) -> None:
        """トークンをブラックリストに追加"""
        ...

    def is_blacklisted(self, token: str) -> bool:
        """トークンがブラックリストに含まれているかチェック"""
        ...


class JWTEncoder(Protocol):
    """JWT生成のプロトコル（依存性逆転）"""

    def create_access_token(self, user_id: str, device_id: str) -> str:
        """アクセストークンを生成"""
        ...

    def create_refresh_token(self, user_id: str, device_id: str) -> str:
        """リフレッシュトークンを生成"""
        ...

    def verify_token(
        self, token: str, expected_type: str
    ) -> dict[str, Any] | None:
        """トークンを検証してペイロードを返す"""
        ...

    def get_access_token_expire_minutes(self) -> int:
        """アクセストークンの有効期限（分）を取得"""
        ...

    def get_refresh_token_expire_days(self) -> int:
        """リフレッシュトークンの有効期限（日）を取得"""
        ...


class TokenService:
    """トークン管理ドメインサービス

    JWT生成・検証・ブラックリスト管理に関するビジネスロジックを提供する。

    責務:
    - JWTトークンペアの生成
    - トークンの検証
    - トークンのブラックリスト管理
    - トークンリフレッシュ
    """

    def __init__(
        self,
        jwt_encoder: JWTEncoder,
        blacklist_manager: TokenBlacklistManager
    ):
        """初期化

        Args:
            jwt_encoder: JWT生成・検証を行うエンコーダー
            blacklist_manager: ブラックリスト管理マネージャー
        """
        self.jwt_encoder = jwt_encoder
        self.blacklist_manager = blacklist_manager

    def generate_token_pair(
        self, user_id: str, device_id: str
    ) -> dict[str, Any]:
        """アクセストークンとリフレッシュトークンのペアを生成

        Args:
            user_id: ユーザーID
            device_id: デバイスID

        Returns:
            Dict: {
                "access_token": str,
                "refresh_token": str,
                "token_type": "Bearer",
                "expires_in": int (seconds)
            }
        """
        access_token = self.jwt_encoder.create_access_token(user_id, device_id)
        refresh_token = self.jwt_encoder.create_refresh_token(user_id, device_id)

        expires_in = self.jwt_encoder.get_access_token_expire_minutes() * 60

        logger.info(
            "Token pair generated",
            extra={
                "user_id": user_id,
                "device_id": device_id[:20] + "..." if device_id else "unknown"
            }
        )

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "Bearer",
            "expires_in": expires_in
        }

    def verify_access_token(self, token: str) -> dict[str, Any] | None:
        """アクセストークンを検証

        Args:
            token: JWTアクセストークン

        Returns:
            Optional[Dict]: トークンペイロード、検証失敗時はNone
        """
        # ブラックリストチェック
        if self.blacklist_manager.is_blacklisted(token):
            logger.warning("Access token is blacklisted")
            return None

        # JWT検証
        payload = self.jwt_encoder.verify_token(token, "access")

        if payload:
            logger.debug(
                "Access token verified",
                extra={"user_id": payload.get("sub")}
            )

        return payload

    def verify_refresh_token(self, token: str) -> dict[str, Any] | None:
        """リフレッシュトークンを検証

        Args:
            token: JWTリフレッシュトークン

        Returns:
            Optional[Dict]: トークンペイロード、検証失敗時はNone
        """
        # ブラックリストチェック
        if self.blacklist_manager.is_blacklisted(token):
            logger.warning("Refresh token is blacklisted")
            return None

        # JWT検証
        payload = self.jwt_encoder.verify_token(token, "refresh")

        if payload:
            logger.debug(
                "Refresh token verified",
                extra={"user_id": payload.get("sub")}
            )

        return payload

    def refresh_access_token(
        self, refresh_token: str
    ) -> dict[str, Any] | None:
        """リフレッシュトークンを使って新しいアクセストークンを生成

        Args:
            refresh_token: JWTリフレッシュトークン

        Returns:
            Optional[Dict]: 新しいトークン情報、検証失敗時はNone
                {
                    "access_token": str,
                    "token_type": "Bearer",
                    "expires_in": int
                }
        """
        # リフレッシュトークンを検証
        payload = self.verify_refresh_token(refresh_token)

        if not payload:
            logger.warning("Failed to refresh: invalid refresh token")
            return None

        user_id = payload.get("sub")
        device_id = payload.get("device_id")

        if not user_id or not device_id:
            logger.error("Missing user_id or device_id in refresh token")
            return None

        # 新しいアクセストークンを生成
        access_token = self.jwt_encoder.create_access_token(user_id, device_id)
        expires_in = self.jwt_encoder.get_access_token_expire_minutes() * 60

        logger.info(
            "Access token refreshed",
            extra={"user_id": user_id, "device_id": device_id[:20] + "..."}
        )

        return {
            "access_token": access_token,
            "token_type": "Bearer",
            "expires_in": expires_in
        }

    def revoke_token_pair(
        self, access_token: str, refresh_token: str
    ) -> dict[str, Any]:
        """トークンペアを無効化（ログアウト）

        Args:
            access_token: アクセストークン
            refresh_token: リフレッシュトークン

        Returns:
            Dict: {"success": True, "message": str}
        """
        try:
            # トークンのペイロードを取得（署名検証なし）
            access_payload = self.jwt_encoder.verify_token(access_token, "access")
            refresh_payload = self.jwt_encoder.verify_token(refresh_token, "refresh")

            # 残りの有効期限を計算
            current_time = datetime.utcnow().timestamp()

            if access_payload:
                access_exp = access_payload.get("exp", 0)
                access_expires_in = max(0, int(access_exp - current_time))
                if access_expires_in > 0:
                    self.blacklist_manager.add_to_blacklist(
                        access_token, access_expires_in
                    )
                    logger.debug(f"Access token blacklisted: {access_expires_in}s")

            if refresh_payload:
                refresh_exp = refresh_payload.get("exp", 0)
                refresh_expires_in = max(0, int(refresh_exp - current_time))
                if refresh_expires_in > 0:
                    self.blacklist_manager.add_to_blacklist(
                        refresh_token, refresh_expires_in
                    )
                    logger.debug(f"Refresh token blacklisted: {refresh_expires_in}s")

            user_id = (access_payload or {}).get("sub", "unknown")
            device_id = (access_payload or {}).get("device_id", "unknown")

            logger.info(
                "Token pair revoked",
                extra={"user_id": user_id, "device_id": device_id[:20] + "..."}
            )

            return {"success": True, "message": "Tokens revoked successfully"}

        except Exception as e:
            logger.error(f"Failed to revoke tokens: {e}")
            raise ValueError(f"Token revocation failed: {e}") from e

    def extract_user_id(self, token: str) -> str | None:
        """トークンからユーザーIDを抽出

        Args:
            token: JWTトークン

        Returns:
            Optional[str]: ユーザーID、失敗時はNone
        """
        payload = self.verify_access_token(token)
        return payload.get("sub") if payload else None

    def extract_device_id(self, token: str) -> str | None:
        """トークンからデバイスIDを抽出

        Args:
            token: JWTトークン

        Returns:
            Optional[str]: デバイスID、失敗時はNone
        """
        payload = self.verify_access_token(token)
        return payload.get("device_id") if payload else None
