"""
LLM Domain - Repositories Package

LLMドメインのリポジトリインターフェースを定義するパッケージ
"""

from src.domain.llm.repositories.conversation_repository import ConversationRepository

__all__ = [
    "ConversationRepository",
]
