"""Alembic環境設定

このモジュールはAlembicマイグレーションの実行環境を設定します。
"""

import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

# プロジェクトルートをPythonパスに追加
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.data import Base

# Alembicの設定オブジェクト
config = context.config

# Pythonロギング設定
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# アプリケーション設定からデータベースURLを取得
from src.data.config import get_database_settings  # noqa: E402

settings = get_database_settings()

# alembic.iniのsqlalchemy.urlを上書き
config.set_main_option("sqlalchemy.url", settings.database_url)

# メタデータの設定
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """オフラインモードでマイグレーションを実行

    データベースに接続せずにSQLスクリプトを生成します。
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """オンラインモードでマイグレーションを実行

    データベースに接続してマイグレーションを適用します。
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
