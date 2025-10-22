# @file main.py
# @summary アプリケーションのメインエントリポイント。FastAPIアプリを初期化し、ルーターを結合します。
# @responsibility FastAPIアプリケーションのインスタンス化、CORSミドルウェアの設定、および各ルーターのインクルードを行います。
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.llm.routers import chat_router
from src.llm.routers import llm_providers_router
from src.llm.routers import tools_router

app = FastAPI(title="LLM File App API")

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 開発環境用。本番環境では適切に設定すること
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーターのインクルード
app.include_router(chat_router.router)
app.include_router(llm_providers_router.router)
app.include_router(tools_router.router)

# ルートエンドポイント
@app.get("/")
async def root():
    """ルートエンドポイント"""
    return {
        "message": "LLM File App API",
        "version": "1.0.0",
        "endpoints": {
            "chat": "/api/chat",
            "providers": "/api/llm-providers",
            "tools": "/api/tools",
            "health": "/api/health"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)