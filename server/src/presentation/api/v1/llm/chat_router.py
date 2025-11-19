"""
Presentation Layer - Chat Router

チャット関連のAPIエンドポイントを定義します。

責務:
- HTTPリクエストの受信とバリデーション
- Application層のCommandsへの処理委譲
- レスポンスの返却
- 認証・認可の適用
"""

from fastapi import APIRouter, HTTPException, Depends
from src.presentation.api.v1.llm.schemas import (
    ChatRequest,
    ChatResponse,
    ChatContext,
    LLMCommand as LLMCommandSchema,
    TokenUsageInfo,
    SummarizeRequest,
    SummarizeResponse,
    DocumentSummarizeRequest,
    DocumentSummarizeResponse,
)
from src.application.llm.commands import (
    SendChatMessageCommand,
    SummarizeConversationCommand,
    SummarizeDocumentCommand,
)
from src.application.llm.dto.chat_dto import (
    ChatRequestDTO,
    ChatContextDTO,
    LLMCommandDTO,
    TokenUsageDTO,
)
from src.domain.llm.providers.config import (
    MAX_CONVERSATION_TOKENS,
    PRESERVE_RECENT_MESSAGES,
    MIN_DOCUMENT_CONTENT_LENGTH,
)
from src.llm.routers.error_handlers import handle_route_errors
from src.auth.dependencies import verify_token_auth
from src.core.config import settings
from src.core.logger import logger

router = APIRouter()


@router.post("/api/chat")
async def chat_post(
    request: ChatRequest,
    user_id: str = Depends(verify_token_auth)
):
    """チャットメッセージを処理（POST）

    Args:
        request: ChatRequest
            - message: ユーザーメッセージ
            - provider: LLMプロバイダー名
            - model: モデル名
            - context: チャットコンテキスト（オプション）
            - client_id: WebSocket接続ID（オプション）
        user_id: 認証されたユーザーID

    Returns:
        ChatResponse: チャット応答
    """
    logger.info(
        f"Received chat request: user={user_id}, provider={request.provider}, "
        f"model={request.model}, message_length={len(request.message)}"
    )
    if request.context:
        logger.info(f"Request context: {request.context.model_dump_json(indent=2)}")
    if request.client_id:
        logger.info(f"Client ID: {request.client_id}")

    try:
        # 1. Pydantic → DTO変換
        request_dto = _convert_chat_request_to_dto(request)

        # 2. Commandを実行
        command = SendChatMessageCommand()
        response_dto = await command.execute(request_dto)

        # 3. DTO → Pydantic変換
        response = _convert_chat_response_to_pydantic(response_dto)

        return response

    except Exception as e:
        logger.error(f"Error in chat_post: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/chat")
async def chat_get(
    message: str,
    provider: str | None = None,
    model: str | None = None,
    user_id: str = Depends(verify_token_auth)
):
    """チャットメッセージを処理（GET）- テスト用

    Args:
        message: ユーザーメッセージ
        provider: LLMプロバイダー名（オプション）
        model: モデル名（オプション）
        user_id: 認証されたユーザーID

    Returns:
        ChatResponse: チャット応答
    """
    logger.info(f"Received chat GET request: user={user_id}")

    # デフォルト値を設定
    if provider is None:
        provider = settings.get_default_provider()
    if model is None:
        model = settings.get_default_model(provider)

    try:
        # ChatRequestDTOを構築
        request_dto = ChatRequestDTO(
            message=message,
            provider=provider,
            model=model,
            context=None,
            client_id=None
        )

        # Commandを実行
        command = SendChatMessageCommand()
        response_dto = await command.execute(request_dto)

        # DTO → Pydantic変換
        response = _convert_chat_response_to_pydantic(response_dto)

        return response

    except Exception as e:
        logger.error(f"Error in chat_get: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/chat/summarize")
