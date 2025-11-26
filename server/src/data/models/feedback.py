# @file feedback.py
# @summary ユーザーフィードバックモデル
# @responsibility フロントエンドから送信されたフィードバックを保存

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text

from .base import Base


class Feedback(Base):
    """ユーザーフィードバックテーブル

    ユーザーからのフィードバック（バグ報告、機能要望等）を保存。
    プロダクト改善に活用。
    """
    __tablename__ = 'feedbacks'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey('users.user_id'), nullable=False, index=True)
    category = Column(String, nullable=False, index=True)  # 'bug', 'feature', 'improvement', 'other'
    content = Column(Text, nullable=False)
    rating = Column(Integer, nullable=True)  # 1-5の満足度（任意）
    app_version = Column(String, nullable=True)
    platform = Column(String, nullable=True)  # 'ios', 'android'
    device_id = Column(String, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.now, nullable=False, index=True)
