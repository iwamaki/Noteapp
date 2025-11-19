"""
@file allocate_credits_command.py
@summary AllocateCreditsCommand - クレジット配分コマンド
@responsibility クレジット配分のビジネスロジックを調整
"""

from src.application.billing.dtos import AllocateCreditsRequest, OperationResponse
from src.domain.billing.services import (
    CreditService,
    PricingService,
    TokenService,
    TransactionService,
)


class AllocateCreditsCommand:
    """クレジット配分コマンド

    未配分クレジットを各モデルにトークンとして配分する。
    容量制限チェック、残高チェックを実施し、トランザクションを記録する。

    責務:
    - クレジット配分処理の調整
    - 容量制限・残高チェック
    - 配分トランザクションの記録
    - エラーハンドリング
    """

    def __init__(
        self,
        credit_service: CreditService,
        token_service: TokenService,
        transaction_service: TransactionService,
        pricing_service: PricingService,
    ):
        """初期化

        Args:
            credit_service: クレジット管理サービス
            token_service: トークン管理サービス
            transaction_service: トランザクション管理サービス
            pricing_service: 価格計算サービス
        """
        self.credit_service = credit_service
        self.token_service = token_service
        self.transaction_service = transaction_service
        self.pricing_service = pricing_service

    async def execute(
        self, user_id: str, request: AllocateCreditsRequest
    ) -> OperationResponse:
        """クレジット配分を実行

        Args:
            user_id: ユーザーID
            request: クレジット配分リクエスト

        Returns:
            OperationResponse: 操作結果

        Raises:
            ValueError: クレジット不足、容量制限超過、価格情報なしの場合
        """
        # 合計クレジット計算
        total_credits = sum(item.credits for item in request.allocations)

        # クレジット残高チェック
        has_sufficient = await self.credit_service.check_sufficient_balance(
            user_id=user_id, required_amount=total_credits
        )

        if not has_sufficient:
            current_balance = await self.credit_service.get_balance(user_id)
            raise ValueError(
                f"クレジットが不足しています。必要: {total_credits}P、残高: {current_balance}P"
            )

        # 各モデルに配分
        for allocation_item in request.allocations:
            model_id = allocation_item.model_id
            credits = allocation_item.credits

            # クレジット → トークン変換
            tokens = await self.pricing_service.credits_to_tokens(
                model_id=model_id, credits=credits
            )

            # トークン配分（容量制限チェック含む）
            await self.token_service.allocate_tokens(
                user_id=user_id, model_id=model_id, tokens=tokens
            )

            # 配分トランザクション記録
            await self.transaction_service.record_allocation(
                user_id=user_id,
                model_id=model_id,
                credits=credits,
                tokens_allocated=tokens,
            )

        # クレジット減算
        await self.credit_service.deduct_credits(
            user_id=user_id, credits_amount=total_credits
        )

        return OperationResponse(
            success=True,
            message=f"Successfully allocated {total_credits} credits to {len(request.allocations)} model(s)",
        )
