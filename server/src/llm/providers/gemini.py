# @file gemini.py
# @summary Google GeminiのLLMプロバイダーを実装します。
# @responsibility BaseAgentLLMProviderを継承し、GeminiのAPIと通信してチャット応答を生成します。
from pydantic.v1 import SecretStr
from langchain_google_genai import ChatGoogleGenerativeAI
from .base import BaseAgentLLMProvider


class GeminiProvider(BaseAgentLLMProvider):
    """Google GeminiのLLMプロバイダー

    BaseAgentLLMProviderを継承し、Gemini固有のLLMクライアント初期化のみを実装します。
    エージェント設定、チャット処理、コマンド抽出などの共通ロジックは基底クラスで実装されています。
    """

    def _get_provider_name(self) -> str:
        """プロバイダー名を返す

        Returns:
            "gemini"
        """
        return "gemini"

    def _create_llm_client(self, api_key: str, model: str):
        """Gemini用のLLMクライアントを作成する

        Args:
            api_key: Google API Key
            model: 使用するモデル名（デフォルト: gemini-1.5-flash）

        Returns:
            ChatGoogleGenerativeAI: Gemini用のLangchainチャットモデル
        """
        return ChatGoogleGenerativeAI(
            model=model if model.startswith("gemini") else "gemini-1.5-flash",
            google_api_key=SecretStr(api_key),
            temperature=0.7,
            convert_system_message_to_human=True,  # Gemini固有の設定
            client_options=None,
            transport=None,
            additional_headers=None,
            client=None,
            async_client=None,
        )
