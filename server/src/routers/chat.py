# @file chat.py
# @summary チャット関連のAPIエンドポイントを定義します。
# @responsibility /api/chatへのPOSTおよびGETリクエストを処理し、ChatServiceに処理を委譲します。
from fastapi import APIRouter, HTTPException
from src.models import ChatRequest
from src.services.chat_service import ChatService

router = APIRouter()
chat_service = ChatService()

@router.post("/api/chat")
async def chat_post(request: ChatRequest):
    """チャットメッセージを処理（POST）"""
    try:
        response = await chat_service.process_chat(
            message=request.message,
            provider=request.provider,
            model=request.model,
            context=request.context
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
