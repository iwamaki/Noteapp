# @file chat_service.py
# @summary LLMプロバイダーを管理し、チャット処理を委譲します。
# @responsibility リクエストに応じて適切なLLMプロバイダーを選択し、チャット処理を実行させます。
from typing import Optional
from src.config import settings
from src.models import ChatResponse, ChatContext
from src.llm_providers.base import BaseLLMProvider
from src.llm_providers.openai import OpenAIProvider
from src.llm_providers.gemini import GeminiProvider
from src.logger import logger

class ChatService:
    def __init__(self):
        self.providers = {}
        if settings.openai_api_key:
            self.providers["openai"] = OpenAIProvider(api_key=settings.openai_api_key)
        if settings.gemini_api_key:
            self.providers["gemini"] = GeminiProvider(api_key=settings.gemini_api_key)

    def get_provider(self, provider_name: str, model: str) -> Optional[BaseLLMProvider]:
        """指定されたプロバイダーとモデルに基づいてLLMプロバイダーインスタンスを取得する"""
        if provider_name == "openai" and settings.openai_api_key:
            return OpenAIProvider(api_key=settings.openai_api_key, model=model)
        if provider_name == "gemini" and settings.gemini_api_key:
            return GeminiProvider(api_key=settings.gemini_api_key, model=model)
        return None

    async def process_chat(
        self,
        message: str,
        provider: str,
        model: str,
        context: Optional[ChatContext] = None
    ) -> ChatResponse:
        """チャットメッセージを処理"""
        llm_provider = self.get_provider(provider, model)

        if not llm_provider:
            return ChatResponse(
                message=f"申し訳ありません。現在LLMサービスが利用できません。APIキーを設定してください。",
                provider=provider,
                model=model
            )

        try:
            return await llm_provider.chat(message, context)
        except Exception as e:
            import traceback
            logger.error(f"Error in process_chat: {str(e)}")
            logger.error(traceback.format_exc())
            return ChatResponse(
                message=f"エラーが発生しました: {str(e)}",
                provider=provider,
                model=model
            )