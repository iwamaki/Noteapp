# @file token_validator.py
# @summary トークン残高の検証ロジックを集約
# @responsibility 残高チェック、残高検証の単一責任を持つクラス

from sqlalchemy.orm import Session

from src.core.logger import logger

from .billing_service import BillingService


class TokenBalanceValidator:
    """トークン残高の検証を行うクラス

    残高チェックのロジックを一箇所に集約し、
    チャット、要約、その他のLLM機能で再利用可能にします。
    """

    def __init__(self, db: Session, user_id: str):
        """初期化

        Args:
            db: SQLAlchemyセッション
            user_id: ユーザーID
        """
        self.db = db
        self.user_id = user_id
        self.service = BillingService(db, user_id)

    def check_sufficient_balance(self, model_id: str, tokens_needed: int) -> bool:
        """残高が十分かどうかをチェック

        Args:
            model_id: モデルID（例: "gemini-2.5-flash"）
            tokens_needed: 必要なトークン数

        Returns:
            bool: 残高が十分ならTrue、不足していればFalse
        """
        balance = self.service.get_balance()
        available_tokens: int = balance["allocated_tokens"].get(model_id, 0)

        logger.debug(
            f"[TokenBalanceValidator] Balance check: "
            f"user={self.user_id}, model={model_id}, "
            f"available={available_tokens}, needed={tokens_needed}"
        )

        return bool(available_tokens >= tokens_needed)

    def get_available_tokens(self, model_id: str) -> int:
        """指定モデルの利用可能トークン数を取得

        Args:
            model_id: モデルID

        Returns:
            int: 利用可能なトークン数
        """
        balance = self.service.get_balance()
        tokens: int = balance["allocated_tokens"].get(model_id, 0)
        return tokens

    def validate_and_raise(self, model_id: str, tokens_needed: int) -> None:
        """残高チェックを行い、不足していれば例外を発生させる

        Args:
            model_id: モデルID
            tokens_needed: 必要なトークン数

        Raises:
            ValueError: トークン残高が不足している場合
        """
        balance = self.service.get_balance()
        available_tokens = balance["allocated_tokens"].get(model_id, 0)

        logger.info(
            f"[TokenBalanceValidator] Validating balance: "
            f"user={self.user_id}, model={model_id}, "
            f"available={available_tokens}, needed={tokens_needed}"
        )

        if available_tokens < tokens_needed:
            shortage = tokens_needed - available_tokens
            error_msg = (
                f"トークン残高が不足しています。\n"
                f"必要: 約{tokens_needed:,}トークン\n"
                f"残高: {available_tokens:,}トークン\n"
                f"不足: 約{shortage:,}トークン\n\n"
                f"トークンを購入してください。"
            )
            logger.warning(
                f"[TokenBalanceValidator] Insufficient balance: "
                f"user={self.user_id}, model={model_id}, shortage={shortage}"
            )
            raise ValueError(error_msg)

        logger.info(
            f"[TokenBalanceValidator] Balance check passed: "
            f"user={self.user_id}, model={model_id}"
        )

    def verify_balance_exists(self, model_id: str) -> bool:
        """指定モデルの残高レコードが存在するかチェック

        Args:
            model_id: モデルID

        Returns:
            bool: 残高レコードが存在すればTrue
        """
        balance = self.service.get_balance()
        return model_id in balance["allocated_tokens"]
