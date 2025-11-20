"""
@file consume_tokens_command.py
@summary ConsumeTokensCommand - トークン消費コマンド
@responsibility トークン消費のビジネスロジックを調整
"""

from src.application.billing.dtos import ConsumeTokensRequest, OperationResponse
from src.domain.billing.services import TokenService, TransactionService


class ConsumeTokensCommand:
    """トークン消費コマンド

    LLM使用時にトークンを消費し、消費トランザクションを記録する。

    責務:
    - トークン消費処理の調整
    - 消費トランザクションの記録
    - エラーハンドリング
    """

    def __init__(
        self,
        token_service: TokenService,
        transaction_service: TransactionService,
    ):
        """初期化

        Args:
            token_service: トークン管理サービス
            transaction_service: トランザクション管理サービス
        """
        self.token_service = token_service
        self.transaction_service = transaction_service

    async def execute(
        self, user_id: str, request: ConsumeTokensRequest
    ) -> OperationResponse:
        """トークン消費を実行

        Args:
            user_id: ユーザーID
            request: トークン消費リクエスト

        Returns:
            OperationResponse: 操作結果

        Raises:
            ValueError: トークン残高不足、残高レコードなしの場合
        """
        # トークン消費
        result = await self.token_service.consume_tokens(
            user_id=user_id,
            model_id=request.model_id,
            input_tokens=request.input_tokens,
            output_tokens=request.output_tokens,
        )

        # 消費トランザクション記録
        await self.transaction_service.record_consumption(
            user_id=user_id,
            model_id=request.model_id,
            input_tokens=request.input_tokens,
            output_tokens=request.output_tokens,
        )

        return OperationResponse(
            success=True,
            message=f"Successfully consumed {request.input_tokens + request.output_tokens} tokens",
            data={"remaining_tokens": result["remaining_tokens"]},
        )
