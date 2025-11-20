"""
@file pricing.py
@summary Pricingエンティティ - トークン価格情報
@responsibility モデルごとの価格情報を管理するドメインエンティティ
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum


class PricingCategory(Enum):
    """価格カテゴリー"""
    QUICK = "quick"  # 高速・低コスト
    THINK = "think"  # 高性能・高コスト


@dataclass
class Pricing:
    """価格情報エンティティ

    モデルごとの販売価格（円/Mトークン）を管理する。

    ビジネスルール:
    - model_idは必須でユニーク
    - price_per_m_tokenは常に正の整数
    - categoryはPricingCategoryのいずれか
    - 価格変更はupdated_atが自動更新される
    """

    model_id: str
    price_per_m_token: int
    category: PricingCategory
    exchange_rate: int | None = None  # 為替レート（参考値）
    margin_percent: int | None = None  # マージン率（参考値）
    updated_at: datetime = field(default_factory=datetime.now)

    def __post_init__(self):
        """初期化後のバリデーション"""
        self._validate()
        # Enum型の変換
        if isinstance(self.category, str):
            self.category = PricingCategory(self.category)

    def _validate(self):
        """ビジネスルールのバリデーション"""
        if not self.model_id:
            raise ValueError("model_id is required")

        if self.price_per_m_token <= 0:
            raise ValueError(f"price_per_m_token must be positive, got {self.price_per_m_token}")

        # categoryをEnumに変換（文字列の場合）
        if isinstance(self.category, str):
            try:
                PricingCategory(self.category)
            except ValueError as e:
                valid_categories = [c.value for c in PricingCategory]
                raise ValueError(f"category must be one of {valid_categories}, got {self.category}") from e

    def calculate_tokens_from_credits(self, credits: float) -> int:
        """クレジット額からトークン数を計算

        Args:
            credits: クレジット額（円）

        Returns:
            int: トークン数

        Raises:
            ValueError: credits が負の場合
        """
        if credits < 0:
            raise ValueError(f"credits must be non-negative, got {credits}")

        if credits == 0:
            return 0

        return int((credits / self.price_per_m_token) * 1_000_000)

    def calculate_credits_from_tokens(self, tokens: int) -> int:
        """トークン数からクレジット額を計算

        Args:
            tokens: トークン数

        Returns:
            int: クレジット額（円）

        Raises:
            ValueError: tokens が負の場合
        """
        if tokens < 0:
            raise ValueError(f"tokens must be non-negative, got {tokens}")

        if tokens == 0:
            return 0

        return int((tokens / 1_000_000) * self.price_per_m_token)

    def update_price(self, new_price: int) -> "Pricing":
        """価格を更新する

        Args:
            new_price: 新しい価格（円/Mトークン）

        Returns:
            Pricing: 新しいPricingインスタンス（イミュータブル性）

        Raises:
            ValueError: new_price が正の整数でない場合
        """
        if new_price <= 0:
            raise ValueError(f"new_price must be positive, got {new_price}")

        return Pricing(
            model_id=self.model_id,
            price_per_m_token=new_price,
            category=self.category,
            exchange_rate=self.exchange_rate,
            margin_percent=self.margin_percent,
            updated_at=datetime.now()
        )

    def to_dict(self) -> dict:
        """辞書形式に変換（レスポンス用）

        Returns:
            dict: 価格情報の辞書
        """
        return {
            "price_per_m_token": self.price_per_m_token,
            "category": self.category.value if isinstance(self.category, PricingCategory) else self.category
        }
