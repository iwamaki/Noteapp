"""
@file user.py
@summary Userエンティティ - ユーザードメインモデル
@responsibility ユーザーの識別情報と認証情報を管理するドメインエンティティ
"""

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class User:
    """ユーザーエンティティ

    アプリケーションにおけるユーザーを表現する。
    デバイスID認証とGoogle OAuth2認証の両方に対応。

    ビジネスルール:
    - user_idは必須かつ一意
    - Google認証を利用する場合、google_idとemailは必須
    - emailは有効な形式でなければならない
    """

    user_id: str
    created_at: datetime = field(default_factory=datetime.now)

    # Google OAuth2 認証情報（オプショナル）
    google_id: str | None = None
    email: str | None = None
    display_name: str | None = None
    profile_picture_url: str | None = None

    id: int | None = None  # 永続化後にDBから設定される

    def __post_init__(self):
        """初期化後のバリデーション"""
        self._validate()

    def _validate(self):
        """ビジネスルールのバリデーション"""
        if not self.user_id:
            raise ValueError("user_id is required")

        if not self.user_id.startswith("user_"):
            raise ValueError("user_id must start with 'user_' prefix")

        # Google認証の整合性チェック
        if self.google_id and not self.email:
            raise ValueError("email is required when google_id is provided")

        if self.email and not self._is_valid_email(self.email):
            raise ValueError(f"Invalid email format: {self.email}")

    def _is_valid_email(self, email: str) -> bool:
        """簡易的なメールアドレス検証

        Args:
            email: 検証するメールアドレス

        Returns:
            bool: 有効な場合True
        """
        return "@" in email and "." in email.split("@")[1]

    def is_google_authenticated(self) -> bool:
        """Google認証済みかどうかをチェック

        Returns:
            bool: Google認証済みの場合True
        """
        return self.google_id is not None and self.email is not None

    def update_google_profile(
        self,
        email: str,
        display_name: str | None = None,
        profile_picture_url: str | None = None
    ) -> "User":
        """Googleプロフィール情報を更新

        Args:
            email: メールアドレス
            display_name: 表示名
            profile_picture_url: プロフィール画像URL

        Returns:
            User: 更新された新しいUserインスタンス（イミュータブル性）

        Raises:
            ValueError: Google認証が設定されていない場合
        """
        if not self.google_id:
            raise ValueError("Cannot update Google profile without google_id")

        return User(
            id=self.id,
            user_id=self.user_id,
            created_at=self.created_at,
            google_id=self.google_id,
            email=email,
            display_name=display_name,
            profile_picture_url=profile_picture_url
        )

    def link_google_account(
        self,
        google_id: str,
        email: str,
        display_name: str | None = None,
        profile_picture_url: str | None = None
    ) -> "User":
        """Googleアカウントを既存ユーザーに紐付け

        Args:
            google_id: Google ID
            email: メールアドレス
            display_name: 表示名
            profile_picture_url: プロフィール画像URL

        Returns:
            User: Googleアカウントが紐付けられた新しいUserインスタンス

        Raises:
            ValueError: すでにGoogleアカウントが紐付けられている場合
        """
        if self.google_id:
            raise ValueError(f"Google account already linked: {self.google_id}")

        return User(
            id=self.id,
            user_id=self.user_id,
            created_at=self.created_at,
            google_id=google_id,
            email=email,
            display_name=display_name,
            profile_picture_url=profile_picture_url
        )

    @staticmethod
    def create_device_user(user_id: str) -> "User":
        """デバイスID認証専用ユーザーを作成

        Args:
            user_id: ユーザーID（user_プレフィックス付き）

        Returns:
            User: 新しいUserインスタンス
        """
        return User(user_id=user_id)

    @staticmethod
    def create_google_user(
        user_id: str,
        google_id: str,
        email: str,
        display_name: str | None = None,
        profile_picture_url: str | None = None
    ) -> "User":
        """Google OAuth2認証ユーザーを作成

        Args:
            user_id: ユーザーID（user_プレフィックス付き）
            google_id: Google ID
            email: メールアドレス
            display_name: 表示名
            profile_picture_url: プロフィール画像URL

        Returns:
            User: 新しいUserインスタンス
        """
        return User(
            user_id=user_id,
            google_id=google_id,
            email=email,
            display_name=display_name,
            profile_picture_url=profile_picture_url
        )
