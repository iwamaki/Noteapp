"""
@file add_credits_command.py
@summary AddCreditsCommand - クレジット追加コマンド
@responsibility クレジット購入時のビジネスロジックを調整
"""

from src.application.billing.dtos import AddCreditsRequest, OperationResponse
from src.domain.billing.services import CreditService, TransactionService


class AddCreditsCommand:
    """クレジット追加コマンド

    アプリ内課金完了後にクレジットを追加し、購入トランザクションを記録する。

    責務:
    - クレジット追加処理の調整
    - 購入トランザクションの記録
    - エラーハンドリング
    """

    def __init__(
        self,
        credit_service: CreditService,
        transaction_service: TransactionService,
    ):
        """初期化

        Args:
            credit_service: クレジット管理サービス
            transaction_service: トランザクション管理サービス
        """
        self.credit_service = credit_service
        self.transaction_service = transaction_service

    async def execute(
        self, user_id: str, request: AddCreditsRequest
    ) -> OperationResponse:
        """クレジット追加を実行

        Args:
            user_id: ユーザーID
            request: クレジット追加リクエスト

        Returns:
            OperationResponse: 操作結果

        Raises:
            ValueError: 二重購入検出時
        """
        # IAP取引IDを取得
        iap_transaction_id = request.purchase_record.get("transactionId")
        if not iap_transaction_id or not isinstance(iap_transaction_id, str):
            raise ValueError("transactionId is required in purchase_record and must be a string")

        # 購入トランザクション記録（二重購入チェック含む）
        await self.transaction_service.record_purchase(
            user_id=user_id,
            credits=request.credits,
            iap_transaction_id=iap_transaction_id,
            purchase_record=request.purchase_record,
        )

        # クレジット追加
        result = await self.credit_service.add_credits(
            user_id=user_id, credits_amount=request.credits
        )

        return OperationResponse(
            success=True,
            message=f"Successfully added {request.credits} credits",
            data={"new_balance": result["new_balance"]},
        )
