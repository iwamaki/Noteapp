# @file chat.py
# @summary チャット関連のAPIエンドポイントを定義します。
# @responsibility /api/chatへのPOSTおよびGETリクエストを処理し、ChatServiceに処理を委譲します。
from fastapi import APIRouter, HTTPException, Depends
from src.llm.models import ChatRequest, SummarizeRequest, DocumentSummarizeRequest, DocumentSummarizeResponse
from src.llm.services.chat_service import ChatService
from src.llm.services.summarization_service import SummarizationService
from src.llm.providers.config import MAX_CONVERSATION_TOKENS, PRESERVE_RECENT_MESSAGES, MIN_DOCUMENT_CONTENT_LENGTH
from src.llm.routers.error_handlers import handle_route_errors
from src.core.config import settings
from src.core.logger import logger
from src.auth.dependencies import verify_token_auth

router = APIRouter()
chat_service = ChatService()
summarization_service = SummarizationService()

@router.post("/api/chat")
async def chat_post(
    request: ChatRequest,
    user_id: str = Depends(verify_token_auth)
):
    """チャットメッセージを処理（POST）"""
    logger.info(f"Received chat request context: {request.context.model_dump_json(indent=2) if request.context else 'None'}")
    logger.info(f"Authenticated user: {user_id}")
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
    provider: str | None = None,
    model: str | None = None,
    user_id: str = Depends(verify_token_auth)
):
    """チャットメッセージを処理（GET）- テスト用"""
    logger.info(f"Authenticated user: {user_id}")
    # デフォルト値を設定
    if provider is None:
        provider = settings.get_default_provider()
    if model is None:
        model = settings.get_default_model(provider)

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
@handle_route_errors
async def summarize_conversation(
    request: SummarizeRequest,
    user_id: str = Depends(verify_token_auth)
):
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

    response = await summarization_service.summarize(
        conversation_history=request.conversationHistory,
        max_tokens=request.max_tokens or MAX_CONVERSATION_TOKENS,
        preserve_recent=request.preserve_recent or PRESERVE_RECENT_MESSAGES,
        provider=request.provider or settings.get_default_provider(),
        model=request.model
    )

    logger.info(
        f"Summarization complete: "
        f"{response.originalTokens} -> {response.compressedTokens} tokens "
        f"(compression ratio: {response.compressionRatio:.2%})"
    )

    return response


@router.post("/api/document/summarize")
@handle_route_errors
async def summarize_document(
    request: DocumentSummarizeRequest,
    user_id: str = Depends(verify_token_auth)
) -> DocumentSummarizeResponse:
    """文書内容を要約する

    文書の内容をLLMに送信して要約を生成します。

    Args:
        request: DocumentSummarizeRequest
            - content: 文書の内容
            - title: 文書のタイトル（コンテキスト用）
            - provider: 要約に使用するLLMプロバイダー（デフォルト: "openai"）
            - model: 要約に使用するモデル（Noneの場合はデフォルト）

    Returns:
        DocumentSummarizeResponse:
            - summary: 生成された要約テキスト
    """
    logger.info(
        f"Received document summarization request: "
        f"title='{request.title}', content_length={len(request.content)}, "
        f"provider={request.provider}, model={request.model}"
    )

    # 最低文字数チェック
    if len(request.content.strip()) < MIN_DOCUMENT_CONTENT_LENGTH:
        error_msg = f"Content too short. Minimum {MIN_DOCUMENT_CONTENT_LENGTH} characters required."
        logger.warning(f"Rejected document summarization: {error_msg}")
        raise HTTPException(status_code=400, detail=error_msg)

    provider = request.provider or settings.get_default_provider()
    model = request.model

    logger.info(
        f"Using for summarization: provider={provider}, model={model} "
        f"(model is None: {model is None})"
    )

    result = await summarization_service.summarize_document(
        content=request.content,
        title=request.title,
        provider=provider,
        model=model
    )

    logger.info(
        f"Document summarization complete: {len(result['summary'])} characters "
        f"(tokens: input={result.get('inputTokens')}, output={result.get('outputTokens')})"
    )

    return DocumentSummarizeResponse(
        summary=result['summary'],
        model=result.get('model'),
        inputTokens=result.get('inputTokens'),
        outputTokens=result.get('outputTokens'),
        totalTokens=result.get('totalTokens'),
    )
