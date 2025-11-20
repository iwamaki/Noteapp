"""
@file get_transactions_query.py
@summary GetTransactionsQuery - 取引履歴取得クエリ
@responsibility ユーザーの取引履歴を取得してDTOに変換
"""

from src.application.billing.dtos.responses import TransactionItem, TransactionResponse
from src.domain.billing.services import TransactionService


class GetTransactionsQuery:
    """取引履歴取得クエリ

    ユーザーの取引履歴を取得する。

    責務:
    - 取引履歴の取得
    - DTOへの変換
    """

    def __init__(self, transaction_service: TransactionService):
        """初期化

        Args:
            transaction_service: トランザクション管理サービス
        """
        self.transaction_service = transaction_service

    async def execute(self, user_id: str, limit: int = 100) -> TransactionResponse:
        """取引履歴を取得

        Args:
            user_id: ユーザーID
            limit: 取得する最大件数（デフォルト100）

        Returns:
            TransactionResponse: 取引履歴レスポンス
        """
        # 取引履歴取得
        transactions_data = await self.transaction_service.get_transactions(
            user_id=user_id, limit=limit
        )

        # DTOに変換
        transaction_items = [
            TransactionItem(
                id=t["id"],
                type=t["type"],
                amount=t["amount"],
                model_id=t.get("model_id"),
                created_at=t["created_at"],
            )
            for t in transactions_data
        ]

        return TransactionResponse(transactions=transaction_items)
