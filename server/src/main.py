from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv
import os

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

# リクエスト/レスポンスモデル
class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: Optional[str] = None

class ChatContext(BaseModel):
    currentPath: Optional[str] = None
    fileList: Optional[List[Dict[str, Any]]] = None
    currentFile: Optional[str] = None
    currentFileContent: Optional[Dict[str, str]] = None
    conversationHistory: Optional[List[Dict[str, Any]]] = None

class ChatRequest(BaseModel):
    message: str
    provider: str = "openai"
    model: str = "gpt-3.5-turbo"
    context: Optional[ChatContext] = None

class LLMCommand(BaseModel):
    action: str
    path: Optional[str] = None
    content: Optional[str] = None

class ChatResponse(BaseModel):
    message: str
    response: Optional[str] = None
    commands: Optional[List[LLMCommand]] = None
    provider: Optional[str] = None
    model: Optional[str] = None
    historyCount: Optional[int] = None

class LLMProvider(BaseModel):
    name: str
    defaultModel: str
    models: List[str]
    status: str

# 簡易LLMサービス（まずは動作確認用）
class SimpleLLMService:
    def __init__(self):
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.gemini_api_key = os.getenv("GOOGLE_API_KEY")
        
    async def process_chat(
        self, 
        message: str, 
        provider: str = "openai",
        model: str = "gpt-3.5-turbo",
        context: Optional[ChatContext] = None
    ) -> ChatResponse:
        """チャットメッセージを処理"""
        try:
            # OpenAIを使用する場合
            if provider == "openai" and self.openai_api_key:
                from langchain_openai import ChatOpenAI
                from langchain.schema import HumanMessage, SystemMessage
                
                llm = ChatOpenAI(
                    api_key=self.openai_api_key,
                    model=model,
                    temperature=0.7
                )
                
                messages = [
                    SystemMessage(content="あなたは親切で有能なAIアシスタントです。ユーザーのノート作成と編集をサポートします。"),
                    HumanMessage(content=message)
                ]
                
                # コンテキストがある場合は追加情報を含める
                if context and context.currentFileContent:
                    context_msg = f"\n\n現在編集中のファイル: {context.currentFileContent.get('filename')}\n内容:\n{context.currentFileContent.get('content')}"
                    messages.append(HumanMessage(content=context_msg))
                
                response = llm.invoke(messages)
                
                return ChatResponse(
                    message=response.content,
                    response=response.content,
                    provider=provider,
                    model=model
                )
                
            # Geminiを使用する場合
            elif provider == "gemini" and self.gemini_api_key:
                from langchain_google_genai import ChatGoogleGenerativeAI
                from langchain.schema import HumanMessage, SystemMessage
                
                llm = ChatGoogleGenerativeAI(
                    model=model if model.startswith("gemini") else "gemini-1.5-flash",
                    google_api_key=self.gemini_api_key,
                    temperature=0.7
                )
                
                messages = [
                    SystemMessage(content="あなたは親切で有能なAIアシスタントです。ユーザーのノート作成と編集をサポートします。"),
                    HumanMessage(content=message)
                ]
                
                if context and context.currentFileContent:
                    context_msg = f"\n\n現在編集中のファイル: {context.currentFileContent.get('filename')}\n内容:\n{context.currentFileContent.get('content')}"
                    messages.append(HumanMessage(content=context_msg))
                
                response = llm.invoke(messages)
                
                return ChatResponse(
                    message=response.content,
                    response=response.content,
                    provider=provider,
                    model=model
                )
            
            else:
                # APIキーが設定されていない場合のフォールバック
                return ChatResponse(
                    message=f"受信したメッセージ: {message}\n\n申し訳ありません。現在LLMサービスが利用できません。APIキーを設定してください。",
                    response=f"エコー応答: {message}",
                    provider=provider,
                    model=model
                )
                
        except Exception as e:
            print(f"Error in process_chat: {str(e)}")
            return ChatResponse(
                message=f"エラーが発生しました: {str(e)}",
                response=f"エラー: {str(e)}",
                provider=provider,
                model=model
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
