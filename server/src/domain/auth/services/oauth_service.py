"""
@file oauth_service.py
@summary OAuthServiceドメインサービス - OAuth認証処理
@responsibility Google OAuth2認証フローのビジネスロジック
"""

import uuid
from typing import Any, Protocol

from src.core.logger import logger

from ..entities.device import Device
from ..entities.user import User
from ..repositories.device_repository import DeviceRepository
from ..repositories.user_repository import UserRepository


class GoogleOAuthProvider(Protocol):
    """Google OAuth プロバイダーのプロトコル（依存性逆転）"""

    def exchange_code_for_tokens(self, code: str) -> dict[str, Any]:
        """Authorization Codeをトークンに交換"""
        ...

    def get_user_info_from_access_token(self, access_token: str) -> dict[str, Any]:
        """Access Tokenからユーザー情報を取得"""
        ...


class CreditCreator(Protocol):
    """クレジット作成のプロトコル（依存性逆転 - Billingドメインとの結合を避ける）"""

    async def create_initial_credits(self, user_id: str) -> None:
        """新規ユーザー用の初期クレジットを作成"""
        ...


class OAuthService:
    """OAuth認証ドメインサービス

    Google OAuth2認証フローのビジネスロジックを提供する。
    Fatコントローラーから移行された主要ロジック。

    責務:
    - OAuth認証フロー全体の制御
    - ユーザー作成/更新
    - デバイス登録
    - 初期クレジット作成の調整
    """

    def __init__(
        self,
        user_repo: UserRepository,
        device_repo: DeviceRepository,
        google_oauth_provider: GoogleOAuthProvider,
        credit_creator: CreditCreator | None = None
    ):
        """初期化

        Args:
            user_repo: ユーザーリポジトリ
            device_repo: デバイスリポジトリ
            google_oauth_provider: Google OAuthプロバイダー
            credit_creator: クレジット作成サービス（オプショナル）
        """
        self.user_repo = user_repo
        self.device_repo = device_repo
        self.google_oauth_provider = google_oauth_provider
        self.credit_creator = credit_creator

    async def handle_oauth_callback(
        self, authorization_code: str, device_id: str
    ) -> dict[str, Any]:
        """OAuth認証コールバックを処理

        これはFatコントローラーから移行された主要ロジック。
        Authorization Codeを受け取り、ユーザー認証とデバイス登録を完了する。

        Args:
            authorization_code: Google Authorization Code
            device_id: デバイスID

        Returns:
            Dict: {
                "user_id": str,
                "is_new_user": bool,
                "email": str,
                "display_name": Optional[str],
                "profile_picture_url": Optional[str]
            }

        Raises:
            ValueError: OAuth処理に失敗した場合
        """
        try:
            # 1. Authorization Codeをトークンに交換
            tokens = self.google_oauth_provider.exchange_code_for_tokens(
                authorization_code
            )
            access_token = tokens.get("access_token")
            id_token = tokens.get("id_token")

            if not access_token or not id_token:
                raise ValueError("Missing tokens in Google response")

            # 2. Access Tokenからユーザー情報を取得
            user_info = self.google_oauth_provider.get_user_info_from_access_token(
                access_token
            )
            google_id = user_info.get("id")
            email = user_info.get("email")
            display_name = user_info.get("name")
            profile_picture_url = user_info.get("picture")

            if not google_id or not email:
                raise ValueError("Missing user info in Google response")

            # 3. ユーザーを作成または取得
            user_result = await self._get_or_create_user(
                google_id=google_id,
                email=email,
                display_name=display_name,
                profile_picture_url=profile_picture_url
            )

            user = user_result["user"]
            is_new_user = user_result["is_new_user"]

            # 4. デバイスを登録
            await self._register_device_for_oauth(device_id, user.user_id)

            # 5. 新規ユーザーの場合、初期クレジットを作成
            if is_new_user and self.credit_creator:
                await self.credit_creator.create_initial_credits(user.user_id)

            logger.info(
                "OAuth callback handled successfully",
                extra={
                    "user_id": user.user_id,
                    "is_new_user": is_new_user,
                    "device_id": device_id[:20] + "..."
                }
            )

            return {
                "user_id": user.user_id,
                "is_new_user": is_new_user,
                "email": user.email or "",
                "display_name": user.display_name,
                "profile_picture_url": user.profile_picture_url
            }

        except Exception as e:
            logger.error(f"OAuth callback handling failed: {e}")
            raise ValueError(f"OAuth authentication failed: {e}") from e

    async def _get_or_create_user(
        self,
        google_id: str,
        email: str,
        display_name: str | None,
        profile_picture_url: str | None
    ) -> dict[str, Any]:
        """ユーザーを取得または作成

        Args:
            google_id: Google ID
            email: メールアドレス
            display_name: 表示名
            profile_picture_url: プロフィール画像URL

        Returns:
            Dict: {"user": User, "is_new_user": bool}
        """
        # Google IDでユーザーを検索
        existing_user = await self.user_repo.find_by_google_id(google_id)

        if existing_user:
            # 既存ユーザー: プロフィール情報を更新
            updated_user = existing_user.update_google_profile(
                email=email,
                display_name=display_name,
                profile_picture_url=profile_picture_url
            )
            saved_user = await self.user_repo.save(updated_user)

            logger.info(
                "Existing Google user logged in",
                extra={"user_id": saved_user.user_id}
            )

            return {
                "user": saved_user,
                "is_new_user": False
            }

        # 新規ユーザー作成
        user_id = self._generate_unique_user_id()

        new_user = User.create_google_user(
            user_id=user_id,
            google_id=google_id,
            email=email,
            display_name=display_name,
            profile_picture_url=profile_picture_url
        )

        saved_user = await self.user_repo.save(new_user)

        logger.info(
            "New Google user created",
            extra={"user_id": saved_user.user_id}
        )

        return {
            "user": saved_user,
            "is_new_user": True
        }

    async def _register_device_for_oauth(
        self, device_id: str, user_id: str
    ) -> Device:
        """OAuth認証用のデバイス登録

        Args:
            device_id: デバイスID
            user_id: ユーザーID

        Returns:
            Device: 登録されたデバイス
        """
        # 既存デバイスチェック
        existing_device = await self.device_repo.find_by_device_id(device_id)

        if existing_device:
            # デバイスが別のユーザーに紐付けられている場合は再割り当て
            if not existing_device.belongs_to_user(user_id):
                logger.warning(
                    "Device reassignment detected during OAuth login",
                    extra={
                        "device_id": device_id[:20] + "...",
                        "old_user_id": existing_device.user_id,
                        "new_user_id": user_id
                    }
                )
                updated_device = existing_device.reassign_to_user(user_id)
            else:
                updated_device = existing_device.update_login()

            return await self.device_repo.save(updated_device)

        # 新規デバイス登録
        new_device = Device.register_new(
            device_id=device_id,
            user_id=user_id
        )

        return await self.device_repo.save(new_device)

    def _generate_unique_user_id(self) -> str:
        """一意なユーザーIDを生成

        Returns:
            str: ユーザーID（例: user_abc123def）
        """
        # UUID v4から短いIDを生成
        random_part = uuid.uuid4().hex[:10]
        return f"user_{random_part}"

    async def link_google_account(
        self,
        user_id: str,
        authorization_code: str
    ) -> dict[str, Any]:
        """既存ユーザーにGoogleアカウントを紐付け

        Args:
            user_id: ユーザーID
            authorization_code: Google Authorization Code

        Returns:
            Dict: {
                "success": True,
                "email": str,
                "display_name": Optional[str]
            }

        Raises:
            ValueError: ユーザーが見つからない、またはすでにGoogleアカウントが紐付けられている場合
        """
        # ユーザーを取得
        user = await self.user_repo.find_by_id(user_id)
        if not user:
            raise ValueError(f"User not found: {user_id}")

        if user.is_google_authenticated():
            raise ValueError("Google account already linked to this user")

        # トークン交換
        tokens = self.google_oauth_provider.exchange_code_for_tokens(
            authorization_code
        )
        access_token = tokens.get("access_token")

        if not access_token:
            raise ValueError("Failed to exchange authorization code")

        # ユーザー情報取得
        user_info = self.google_oauth_provider.get_user_info_from_access_token(
            access_token
        )
        google_id = user_info.get("id")
        email = user_info.get("email")
        display_name = user_info.get("name")
        profile_picture_url = user_info.get("picture")

        if not google_id or not email:
            raise ValueError("Failed to get user info from Google")

        # Googleアカウントを紐付け
        updated_user = user.link_google_account(
            google_id=google_id,
            email=email,
            display_name=display_name,
            profile_picture_url=profile_picture_url
        )

        await self.user_repo.save(updated_user)

        logger.info(
            "Google account linked to user",
            extra={"user_id": user_id, "email": email}
        )

        return {
            "success": True,
            "email": email,
            "display_name": display_name
        }
