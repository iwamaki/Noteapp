"""
@file get_balance_query.py
@summary GetBalanceQuery - 残高取得クエリ
@responsibility ユーザーの残高情報を取得してDTOに変換
"""

from src.application.billing.dtos import BalanceResponse
from src.domain.billing.services import CreditService, TokenService


class GetBalanceQuery:
    """残高取得クエリ

    未配分クレジットとモデル別トークン残高を取得する。

    責務:
    - 残高情報の取得
    - DTOへの変換
    """

    def __init__(
        self,
        credit_service: CreditService,
        token_service: TokenService,
    ):
        """初期化

        Args:
            credit_service: クレジット管理サービス
            token_service: トークン管理サービス
        """
        self.credit_service = credit_service
        self.token_service = token_service

    async def execute(self, user_id: str) -> BalanceResponse:
        """残高を取得

        Args:
            user_id: ユーザーID

        Returns:
            BalanceResponse: 残高レスポンス
        """
        # 未配分クレジット取得
        credits = await self.credit_service.get_balance(user_id)

        # モデル別トークン残高取得
        allocated_tokens = await self.token_service.get_balance(user_id)

        return BalanceResponse(
            credits=credits,
            allocated_tokens=allocated_tokens,
        )
