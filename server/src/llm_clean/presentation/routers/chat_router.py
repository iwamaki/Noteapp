"""Chat Router (Clean Architecture)

This router provides thin HTTP endpoints for chat functionality.
Business logic is delegated to use cases.
"""
from fastapi import APIRouter, Depends, HTTPException

from src.auth import verify_token_auth
from src.core.logger import logger
from src.llm_clean.presentation.middleware.error_handler import handle_route_errors

from ...application.dtos import (
    ChatRequestDTO,
    ChatResponseDTO,
    SummarizeRequestDTO,
    SummarizeResponseDTO,
)
from ...dependencies import get_db, get_process_chat_use_case, get_summarize_conversation_use_case

router = APIRouter()


@router.post("/api/chat", response_model=ChatResponseDTO)
async def chat_post(
    request: ChatRequestDTO,
    user_id: str = Depends(verify_token_auth)
):
    """Process chat message (Clean Architecture version)

    This endpoint uses the new Clean Architecture implementation.
    It delegates all business logic to ProcessChatUseCase.

    Args:
        request: Chat request DTO
        user_id: Authenticated user ID

    Returns:
        ChatResponseDTO with response message, commands, token usage, etc.
    """
    logger.info(
        f"[ChatRouterClean] Received chat request: user={user_id}, "
        f"provider={request.provider}, model={request.model}"
    )

    if request.context:
        logger.info(
            f"[ChatRouterClean] Context: "
            f"currentPath={request.context.currentPath}, "
            f"historyLength={len(request.context.conversationHistory) if request.context.conversationHistory else 0}"
        )

    try:
        # Get use case with dependency injection
        use_case = get_process_chat_use_case(
            provider_name=request.provider,
            model=request.model,
            user_id=user_id,
            db=next(get_db())  # Get DB session
        )

        # Execute use case
        response = await use_case.execute(request, user_id)

        logger.info(
            f"[ChatRouterClean] Chat processing completed: "
            f"message_length={len(response.message)}, "
            f"commands={len(response.commands) if response.commands else 0}"
        )

        return response

    except ValueError as e:
        # Token validation error or other value errors
        logger.warning(f"[ChatRouterClean] Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        # Unexpected errors
        logger.error(f"[ChatRouterClean] Unexpected error: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"内部エラーが発生しました: {str(e)}")


@router.post("/api/chat/summarize", response_model=SummarizeResponseDTO)
@handle_route_errors
async def summarize_conversation(
    request: SummarizeRequestDTO,
    user_id: str = Depends(verify_token_auth)
):
    """Summarize conversation history (Clean Architecture version)

    This endpoint compresses long conversation histories to reduce
    token usage while preserving important context.

    Args:
        request: Summarize request DTO
        user_id: Authenticated user ID

    Returns:
        SummarizeResponseDTO with summary and compression statistics
    """
    logger.info(
        f"[ChatRouterClean] Received summarization request: "
        f"user={user_id}, messages={len(request.conversationHistory)}, "
        f"provider={request.provider}"
    )

    try:
        # Get use case with dependency injection
        use_case = get_summarize_conversation_use_case(
            provider_name=request.provider,
            model=request.model or "",
            user_id=user_id,
            db=next(get_db())  # Get DB session
        )

        # Execute use case
        response = await use_case.execute(request, user_id)

        logger.info(
            f"[ChatRouterClean] Summarization completed: "
            f"{response.originalTokens} -> {response.compressedTokens} tokens "
            f"(compression ratio: {response.compressionRatio:.2%})"
        )

        return response

    except ValueError as e:
        # Token validation error
        logger.warning(f"[ChatRouterClean] Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        # Unexpected errors
        logger.error(f"[ChatRouterClean] Unexpected error: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"内部エラーが発生しました: {str(e)}")
