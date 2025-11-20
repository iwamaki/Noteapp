# @file openai.py
# @summary OpenAIのLLMプロバイダーを実装します。
# @responsibility BaseAgentLLMProviderを継承し、OpenAIのAPIと通信してチャット応答を生成します。
from langchain_openai import ChatOpenAI
from pydantic import SecretStr

from src.core.config import settings

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
            model: 使用するモデル名（デフォルトは設定ファイルから取得）

        Returns:
            ChatOpenAI: OpenAI用のLangchainチャットモデル
        """
        # モデル名の検証：gptで始まる場合はそのまま、o1で始まる場合もそのまま、
        # そうでない場合はデフォルトを使用
        if not (model.startswith("gpt") or model.startswith("o1")):
            model = settings.get_default_model("openai")

        return ChatOpenAI(
            model=model,
            api_key=SecretStr(api_key),
            temperature=0.7,
        )
