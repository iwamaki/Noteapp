"""
@file client.py
@summary Secret Managerクライアント（infrastructure/config/secrets.pyのエイリアス）
@responsibility Secret Manager機能への統一インターフェース

Note:
    実際の実装は infrastructure/config/secrets.py にあります。
    このファイルは infrastructure/external/ 配下に統一的なインターフェースを
    提供するためのエイリアスです。
"""

from infrastructure.config.secrets import (
    SecretManagerClient,
    get_secret_manager,
    init_secret_manager,
)

__all__ = [
    "SecretManagerClient",
    "init_secret_manager",
    "get_secret_manager",
]
