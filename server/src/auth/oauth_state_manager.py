# @file oauth_state_manager.py
# @summary OAuth2 state 管理ユーティリティ
# @responsibility OAuth2 フローの state パラメータを安全に管理

import secrets
import time
from typing import Optional, Dict, Any
from src.core.logger import logger


class OAuthStateManager:
    """
    OAuth2 state パラメータのインメモリ管理

    Note: 本番環境では Redis を使用することを推奨
    """

    def __init__(self, ttl_seconds: int = 300):
        """
        Args:
            ttl_seconds: state の有効期限（秒）デフォルトは5分
        """
        self._states: Dict[str, Dict[str, Any]] = {}
        self._ttl = ttl_seconds

    def generate_state(self, device_id: str) -> str:
        """
        新しい state を生成して保存

        Args:
            device_id: デバイスID

        Returns:
            生成された state 文字列
        """
        # 暗号学的に安全なランダム文字列を生成
        state = secrets.token_urlsafe(32)

        # state とメタデータを保存
        self._states[state] = {
            "device_id": device_id,
            "created_at": time.time(),
            "expires_at": time.time() + self._ttl
        }

        logger.debug(
            f"OAuth state generated: state={state[:10]}..., device_id={device_id[:20]}..."
        )

        # 古い state をクリーンアップ
        self._cleanup_expired()

        return state

    def verify_state(self, state: str) -> Optional[str]:
        """
        state を検証して device_id を返す

        Args:
            state: 検証する state 文字列

        Returns:
            device_id（検証成功時）、None（検証失敗時）
        """
        state_data = self._states.get(state)

        if not state_data:
            logger.warning(f"OAuth state not found: state={state[:10]}...")
            return None

        # 有効期限をチェック
        if time.time() > state_data["expires_at"]:
            logger.warning(f"OAuth state expired: state={state[:10]}...")
            del self._states[state]
            return None

        # state を削除（ワンタイム使用）
        device_id = state_data["device_id"]
        del self._states[state]

        logger.debug(
            f"OAuth state verified: state={state[:10]}..., device_id={device_id[:20]}..."
        )

        return device_id

    def _cleanup_expired(self):
        """期限切れの state を削除"""
        current_time = time.time()
        expired_states = [
            state
            for state, data in self._states.items()
            if data["expires_at"] < current_time
        ]

        for state in expired_states:
            del self._states[state]

        if expired_states:
            logger.debug(f"Cleaned up {len(expired_states)} expired OAuth states")

    def get_stats(self) -> Dict[str, int]:
        """統計情報を取得（デバッグ用）"""
        self._cleanup_expired()
        return {
            "active_states": len(self._states),
            "ttl_seconds": self._ttl
        }


# グローバルインスタンス（開発用）
# 本番環境では Redis を使用することを推奨
_state_manager = OAuthStateManager(ttl_seconds=300)


def get_state_manager() -> OAuthStateManager:
    """OAuth state manager のシングルトンインスタンスを取得"""
    return _state_manager
