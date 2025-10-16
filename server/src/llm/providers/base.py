
# @file base.py
# @summary LLMプロバイダーの抽象基底クラスを定義します。
# @responsibility すべてのLLMプロバイダーが実装すべき共通のインターフェース（メソッド、プロパティ）を定義します。
from abc import ABC, abstractmethod
from typing import Optional
from src.llm.models import ChatResponse, ChatContext

class BaseLLMProvider(ABC):
    """LLMプロバイダーの抽象基底クラス"""

    @abstractmethod
    def __init__(self, api_key: str, model: str):
        """コンストラクタ"""
        pass

    @abstractmethod
    async def chat(self, message: str, context: Optional[ChatContext] = None) -> ChatResponse:
        """チャットメッセージを処理し、応答を返す"""
        pass
