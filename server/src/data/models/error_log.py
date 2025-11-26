# @file error_log.py
# @summary クライアントエラーログモデル
# @responsibility フロントエンドから送信されたエラーログを保存

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text

from .base import Base


class ErrorLog(Base):
    """クライアントエラーログテーブル

    フロントエンドで発生したエラーをユーザーと紐付けて保存。
    ユーザー対応やデバッグに活用。
    """
    __tablename__ = 'error_logs'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey('users.user_id'), nullable=False, index=True)
    device_id = Column(String, nullable=True, index=True)
    level = Column(String, nullable=False)  # 'error', 'warn'
    category = Column(String, nullable=False, index=True)  # ログカテゴリ
    message = Column(Text, nullable=False)
    stack_trace = Column(Text, nullable=True)  # スタックトレース
    additional_data = Column(Text, nullable=True)  # JSON形式の追加情報
    app_version = Column(String, nullable=True)
    platform = Column(String, nullable=True)  # 'ios', 'android'
    created_at = Column(DateTime, default=datetime.now, nullable=False, index=True)
