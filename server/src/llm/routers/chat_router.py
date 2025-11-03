# @file chat.py
# @summary チャット関連のAPIエンドポイントを定義します。
# @responsibility /api/chatへのPOSTおよびGETリクエストを処理し、ChatServiceに処理を委譲します。
from fastapi import APIRouter, HTTPException
from src.llm.models import ChatRequest, SummarizeRequest
from src.llm.services.chat_service import ChatService
from src.llm.services.summarization_service import SummarizationService
from src.core.logger import logger

router = APIRouter()
chat_service = ChatService()
summarization_service = SummarizationService()

@router.post("/api/chat")
async def chat_post(request: ChatRequest):
    """チャットメッセージを処理（POST）"""
    logger.info(f"Received chat request context: {request.context.model_dump_json(indent=2) if request.context else 'None'}")
    if request.client_id:
        logger.info(f"Client ID: {request.client_id}")
    try:
        response = await chat_service.process_chat(
            message=request.message,
            provider=request.provider,
            model=request.model,
            context=request.context,
            client_id=request.client_id
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/chat")
async def chat_get(
    message: str,
    provider: str = "openai",
    model: str = "gpt-3.5-turbo"
):
    """チャットメッセージを処理（GET）- テスト用"""
    try:
        response = await chat_service.process_chat(
            message=message,
            provider=provider,
            model=model
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/chat/summarize")
async def summarize_conversation(request: SummarizeRequest):
    """会話履歴を要約する

    長い会話履歴を圧縮して、重要な情報を保持したまま
    トークン数を削減します。

    Args:
        request: SummarizeRequest
            - conversationHistory: 要約対象の会話履歴
            - max_tokens: 圧縮後の最大トークン数（デフォルト: 4000）
            - preserve_recent: 保持する最新メッセージ数（デフォルト: 10）
            - provider: 要約に使用するLLMプロバイダー（デフォルト: "openai"）
            - model: 要約に使用するモデル（Noneの場合はデフォルト）

    Returns:
        SummarizeResponse:
            - summary: 要約されたシステムメッセージ
            - recentMessages: 保持された最新メッセージ
            - compressionRatio: 圧縮率
            - originalTokens: 元のトークン数
            - compressedTokens: 圧縮後のトークン数
    """
    logger.info(
        f"Received summarization request: "
        f"{len(request.conversationHistory)} messages, "
        f"max_tokens={request.max_tokens}, "
        f"preserve_recent={request.preserve_recent}"
    )

    try:
        response = await summarization_service.summarize(
            conversation_history=request.conversationHistory,
            max_tokens=request.max_tokens or 500,
            preserve_recent=request.preserve_recent or 3,
            provider=request.provider or "openai",
            model=request.model
        )

        logger.info(
            f"Summarization complete: "
            f"{response.originalTokens} -> {response.compressedTokens} tokens "
            f"(compression ratio: {response.compressionRatio:.2%})"
        )

        return response

    except ValueError as e:
        logger.error(f"Invalid request for summarization: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        logger.error(f"Error during summarization: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
