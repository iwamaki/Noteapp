# @file billing_service.py
# @summary ビジネスロジック層 - トークン管理の中核
# @responsibility トークン残高管理、クレジット配分、消費処理、取引履歴管理

import json
from datetime import datetime

from sqlalchemy.orm import Session

from src.core.logger import logger

from ...domain.entities import Credit, TokenBalance, TokenPricing, Transaction
from ...infrastructure.config.constants import TOKEN_CAPACITY_LIMITS


class BillingService:
    """Billingサービスクラス

    トークン管理に関するすべてのビジネスロジックを実装。
    データベース操作はこのクラスを通じて行われる。
    """

    def __init__(self, db: Session, user_id: str):
        """初期化

        Args:
            db: SQLAlchemyセッション
            user_id: ユーザーID（認証済み）
        """
        self.db = db
        self.user_id = user_id

    # =====================================
    # トークン残高管理
    # =====================================

    def get_balance(self) -> dict:
        """トークン残高取得

        未配分クレジットと、各モデルに配分済みのトークン数を取得。

        Returns:
            Dict: {
                "credits": int,  # 未配分クレジット（円）
                "allocated_tokens": {"model_id": tokens, ...}
            }
        """
        # 未配分クレジット取得
        credit = self.db.query(Credit).filter_by(user_id=self.user_id).first()

        # モデル別トークン残高取得
        balances = self.db.query(TokenBalance).filter_by(user_id=self.user_id).all()
        allocated_tokens = {b.model_id: b.allocated_tokens for b in balances}

        logger.debug(f"[BillingService] Balance fetched for {self.user_id}: "
                    f"credits={credit.credits if credit else 0}, "
                    f"allocated_tokens={allocated_tokens}")

        return {
            "credits": credit.credits if credit else 0,
            "allocated_tokens": allocated_tokens
        }

    def get_category_balance(self, category: str) -> int:
        """カテゴリー別トークン合計取得

        指定されたカテゴリー（quick/think）に属する全モデルのトークン合計。

        Args:
            category: カテゴリー名（'quick' または 'think'）

        Returns:
            int: カテゴリー内の全トークン合計
        """
        return self._get_total_tokens_by_category(category)

    # =====================================
    # クレジット管理
    # =====================================

    def add_credits(self, credits: int, purchase_record: dict) -> dict:
        """クレジット追加（購入時）

        アプリ内課金完了後に呼び出される。
        未配分クレジットに追加し、取引履歴に記録。

        Args:
            credits: 追加するクレジット額（円）
            purchase_record: 購入レコード情報（IAP情報）

        Returns:
            Dict: {"success": True, "new_balance": int}
        """
        logger.info(f"[BillingService] Adding {credits} credits for {self.user_id}")

        # クレジットレコード取得または作成
        credit = self.db.query(Credit).filter_by(user_id=self.user_id).first()

        if not credit:
            credit = Credit(user_id=self.user_id, credits=credits)
            self.db.add(credit)
        else:
            current_credits = credit.credits or 0
            credit.credits = current_credits + credits

        # 取引履歴を記録
        transaction = Transaction(
            user_id=self.user_id,
            type='purchase',
            amount=credits,
            transaction_id=purchase_record.get('transactionId'),
            transaction_metadata=json.dumps(purchase_record),
            created_at=datetime.now()
        )
        self.db.add(transaction)

        try:
            self.db.commit()
            logger.info(f"[BillingService] Credits added successfully. New balance: {credit.credits}")
            return {"success": True, "new_balance": credit.credits}
        except Exception as e:
            self.db.rollback()
            logger.error(f"[BillingService] Failed to add credits: {e}")
            raise

    def allocate_credits(self, allocations: list[dict]) -> dict:
        """クレジット配分

        未配分クレジットを各モデルにトークンとして配分。
        容量制限チェックとクレジット残高チェックを実施。

        Args:
            allocations: [{"model_id": str, "credits": int}, ...]

        Returns:
            Dict: {"success": True}

        Raises:
            ValueError: クレジット不足、容量制限超過、価格情報なしの場合
        """
        logger.info(f"[BillingService] Allocating credits: {allocations}")

        credit = self.db.query(Credit).filter_by(user_id=self.user_id).first()

        if not credit:
            raise ValueError("クレジットレコードが見つかりません")

        total_credits = sum(a['credits'] for a in allocations)

        # クレジット残高チェック
        if credit.credits < total_credits:
            raise ValueError(
                f"クレジットが不足しています。必要: {total_credits}P、残高: {credit.credits}P"
            )

        # 容量制限チェック + 配分実行
        for allocation in allocations:
            model_id = allocation['model_id']
            credits_to_allocate = allocation['credits']

            # 価格情報取得
            pricing = self.db.query(TokenPricing).filter_by(model_id=model_id).first()
            if not pricing:
                raise ValueError(f"モデル {model_id} の価格情報が見つかりません")

            # クレジット→トークン変換
            tokens = int((credits_to_allocate / pricing.price_per_m_token) * 1_000_000)

            # 容量制限チェック
            category = pricing.category
            if not category:
                raise ValueError(f"モデル {model_id} のカテゴリー情報が見つかりません")
            limit = TOKEN_CAPACITY_LIMITS[category]
            current_total = self._get_total_tokens_by_category(category)

            balance = self.db.query(TokenBalance).filter_by(
                user_id=self.user_id, model_id=model_id
            ).first()
            current_model_tokens = (balance.allocated_tokens or 0) if balance else 0

            new_total = current_total - current_model_tokens + (current_model_tokens + tokens)

            if new_total > limit:
                remaining = limit - (current_total - current_model_tokens)
                max_credits = int((remaining / 1_000_000) * (pricing.price_per_m_token or 0))
                raise ValueError(
                    f"容量制限を超えています。{category}カテゴリーの上限は"
                    f"{(limit / 1_000_000):.1f}Mトークンです。最大{max_credits}Pまで配分できます。"
                )

            # トークン配分
            if not balance:
                balance = TokenBalance(
                    user_id=self.user_id,
                    model_id=model_id,
                    allocated_tokens=tokens
                )
                self.db.add(balance)
            else:
                current_allocated = balance.allocated_tokens or 0
                balance.allocated_tokens = current_allocated + tokens

            # 取引履歴
            transaction = Transaction(
                user_id=self.user_id,
                type='allocation',
                amount=credits_to_allocate,
                model_id=model_id,
                transaction_metadata=json.dumps({"tokens_allocated": tokens}),
                created_at=datetime.now()
            )
            self.db.add(transaction)

            logger.info(f"[BillingService] Allocated {credits_to_allocate}P "
                       f"({tokens} tokens) to {model_id}")

        # クレジット減算
        credit.credits -= total_credits

        try:
            self.db.commit()
            logger.info(f"[BillingService] Credits allocated successfully. "
                       f"Remaining credits: {credit.credits}")
            return {"success": True}
        except Exception as e:
            self.db.rollback()
            logger.error(f"[BillingService] Failed to allocate credits: {e}")
            raise

    # =====================================
    # トークン消費
    # =====================================

    def consume_tokens(self, model_id: str, input_tokens: int, output_tokens: int) -> dict:
        """トークン消費

        LLM使用時に呼び出される。
        指定されたモデルのトークン残高から消費し、取引履歴に記録。

        Args:
            model_id: 消費対象モデルID
            input_tokens: 入力トークン数
            output_tokens: 出力トークン数

        Returns:
            Dict: {"success": True, "remaining_tokens": int}

        Raises:
            ValueError: トークン残高不足、残高レコードなしの場合
        """
        total_tokens = input_tokens + output_tokens

        logger.info(f"[BillingService] Consuming {total_tokens} tokens from {model_id} "
                   f"(input={input_tokens}, output={output_tokens})")

        balance = self.db.query(TokenBalance).filter_by(
            user_id=self.user_id, model_id=model_id
        ).first()

        if not balance:
            raise ValueError(f"モデル {model_id} のトークン残高がありません")

        current_allocated = balance.allocated_tokens or 0
        if current_allocated < total_tokens:
            raise ValueError(
                f"トークンが不足しています。必要: {total_tokens}、残高: {current_allocated}"
            )

        balance.allocated_tokens = current_allocated - total_tokens

        # 取引履歴
        transaction = Transaction(
            user_id=self.user_id,
            type='consumption',
            amount=total_tokens,
            model_id=model_id,
            transaction_metadata=json.dumps({
                "input_tokens": input_tokens,
                "output_tokens": output_tokens
            }),
            created_at=datetime.now()
        )
        self.db.add(transaction)

        try:
            self.db.commit()
            logger.info(f"[BillingService] Tokens consumed successfully. "
                       f"Remaining: {balance.allocated_tokens}")
            return {"success": True, "remaining_tokens": balance.allocated_tokens}
        except Exception as e:
            self.db.rollback()
            logger.error(f"[BillingService] Failed to consume tokens: {e}")
            raise

    # =====================================
    # 取引履歴・価格情報
    # =====================================

    def get_transactions(self, limit: int = 100) -> list[dict]:
        """取引履歴取得

        最新の取引履歴を取得（デフォルト100件）。

        Args:
            limit: 取得する履歴の最大件数

        Returns:
            List[Dict]: 取引履歴のリスト
        """
        transactions = self.db.query(Transaction).filter_by(
            user_id=self.user_id
        ).order_by(Transaction.created_at.desc()).limit(limit).all()

        return [
            {
                "id": t.id,
                "type": t.type,
                "amount": t.amount,
                "model_id": t.model_id,
                "created_at": t.created_at.isoformat() if t.created_at else ""
            }
            for t in transactions
        ]

    def get_pricing(self) -> dict[str, dict]:
        """価格情報取得

        全モデルの価格情報を取得。

        Returns:
            Dict: {model_id: {"price_per_m_token": int, "category": str}, ...}
        """
        pricings = self.db.query(TokenPricing).all()
        return {
            p.model_id: {
                "price_per_m_token": p.price_per_m_token,
                "category": p.category
            }
            for p in pricings
            if p.model_id is not None
        }

    # =====================================
    # 内部ヘルパーメソッド
    # =====================================

    def _get_total_tokens_by_category(self, category: str) -> int:
        """カテゴリー別トークン合計取得（内部用）

        Args:
            category: カテゴリー名（'quick' または 'think'）

        Returns:
            int: カテゴリー内の全トークン合計
        """
        # 該当カテゴリーのモデルIDを取得
        pricings = self.db.query(TokenPricing).filter_by(category=category).all()
        model_ids = [p.model_id for p in pricings]

        if not model_ids:
            return 0

        # トークン残高の合計
        balances = self.db.query(TokenBalance).filter(
            TokenBalance.user_id == self.user_id,
            TokenBalance.model_id.in_(model_ids)
        ).all()

        total = sum(b.allocated_tokens or 0 for b in balances)
        logger.debug(f"[BillingService] Category '{category}' total tokens: {total}")
        return total

    # =====================================
    # デバッグ・リセット機能
    # =====================================

    def reset_all_data(self) -> dict:
        """全データリセット（デバッグ用）

        クレジット残高、トークン残高、取引履歴をすべてリセット。
        開発・テスト環境でのみ使用を想定。

        Returns:
            Dict: {"success": True, "message": "All data reset successfully"}
        """
        try:
            # クレジット残高をリセット
            credit = self.db.query(Credit).filter_by(user_id=self.user_id).first()
            if credit:
                credit.credits = 0

            # トークン残高をすべて削除
            self.db.query(TokenBalance).filter_by(user_id=self.user_id).delete()

            # 取引履歴をすべて削除
            self.db.query(Transaction).filter_by(user_id=self.user_id).delete()

            self.db.commit()
            logger.info(f"[BillingService] All data reset for user {self.user_id}")

            return {
                "success": True,
                "message": "All data reset successfully"
            }
        except Exception as e:
            self.db.rollback()
            logger.error(f"[BillingService] Failed to reset data: {e}")
            raise ValueError(f"データリセットに失敗しました: {str(e)}") from e
