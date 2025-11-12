# @file chat_service.py
# @summary LLMプロバイダーを管理し、チャット処理を委譲します
# @responsibility 各種LLMプロバイダーを使用してチャット処理を実行します。
from typing import Optional
from src.llm.models import ChatResponse, ChatContext
from src.llm.providers.base import BaseLLMProvider
from src.llm.providers.factory import LLMClientFactory
from src.llm.tools.context_manager import set_client_id
from src.core.logger import logger

class ChatService:
    def __init__(self):
        # プロバイダーインスタンスは get_provider() で動的に生成するため、
        # ここでの事前初期化は不要（modelが確定していないため）
        pass

    def get_provider(self, provider_name: str, model: str) -> Optional[BaseLLMProvider]:
        """指定されたプロバイダーインスタンスを取得する"""
        return LLMClientFactory.create_provider(provider_name, model)

    async def process_chat(
        self,
        message: str,
        provider: str,
        model: str,
        context: Optional[ChatContext] = None,
        client_id: Optional[str] = None
    ) -> ChatResponse:
        """チャットメッセージを処理"""
        # WebSocket接続のクライアントIDを設定（read_fileツールで使用）
        if client_id:
            set_client_id(client_id)
            logger.debug(f"Client ID set for this request: {client_id}")

        llm_provider = self.get_provider(provider, model)

        if not llm_provider:
            return ChatResponse(
                message="申し訳ありません。現在LLMサービスが利用できません。APIキーを設定してください。",
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