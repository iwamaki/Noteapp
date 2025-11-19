"""
@file credit_service.py
@summary CreditServiceドメインサービス - クレジット管理
@responsibility クレジット購入・追加・減算のビジネスロジック
"""

from typing import Any

from ..entities.credit import Credit
from ..repositories.credit_repository import CreditRepository


class CreditService:
    """クレジット管理ドメインサービス

    クレジットの購入、追加、減算に関するビジネスロジックを提供する。

    責務:
    - クレジット追加（購入時）
    - クレジット減算（配分時）
    - 残高チェック
    """

    def __init__(self, credit_repo: CreditRepository):
        """初期化

        Args:
            credit_repo: クレジットリポジトリ
        """
        self.credit_repo = credit_repo

    async def get_balance(self, user_id: str) -> int:
        """未配分クレジット残高を取得

        Args:
            user_id: ユーザーID

        Returns:
            int: クレジット残高（存在しない場合は0）
        """
        credit = await self.credit_repo.find_by_user(user_id)
        return credit.credits if credit else 0

    async def add_credits(
        self, user_id: str, credits_amount: int
    ) -> dict[str, Any]:
        """クレジットを追加（購入時）

        Args:
            user_id: ユーザーID
            credits_amount: 追加するクレジット額

        Returns:
            Dict[str, Any]: {"success": True, "new_balance": int}

        Raises:
            ValueError: credits_amount が負の場合
        """
        if credits_amount <= 0:
            raise ValueError(f"credits_amount must be positive, got {credits_amount}")

        # クレジットレコード取得または作成
        credit = await self.credit_repo.find_by_user(user_id)

        if credit:
            # 既存レコードに追加
            updated_credit = credit.add_credits(credits_amount)
        else:
            # 新規レコード作成
            updated_credit = Credit(user_id=user_id, credits=credits_amount)

        # 保存
        saved_credit = await self.credit_repo.save(updated_credit)

        return {"success": True, "new_balance": saved_credit.credits}

    async def deduct_credits(
        self, user_id: str, credits_amount: int
    ) -> dict[str, Any]:
        """クレジットを減算（配分時）

        Args:
            user_id: ユーザーID
            credits_amount: 減算するクレジット額

        Returns:
            Dict[str, Any]: {"success": True, "remaining_balance": int}

        Raises:
            ValueError: クレジット不足、またはクレジットレコードが存在しない場合
        """
        if credits_amount <= 0:
            raise ValueError(f"credits_amount must be positive, got {credits_amount}")

        # クレジットレコード取得
        credit = await self.credit_repo.find_by_user(user_id)

        if not credit:
            raise ValueError("クレジットレコードが見つかりません")

        # 残高チェック
        if not credit.has_sufficient_credits(credits_amount):
            raise ValueError(
                f"クレジットが不足しています。必要: {credits_amount}P、残高: {credit.credits}P"
            )

        # 減算
        updated_credit = credit.deduct_credits(credits_amount)

        # 保存
        saved_credit = await self.credit_repo.save(updated_credit)

        return {"success": True, "remaining_balance": saved_credit.credits}

    async def check_sufficient_balance(
        self, user_id: str, required_amount: int
    ) -> bool:
        """十分なクレジット残高があるかチェック

        Args:
            user_id: ユーザーID
            required_amount: 必要なクレジット額

        Returns:
            bool: 十分な残高がある場合True
        """
        credit = await self.credit_repo.find_by_user(user_id)

        if not credit:
            return False

        return credit.has_sufficient_credits(required_amount)

    async def reset_credits(self, user_id: str) -> dict[str, Any]:
        """クレジットをリセット（デバッグ用）

        Args:
            user_id: ユーザーID

        Returns:
            Dict[str, Any]: {"success": True, "message": str}
        """
        credit = await self.credit_repo.find_by_user(user_id)

        if credit:
            reset_credit = credit.reset()
            await self.credit_repo.save(reset_credit)

        return {"success": True, "message": "Credits reset successfully"}
