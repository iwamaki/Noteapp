# @file anthropic_provider.py
# @summary AnthropicのLLMプロバイダーを実装します。
# @responsibility BaseAgentLLMProviderを継承し、AnthropicのAPIと通信してチャット応答を生成します。

from langchain_anthropic import ChatAnthropic
from pydantic import SecretStr

from src.core.config import settings

from .base_provider import BaseAgentLLMProvider


class AnthropicProvider(BaseAgentLLMProvider):
    """AnthropicのLLMプロバイダー

    BaseAgentLLMProviderを継承し、Anthropic固有のLLMクライアント初期化のみを実装します。
    エージェント設定、チャット処理、コマンド抽出などの共通ロジックは基底クラスで実装されています。
    """

    def _get_provider_name(self) -> str:
        """プロバイダー名を返す

        Returns:
            "anthropic"
        """
        return "anthropic"

    def _create_llm_client(self, api_key: str, model: str):
        """Anthropic用のLLMクライアントを作成する

        Args:
            api_key: Anthropic API Key
            model: 使用するモデル名（デフォルトは設定ファイルから取得）

        Returns:
            ChatAnthropic: Anthropic用のLangchainチャットモデル
        """
        # モデル名の検証：claudeで始まる場合はそのまま、そうでない場合はデフォルトを使用
        if not model.startswith("claude"):
            model = settings.get_default_model("anthropic")

        return ChatAnthropic(  # type: ignore[call-arg]
            model_name=model,
            api_key=SecretStr(api_key),
            temperature=0.7,
        )
