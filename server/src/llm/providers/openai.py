# @file openai.py
# @summary OpenAIのLLMプロバイダーを実装します。
# @responsibility BaseAgentLLMProviderを継承し、OpenAIのAPIと通信してチャット応答を生成します。
from pydantic import SecretStr
from langchain_openai import ChatOpenAI
from .base import BaseAgentLLMProvider


class OpenAIProvider(BaseAgentLLMProvider):
    """OpenAIのLLMプロバイダー

    BaseAgentLLMProviderを継承し、OpenAI固有のLLMクライアント初期化のみを実装します。
    エージェント設定、チャット処理、コマンド抽出などの共通ロジックは基底クラスで実装されています。
    """

    def _get_provider_name(self) -> str:
        """プロバイダー名を返す

        Returns:
            "openai"
        """
        return "openai"

    def _create_llm_client(self, api_key: str, model: str):
        """OpenAI用のLLMクライアントを作成する

        Args:
            api_key: OpenAI API Key
            model: 使用するモデル名（例: gpt-3.5-turbo, gpt-4）

        Returns:
            ChatOpenAI: OpenAI用のLangchainチャットモデル
        """
        return ChatOpenAI(
            api_key=SecretStr(api_key),
            model=model,
            temperature=0.7
        )
