# @file anonymous_feedback.py
# @summary 匿名フィードバックモデル
# @responsibility ログイン不要のフィードバックを保存

from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Text

from .base import Base


class AnonymousFeedback(Base):
    """匿名フィードバックテーブル

    ログインなしで送信されるフィードバック（バグ報告、機能要望等）を保存。
    LLM機能オフ時のストア審査用ビルドでも利用可能。
    """
    __tablename__ = 'anonymous_feedbacks'

    id = Column(Integer, primary_key=True, autoincrement=True)
    category = Column(String, nullable=False, index=True)  # 'bug', 'feature', 'improvement', 'other'
    content = Column(Text, nullable=False)
    rating = Column(Integer, nullable=True)  # 1-5の満足度（任意）
    app_version = Column(String, nullable=True)
    platform = Column(String, nullable=True)  # 'ios', 'android'
    device_id = Column(String, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.now, nullable=False, index=True)
