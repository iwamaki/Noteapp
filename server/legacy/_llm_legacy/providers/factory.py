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

# LangChain imports
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from pydantic import SecretStr
from src.llm.providers.base import BaseLLMProvider
from src.llm.providers.registry import _get_registry, get_provider_config

from src.core.config import settings


class LLMClientFactory:
    """LLMプロバイダーとクライアントの統一ファクトリー"""

    @classmethod
    def create_provider(
        cls,
        provider_name: str,
        model: str
    ) -> BaseLLMProvider | None:
        """BaseLLMProviderインスタンスを生成（ChatService用）

        Args:
            provider_name: プロバイダー名（"gemini" or "openai"）
            model: モデルID

        Returns:
            BaseLLMProviderインスタンス、またはNone（API keyがない場合）
        """
        config = get_provider_config(provider_name)
        if not config:
            return None

        # API keyを取得
        api_key = cls._get_api_key(provider_name)
        if not api_key:
            return None

        return config.provider_class(api_key=api_key, model=model)

    @classmethod
    def create_llm_client(
        cls,
        provider_name: str,
        model: str | None = None,
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
        config = get_provider_config(provider_name)
        if not config:
            supported = ', '.join(_get_registry().keys())
            raise ValueError(
                f"Unsupported provider: {provider_name}. "
                f"Supported providers: {supported}"
            )

        # API keyを取得
        api_key = cls._get_api_key(provider_name)
        if not api_key:
            raise ValueError(f"{provider_name.capitalize()} API key is not configured")

        # モデル名を決定
        model_name = model or config.default_model

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
            # この分岐には到達しないはずだが、念のため
            raise ValueError(f"Unsupported provider: {provider_name}")

    @classmethod
    def _get_api_key(cls, provider_name: str) -> str | None:
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
        return list(_get_registry().keys())
