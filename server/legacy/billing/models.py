# @file models.py
# @summary SQLAlchemyモデル定義 - トークン管理用のデータベーステーブル
# @responsibility データベーススキーマの定義、トークン残高・クレジット・取引履歴・価格情報のモデル化

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class User(Base):
    """ユーザーテーブル

    ユーザー管理テーブル。デバイスID認証とGoogle OAuth2認証に対応。
    """
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.now)

    # Google OAuth2 認証情報
    google_id = Column(String, unique=True, nullable=True, index=True)
    email = Column(String, unique=True, nullable=True, index=True)
    display_name = Column(String, nullable=True)
    profile_picture_url = Column(String, nullable=True)


class TokenBalance(Base):
    """トークン残高テーブル

    モデルごとのトークン残高を管理。
    例: "gemini-2.5-flash" に 100,000 トークン配分済み
    """
    __tablename__ = 'token_balances'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey('users.user_id'), nullable=False, index=True)
    model_id = Column(String, nullable=False, index=True)
    allocated_tokens = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    # 複合ユニークインデックス（user_id + model_id）
    __table_args__ = (
        {'sqlite_autoincrement': True},
    )


class Credit(Base):
    """未配分クレジットテーブル

    購入済みだがまだモデルに配分されていないクレジット（円建て）を管理。
    """
    __tablename__ = 'credits'

    user_id = Column(String, ForeignKey('users.user_id'), primary_key=True)
    credits = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


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


class DeviceAuth(Base):
    """デバイス認証テーブル

    デバイスIDとユーザーIDの紐付けを管理。
    マルチデバイス対応: 1ユーザーが複数のデバイスを持つことが可能。
    """
    __tablename__ = 'device_auth'

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String, unique=True, nullable=False, index=True)  # デバイスの一意識別子（UUID）
    user_id = Column(String, ForeignKey('users.user_id'), nullable=False, index=True)
    device_name = Column(String, nullable=True)  # デバイス名（例: "iPhone 14 Pro"）
    device_type = Column(String, nullable=True)  # デバイスタイプ（"ios", "android"）
    is_active = Column(Boolean, default=True, nullable=False)  # アクティブフラグ（論理削除用）
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    last_login_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)
