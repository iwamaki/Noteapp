"""
@file transaction_service.py
@summary TransactionServiceドメインサービス - トランザクション管理
@responsibility トランザクション記録・履歴管理のビジネスロジック
"""

from typing import Any

from ..entities.transaction import Transaction
from ..repositories.transaction_repository import TransactionRepository


class TransactionService:
    """トランザクション管理ドメインサービス

    トランザクション記録、履歴取得、二重購入防止に関するビジネスロジックを提供する。

    責務:
    - トランザクション記録（購入、配分、消費）
    - 取引履歴取得
    - 二重購入チェック
    """

    def __init__(self, transaction_repo: TransactionRepository):
        """初期化

        Args:
            transaction_repo: トランザクションリポジトリ
        """
        self.transaction_repo = transaction_repo

    async def record_purchase(
        self,
        user_id: str,
        credits: int,
        iap_transaction_id: str,
        purchase_record: dict[str, Any],
    ) -> Transaction:
        """購入トランザクションを記録

        Args:
            user_id: ユーザーID
            credits: 購入したクレジット額
            iap_transaction_id: IAP取引ID
            purchase_record: 購入レコード情報

        Returns:
            Transaction: 保存されたトランザクション

        Raises:
            ValueError: 二重購入検出時
        """
        # 二重購入チェック
        existing = await self.check_duplicate_purchase(iap_transaction_id)
        if existing:
            raise ValueError(
                f"この取引は既に処理されています。Transaction ID: {iap_transaction_id}"
            )

        # 購入トランザクション作成
        transaction = Transaction.create_purchase(
            user_id=user_id,
            credits=credits,
            transaction_id=iap_transaction_id,
            purchase_record=purchase_record,
        )

        # 保存
        saved = await self.transaction_repo.save(transaction)

        return saved

    async def record_allocation(
        self,
        user_id: str,
        model_id: str,
        credits: int,
        tokens_allocated: int,
    ) -> Transaction:
        """配分トランザクションを記録

        Args:
            user_id: ユーザーID
            model_id: 配分先モデルID
            credits: 配分したクレジット額
            tokens_allocated: 配分されたトークン数

        Returns:
            Transaction: 保存されたトランザクション
        """
        transaction = Transaction.create_allocation(
            user_id=user_id,
            model_id=model_id,
            credits=credits,
            tokens_allocated=tokens_allocated,
        )

        saved = await self.transaction_repo.save(transaction)

        return saved

    async def record_consumption(
        self,
        user_id: str,
        model_id: str,
        input_tokens: int,
        output_tokens: int,
    ) -> Transaction:
        """消費トランザクションを記録

        Args:
            user_id: ユーザーID
            model_id: 消費したモデルID
            input_tokens: 入力トークン数
            output_tokens: 出力トークン数

        Returns:
            Transaction: 保存されたトランザクション
        """
        total_tokens = input_tokens + output_tokens

        transaction = Transaction.create_consumption(
            user_id=user_id,
            model_id=model_id,
            total_tokens=total_tokens,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
        )

        saved = await self.transaction_repo.save(transaction)

        return saved

    async def get_transactions(
        self, user_id: str, limit: int = 100
    ) -> list[dict[str, Any]]:
        """取引履歴を取得

        Args:
            user_id: ユーザーID
            limit: 取得する最大件数（デフォルト100）

        Returns:
            List[Dict]: 取引履歴のリスト（新しい順）
        """
        transactions = await self.transaction_repo.find_by_user(user_id, limit)

        return [t.to_dict() for t in transactions]

    async def check_duplicate_purchase(
        self, iap_transaction_id: str
    ) -> Transaction | None:
        """二重購入をチェック

        Args:
            iap_transaction_id: IAP取引ID

        Returns:
            Optional[Transaction]: 既存のトランザクション、なければNone
        """
        existing = await self.transaction_repo.find_by_iap_transaction_id(
            iap_transaction_id
        )

        return existing

    async def reset_all_transactions(self, user_id: str) -> dict[str, Any]:
        """全トランザクション履歴をリセット（デバッグ用）

        Args:
            user_id: ユーザーID

        Returns:
            Dict[str, Any]: {"success": True, "message": str}
        """
        await self.transaction_repo.delete_all_by_user(user_id)

        return {"success": True, "message": "All transactions reset successfully"}
