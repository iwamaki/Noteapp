"""
@file token_service.py
@summary TokenServiceドメインサービス - トークン管理
@responsibility トークン割当・消費のビジネスロジック
"""

from typing import Any

from ..entities.pricing import PricingCategory
from ..entities.user_balance import UserBalance
from ..repositories.balance_repository import BalanceRepository
from ..repositories.pricing_repository import PricingRepository

# カテゴリー別容量制限（トークン数）
TOKEN_CAPACITY_LIMITS = {
    "quick": 5_000_000,  # Quick: 5Mトークン
    "think": 1_000_000,  # Think: 1Mトークン
}


class TokenService:
    """トークン管理ドメインサービス

    トークンの配分、消費、残高チェックに関するビジネスロジックを提供する。

    責務:
    - トークン配分（クレジット→トークン変換）
    - トークン消費（LLM使用時）
    - カテゴリー別容量チェック
    - 残高照会
    """

    def __init__(
        self,
        balance_repo: BalanceRepository,
        pricing_repo: PricingRepository,
    ):
        """初期化

        Args:
            balance_repo: 残高リポジトリ
            pricing_repo: 価格情報リポジトリ
        """
        self.balance_repo = balance_repo
        self.pricing_repo = pricing_repo

    async def get_balance(self, user_id: str) -> dict[str, int]:
        """モデル別トークン残高を取得

        Args:
            user_id: ユーザーID

        Returns:
            Dict[str, int]: {"model_id": tokens, ...}
        """
        balances = await self.balance_repo.find_all_by_user(user_id)
        return {b.model_id: b.allocated_tokens for b in balances}

    async def get_category_balance(
        self, user_id: str, category: PricingCategory
    ) -> int:
        """カテゴリー別トークン合計を取得

        Args:
            user_id: ユーザーID
            category: カテゴリー

        Returns:
            int: カテゴリー内の全トークン合計
        """
        # カテゴリーに属するモデルIDを取得
        model_ids = await self.pricing_repo.find_model_ids_by_category(category)

        if not model_ids:
            return 0

        # 該当モデルの残高を取得
        balances = await self.balance_repo.find_by_user_and_models(user_id, model_ids)

        # 合計を計算
        total = sum(b.allocated_tokens for b in balances)
        return total

    async def allocate_tokens(
        self,
        user_id: str,
        model_id: str,
        tokens: int,
    ) -> UserBalance:
        """トークンを配分する

        カテゴリー容量制限をチェックし、トークンを配分する。

        Args:
            user_id: ユーザーID
            model_id: モデルID
            tokens: 配分するトークン数

        Returns:
            UserBalance: 更新された残高エンティティ

        Raises:
            ValueError: 価格情報がない、または容量制限を超える場合
        """
        if tokens <= 0:
            raise ValueError(f"tokens must be positive, got {tokens}")

        # 価格情報を取得（カテゴリー判定のため）
        pricing = await self.pricing_repo.find_by_model(model_id)
        if not pricing:
            raise ValueError(f"モデル {model_id} の価格情報が見つかりません")

        # カテゴリー容量チェック
        await self._check_capacity_limit(
            user_id=user_id,
            model_id=model_id,
            category=pricing.category,
            additional_tokens=tokens,
        )

        # 残高を取得または作成
        balance = await self.balance_repo.find_by_user_and_model(user_id, model_id)

        if balance:
            # 既存残高に追加
            updated_balance = balance.allocate_tokens(tokens)
        else:
            # 新規作成
            updated_balance = UserBalance(
                user_id=user_id, model_id=model_id, allocated_tokens=tokens
            )

        # 保存
        saved_balance = await self.balance_repo.save(updated_balance)

        return saved_balance

    async def consume_tokens(
        self, user_id: str, model_id: str, input_tokens: int, output_tokens: int
    ) -> dict[str, Any]:
        """トークンを消費する

        Args:
            user_id: ユーザーID
            model_id: モデルID
            input_tokens: 入力トークン数
            output_tokens: 出力トークン数

        Returns:
            Dict[str, Any]: {"success": True, "remaining_tokens": int}

        Raises:
            ValueError: トークン残高不足、または残高レコードなしの場合
        """
        total_tokens = input_tokens + output_tokens

        if total_tokens <= 0:
            raise ValueError(f"total_tokens must be positive, got {total_tokens}")

        # 残高を取得
        balance = await self.balance_repo.find_by_user_and_model(user_id, model_id)

        if not balance:
            raise ValueError(f"モデル {model_id} のトークン残高がありません")

        # トークン消費
        updated_balance = balance.consume_tokens(total_tokens)

        # 保存
        saved_balance = await self.balance_repo.save(updated_balance)

        return {
            "success": True,
            "remaining_tokens": saved_balance.allocated_tokens,
        }

    async def reset_all_balances(self, user_id: str) -> dict[str, Any]:
        """全モデルのトークン残高をリセット（デバッグ用）

        Args:
            user_id: ユーザーID

        Returns:
            Dict[str, Any]: {"success": True, "message": str}
        """
        await self.balance_repo.delete_all_by_user(user_id)

        return {"success": True, "message": "All balances reset successfully"}

    # ========================================
    # 内部ヘルパーメソッド
    # ========================================

    async def _check_capacity_limit(
        self,
        user_id: str,
        model_id: str,
        category: PricingCategory,
        additional_tokens: int,
    ) -> None:
        """カテゴリー容量制限をチェック

        Args:
            user_id: ユーザーID
            model_id: モデルID
            category: カテゴリー
            additional_tokens: 追加するトークン数

        Raises:
            ValueError: 容量制限を超える場合
        """
        # カテゴリーの容量制限を取得
        limit = TOKEN_CAPACITY_LIMITS.get(category.value, 0)

        # 現在のカテゴリー合計を取得
        current_total = await self.get_category_balance(user_id, category)

        # 現在のモデル残高を取得
        balance = await self.balance_repo.find_by_user_and_model(user_id, model_id)
        current_model_tokens = balance.allocated_tokens if balance else 0

        # 新しい合計を計算
        # 現在の合計 - 現在のモデル残高 + (現在のモデル残高 + 追加トークン)
        # = 現在の合計 + 追加トークン
        new_total = current_total + additional_tokens

        # 容量制限チェック
        if new_total > limit:
            remaining = limit - (current_total - current_model_tokens)
            raise ValueError(
                f"容量制限を超えています。{category.value}カテゴリーの上限は"
                f"{(limit / 1_000_000):.1f}Mトークンです。"
                f"最大{remaining:,}トークンまで配分できます。"
            )
