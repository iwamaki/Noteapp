"""
Application Layer - Chat DTOs

チャット関連のデータ転送オブジェクト（DTO）を定義します。
Domain層とPresentation層の間でデータをやり取りするための中間オブジェクトです。
"""

from dataclasses import dataclass
from typing import Optional, List, Dict, Any
from datetime import datetime


@dataclass
class ChatMessageDTO:
    """チャットメッセージDTO"""
    role: str
    content: str
    timestamp: str  # ISO format
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class ChatContextDTO:
    """チャットコンテキストDTO"""
    current_path: Optional[str] = None
    file_list: Optional[List[Dict[str, Any]]] = None
    current_file: Optional[str] = None
    current_file_content: Optional[Dict[str, Optional[str]]] = None
    attached_file_content: Optional[List[Dict[str, str]]] = None
    conversation_history: Optional[List[Dict[str, Any]]] = None
    all_files: Optional[List[Dict[str, Any]]] = None
    send_file_context_to_llm: Optional[bool] = None


@dataclass
class LLMCommandDTO:
    """LLMコマンドDTO"""
    action: str
    title: Optional[str] = None
    new_title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    start_line: Optional[int] = None
    end_line: Optional[int] = None


@dataclass
class TokenUsageDTO:
    """トークン使用量DTO"""
    current_tokens: int
    max_tokens: int
    usage_ratio: float
    needs_summary: bool
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    total_tokens: Optional[int] = None


@dataclass
class ChatRequestDTO:
    """チャットリクエストDTO"""
    message: str
    provider: str
    model: str
    context: Optional[ChatContextDTO] = None
    client_id: Optional[str] = None


@dataclass
class ChatResponseDTO:
    """チャットレスポンスDTO"""
    message: str
    commands: Optional[List[LLMCommandDTO]] = None
    provider: Optional[str] = None
    model: Optional[str] = None
    history_count: Optional[int] = None
    token_usage: Optional[TokenUsageDTO] = None
