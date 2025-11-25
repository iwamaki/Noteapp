# @file gemini_provider.py
# @summary Google GeminiのLLMプロバイダーを実装します。
# @responsibility BaseAgentLLMProviderを継承し、GeminiのAPIと通信してチャット応答を生成します。

from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import SecretStr

from src.core.config import settings

from ...infrastructure.token_counting import get_token_counter_factory
from .base_provider import BaseAgentLLMProvider


class GeminiProvider(BaseAgentLLMProvider):
    """Google GeminiのLLMプロバイダー

    BaseAgentLLMProviderを継承し、Gemini固有のLLMクライアント初期化のみを実装します。
    エージェント設定、チャット処理、コマンド抽出などの共通ロジックは基底クラスで実装されています。
    """

    def __init__(self, api_key: str, model: str):
        """コンストラクタ

        Args:
            api_key: Google API Key
            model: 使用するモデル名
        """
        # TokenCounterFactoryを使ってtoken_counterを生成
        factory = get_token_counter_factory()
        token_counter = factory.create_token_counter(
            provider="gemini",
            api_key=api_key,
            model=model
        )

        # 親クラスのコンストラクタを呼び出し
        super().__init__(api_key, model, token_counter)

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
        from src.core.logger import logger

        # モデル名の検証：geminiで始まる場合はそのまま、そうでない場合はデフォルトを使用
        if not model.startswith("gemini"):
            model = settings.get_default_model("gemini")

        logger.info(
            f"Creating LLM client for model: {model}",
            extra={"category": "llm", "provider": "gemini"}
        )

        return ChatGoogleGenerativeAI(
            model=model,
            google_api_key=SecretStr(api_key),
            temperature=0.7,
            # Note: convert_system_message_to_humanは非推奨のため削除
            # システムメッセージは base_provider.py で適切に処理される
        )
