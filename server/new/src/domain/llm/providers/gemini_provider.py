# @file gemini.py
# @summary Google GeminiのLLMプロバイダーを実装します。
# @responsibility BaseAgentLLMProviderを継承し、GeminiのAPIと通信してチャット応答を生成します。
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import SecretStr

from src.core.config import settings

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
            model: 使用するモデル名（デフォルトは設定ファイルから取得）

        Returns:
            ChatGoogleGenerativeAI: Gemini用のLangchainチャットモデル
        """
        # モデル名の検証：geminiで始まる場合はそのまま、そうでない場合はデフォルトを使用
        if not model.startswith("gemini"):
            model = settings.get_default_model("gemini")

        return ChatGoogleGenerativeAI(
            model=model,
            google_api_key=SecretStr(api_key),
            temperature=0.7,
            # Note: convert_system_message_to_humanは非推奨のため削除
            # システムメッセージは base.py で適切に処理される
            client_options=None,
            transport=None,
            additional_headers=None,
            client=None,
            async_client=None,
        )
