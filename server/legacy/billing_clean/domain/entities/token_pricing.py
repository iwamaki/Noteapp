# @file token_pricing.py
# @summary トークン価格エンティティ
# @responsibility モデルごとの販売価格を管理

from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String

from .base import Base


class TokenPricing(Base):
    """トークン価格マスターテーブル

    モデルごとの販売価格（円/Mトークン）を管理。
    価格変更はこのテーブルを更新するだけで反映される。
    """
    __tablename__ = 'token_pricing'

    model_id = Column(String, primary_key=True)
    price_per_m_token = Column(Integer, nullable=False)  # 円/Mトークン
    category = Column(String, nullable=False)  # 'quick' or 'think'
    exchange_rate = Column(Integer)  # 為替レート（参考値）
    margin_percent = Column(Integer)  # マージン率（参考値）
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