@handle_route_errors
async def summarize_conversation(
    request: SummarizeRequest,
    user_id: str = Depends(verify_token_auth)
):
    """会話履歴を要約する

    Args:
        request: SummarizeRequest
            - conversationHistory: 要約対象の会話履歴
            - max_tokens: 圧縮後の最大トークン数（デフォルト: 4000）
            - preserve_recent: 保持する最新メッセージ数（デフォルト: 10）
            - provider: 要約に使用するLLMプロバイダー（デフォルト: "openai"）
            - model: 要約に使用するモデル（Noneの場合はデフォルト）
        user_id: 認証されたユーザーID

    Returns:
        SummarizeResponse:
            - summary: 要約されたシステムメッセージ
            - recentMessages: 保持された最新メッセージ
            - compressionRatio: 圧縮率
            - originalTokens: 元のトークン数
            - compressedTokens: 圧縮後のトークン数
    """
    logger.info(
        f"Received summarization request: user={user_id}, "
        f"{len(request.conversationHistory)} messages, "
        f"max_tokens={request.max_tokens}, "
        f"preserve_recent={request.preserve_recent}"
    )

    # Commandを実行
    command = SummarizeConversationCommand()
    response = await command.execute(
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

    Args:
        request: DocumentSummarizeRequest
            - content: 文書の内容
            - title: 文書のタイトル（コンテキスト用）
            - provider: 要約に使用するLLMプロバイダー（デフォルト: "openai"）
            - model: 要約に使用するモデル（Noneの場合はデフォルト）
        user_id: 認証されたユーザーID

    Returns:
        DocumentSummarizeResponse:
            - summary: 生成された要約テキスト
            - model: 使用したモデルID
            - inputTokens: 入力トークン数
            - outputTokens: 出力トークン数
            - totalTokens: 合計トークン数
    """
    logger.info(
        f"Received document summarization request: user={user_id}, "
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

    # Commandを実行
    command = SummarizeDocumentCommand()
    result = await command.execute(
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


# ============================================================================
# Helper Functions - DTO Conversion
# ============================================================================

def _convert_chat_request_to_dto(request: ChatRequest) -> ChatRequestDTO:
    """ChatRequest（Pydantic）をChatRequestDTO（dataclass）に変換

    Args:
        request: Pydanticスキーマ

    Returns:
        ChatRequestDTO: アプリケーション層DTO
    """
    context_dto = None
    if request.context:
        context_dto = ChatContextDTO(
            current_path=request.context.currentPath,
            file_list=request.context.fileList,
            current_file=request.context.currentFile,
            current_file_content=request.context.currentFileContent,
            attached_file_content=request.context.attachedFileContent,
            conversation_history=request.context.conversationHistory,
            all_files=request.context.allFiles,
            send_file_context_to_llm=request.context.sendFileContextToLLM
        )

    return ChatRequestDTO(
        message=request.message,
        provider=request.provider,
        model=request.model,
        context=context_dto,
        client_id=request.client_id
    )


def _convert_chat_response_to_pydantic(response_dto) -> ChatResponse:
    """ChatResponseDTO（dataclass）をChatResponse（Pydantic）に変換

    Args:
        response_dto: アプリケーション層DTO

    Returns:
        ChatResponse: Pydanticスキーマ
    """
    # commandsの変換
    commands = None
    if response_dto.commands:
        commands = [
            LLMCommandSchema(
                action=cmd.action,
                title=cmd.title,
                new_title=cmd.new_title,
                content=cmd.content,
                category=cmd.category,
                tags=cmd.tags,
                start_line=cmd.start_line,
                end_line=cmd.end_line
            )
            for cmd in response_dto.commands
        ]

    # tokenUsageの変換
    token_usage = None
    if response_dto.token_usage:
        token_usage = TokenUsageInfo(
            currentTokens=response_dto.token_usage.current_tokens,
            maxTokens=response_dto.token_usage.max_tokens,
            usageRatio=response_dto.token_usage.usage_ratio,
            needsSummary=response_dto.token_usage.needs_summary,
            inputTokens=response_dto.token_usage.input_tokens,
            outputTokens=response_dto.token_usage.output_tokens,
            totalTokens=response_dto.token_usage.total_tokens
        )

    return ChatResponse(
        message=response_dto.message,
        commands=commands,
        provider=response_dto.provider,
        model=response_dto.model,
        historyCount=response_dto.history_count,
        tokenUsage=token_usage
    )
