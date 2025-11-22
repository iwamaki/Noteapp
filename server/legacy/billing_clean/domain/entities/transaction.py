# @file transaction.py
# @summary 取引履歴エンティティ
# @responsibility すべてのトークン関連取引を記録

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text

from .base import Base


class Transaction(Base):
    """取引履歴テーブル

    すべてのトークン関連取引を記録：
    - purchase: クレジット購入
    - allocation: クレジット→トークン配分
    - consumption: トークン消費
    """
    __tablename__ = 'transactions'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey('users.user_id'), nullable=False, index=True)
    type = Column(String, nullable=False)  # 'purchase', 'allocation', 'consumption'
    amount = Column(Integer, nullable=False)  # クレジット額 or トークン数
    model_id = Column(String)  # 対象モデル（allocation/consumptionの場合）
    transaction_id = Column(String)  # IAPトランザクションID（purchaseの場合）
    transaction_metadata = Column(Text)  # JSON形式の追加情報（metadataは予約語のため変更）
    created_at = Column(DateTime, default=datetime.now, index=True)
