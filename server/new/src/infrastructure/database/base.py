"""
@file base.py
@summary SQLAlchemy Base定義
@responsibility ORMモデルの基底クラスを提供
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """SQLAlchemy ORM モデルの基底クラス

    すべてのORMモデルはこのクラスを継承する。
    Declarative Baseはテーブルのメタデータとマッピングを管理する。
    """
    pass
