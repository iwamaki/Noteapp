"""
データモデル定義
"""
from pydantic import BaseModel
from typing import Optional, Dict, Any, List


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
    commands: Optional[List[LLMCommand]] = None
    provider: Optional[str] = None
    model: Optional[str] = None
    historyCount: Optional[int] = None


class LLMProvider(BaseModel):
    name: str
    defaultModel: str
    models: List[str]
    status: str
