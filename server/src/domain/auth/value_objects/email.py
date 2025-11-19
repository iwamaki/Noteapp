"""
@file email.py
@summary Email値オブジェクト
@responsibility メールアドレスを表現する値オブジェクト
"""

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class Email:
    """メールアドレス値オブジェクト

    メールアドレスを表現する不変オブジェクト。
    RFC 5322 に準拠した簡易的なバリデーションを実施。

    ビジネスルール:
    - valueは必須
    - valueは有効なメールアドレス形式でなければならない
    """

    value: str

    # 簡易的なメールアドレスパターン
    EMAIL_PATTERN = re.compile(
        r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    )

    def __post_init__(self):
        """初期化後のバリデーション"""
        if not self.value:
            raise ValueError("Email cannot be empty")

        if not self.is_valid_format():
            raise ValueError(f"Invalid email format: {self.value}")

        if len(self.value) > 255:
            raise ValueError(f"Email too long: {len(self.value)} chars")

    def is_valid_format(self) -> bool:
        """メールアドレス形式が有効かチェック

        Returns:
            bool: 有効な形式の場合True
        """
        return bool(self.EMAIL_PATTERN.match(self.value))

    def domain(self) -> str:
        """ドメイン部分を取得

        Returns:
            str: ドメイン（例: "gmail.com"）

        Raises:
            ValueError: メールアドレスが無効な場合
        """
        if "@" not in self.value:
            raise ValueError("Invalid email: missing @")
        return self.value.split("@")[1]

    def local_part(self) -> str:
        """ローカル部分を取得

        Returns:
            str: ローカル部分（例: "user"）

        Raises:
            ValueError: メールアドレスが無効な場合
        """
        if "@" not in self.value:
            raise ValueError("Invalid email: missing @")
        return self.value.split("@")[0]

    def is_from_domain(self, domain: str) -> bool:
        """指定されたドメインのメールアドレスかチェック

        Args:
            domain: チェックするドメイン（例: "gmail.com"）

        Returns:
            bool: 指定されたドメインの場合True
        """
        return self.domain().lower() == domain.lower()

    def __str__(self) -> str:
        """文字列表現を返す"""
        return self.value

    def __repr__(self) -> str:
        """開発者向け文字列表現"""
        return f"Email('{self.value}')"

    @staticmethod
    def from_string(value: str) -> "Email":
        """文字列からEmailを作成

        Args:
            value: メールアドレス文字列

        Returns:
            Email: 新しいEmailインスタンス
        """
        return Email(value)
