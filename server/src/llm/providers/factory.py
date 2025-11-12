"""
LLM Provider Factory

プロバイダーインスタンスとLangChainクライアントの生成を一元管理するファクトリー。
ChatServiceとSummarizationServiceの両方で使用される。

主な機能:
- create_provider(): BaseLLMProviderインスタンスを生成（ChatService用）
- create_llm_client(): LangChainクライアントを直接生成（SummarizationService用）

これにより、プロバイダー追加時の変更箇所を最小化し、
ロジックの重複を防ぐ。
"""
from typing import Optional
from pydantic import SecretStr

from src.core.config import settings
from src.llm.providers.base import BaseLLMProvider
from src.llm.providers.gemini import GeminiProvider
from src.llm.providers.openai import OpenAIProvider

# LangChain imports
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI


class LLMClientFactory:
    """LLMプロバイダーとクライアントの統一ファクトリー"""

    # プロバイダークラスのレジストリ
    _PROVIDER_CLASSES = {
        "gemini": GeminiProvider,
        "openai": OpenAIProvider,
    }

    @classmethod
    def create_provider(
        cls,
        provider_name: str,
        model: str
    ) -> Optional[BaseLLMProvider]:
        """BaseLLMProviderインスタンスを生成（ChatService用）

        Args:
            provider_name: プロバイダー名（"gemini" or "openai"）
            model: モデルID

        Returns:
            BaseLLMProviderインスタンス、またはNone（API keyがない場合）
        """
        provider_class = cls._PROVIDER_CLASSES.get(provider_name)
        if not provider_class:
            return None

        # API keyを取得
        api_key = cls._get_api_key(provider_name)
        if not api_key:
            return None

        return provider_class(api_key=api_key, model=model)

    @classmethod
    def create_llm_client(
        cls,
        provider_name: str,
        model: Optional[str] = None,
        temperature: float = 0.3
    ):
        """LangChainクライアントを直接生成（SummarizationService用）

        Args:
            provider_name: プロバイダー名（"gemini" or "openai"）
            model: モデルID（Noneの場合はデフォルト）
            temperature: 温度パラメータ（デフォルト: 0.3）

        Returns:
            LangChainクライアント（ChatGoogleGenerativeAI or ChatOpenAI）

        Raises:
            ValueError: プロバイダーがサポートされていない、またはAPI keyが未設定
        """
        # API keyを取得
        api_key = cls._get_api_key(provider_name)
        if not api_key:
            raise ValueError(f"{provider_name.capitalize()} API key is not configured")

        # モデル名を決定
        model_name = model or settings.get_default_model(provider_name)

        # プロバイダーごとにクライアントを生成
        if provider_name == "gemini":
            return ChatGoogleGenerativeAI(
                api_key=api_key,
                model=model_name,
                temperature=temperature,
            )
        elif provider_name == "openai":
            return ChatOpenAI(
                api_key=SecretStr(api_key),
                model=model_name,
                temperature=temperature,
            )
        else:
            raise ValueError(
                f"Unsupported provider: {provider_name}. "
                f"Supported providers: {', '.join(cls._PROVIDER_CLASSES.keys())}"
            )

    @classmethod
    def _get_api_key(cls, provider_name: str) -> Optional[str]:
        """プロバイダーのAPI keyを取得

        Args:
            provider_name: プロバイダー名

        Returns:
            API key、または None
        """
        if provider_name == "gemini":
            return settings.gemini_api_key
        elif provider_name == "openai":
            return settings.openai_api_key
        else:
            return None

    @classmethod
    def get_supported_providers(cls) -> list[str]:
        """サポートされているプロバイダーのリストを取得

        Returns:
            プロバイダー名のリスト
        """
        return list(cls._PROVIDER_CLASSES.keys())
