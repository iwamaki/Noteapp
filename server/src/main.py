# @file main.py
# @summary このファイルは、LLM Note AppのバックエンドAPIの主要なエントリポイントを定義します。
# FastAPIアプリケーションを初期化し、CORS設定、LLMサービスとの連携、および各種APIエンドポイント（チャット、プロバイダー情報、ヘルスチェック）を提供します。
# @responsibility APIリクエストのルーティング、LLMサービスへの処理の委譲、応答の生成、およびエラーハンドリングを行います。
# アプリケーションの起動と設定を管理し、フロントエンドとの通信インターフェースを提供します。
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# モデル、サービスのインポート
from .models import ChatRequest, ChatResponse, LLMProvider
from .services import SimpleLLMService

# 環境変数の読み込み
load_dotenv()

app = FastAPI(title="LLM Note App API")

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 開発環境用。本番環境では適切に設定すること
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# サービスインスタンス
llm_service = SimpleLLMService()

# エンドポイント
@app.post("/api/chat")
async def chat_post(request: ChatRequest):
    """チャットメッセージを処理（POST）"""
    try:
        response = await llm_service.process_chat(
            message=request.message,
            provider=request.provider,
            model=request.model,
            context=request.context
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# テスト用のGETエンドポイント
@app.get("/api/chat")
async def chat_get(
    message: str,
    provider: str = "openai",
    model: str = "gpt-3.5-turbo"
):
    """チャットメッセージを処理（GET）- テスト用"""
    try:
        response = await llm_service.process_chat(
            message=message,
            provider=provider,
            model=model
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# LLMプロバイダーの取得
@app.get("/api/llm-providers")
async def get_llm_providers():
    """利用可能なLLMプロバイダーを取得"""
    providers = {}
    
    if llm_service.openai_api_key:
        providers["openai"] = LLMProvider(
            name="OpenAI",
            defaultModel="gpt-3.5-turbo",
            models=["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo-preview"],
            status="available"
        )
    
    if llm_service.gemini_api_key:
        providers["gemini"] = LLMProvider(
            name="Google Gemini",
            defaultModel="gemini-1.5-flash",
            models=["gemini-1.5-flash", "gemini-1.5-pro"],
            status="available"
        )
    
    # プロバイダーが1つもない場合はダミーを返す
    if not providers:
        providers["openai"] = LLMProvider(
            name="OpenAI",
            defaultModel="gpt-3.5-turbo",
            models=["gpt-3.5-turbo"],
            status="unavailable"
        )
    
    return providers

# ヘルスチェックエンドポイント
@app.get("/api/health")
async def health_check():
    """ヘルスチェック"""
    providers_status = {}
    
    if llm_service.openai_api_key:
        providers_status["openai"] = {
            "name": "OpenAI",
            "status": "available",
            "defaultModel": "gpt-3.5-turbo",
            "models": ["gpt-3.5-turbo", "gpt-4"]
        }
    
    if llm_service.gemini_api_key:
        providers_status["gemini"] = {
            "name": "Google Gemini",
            "status": "available",
            "defaultModel": "gemini-1.5-flash",
            "models": ["gemini-1.5-flash", "gemini-1.5-pro"]
        }
    
    return {
        "status": "ok" if providers_status else "error",
        "providers": providers_status
    }

# ルートエンドポイント
@app.get("/")
async def root():
    """ルートエンドポイント"""
    return {
        "message": "LLM Note App API",
        "version": "1.0.0",
        "endpoints": {
            "chat": "/api/chat",
            "providers": "/api/llm-providers",
            "health": "/api/health"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
