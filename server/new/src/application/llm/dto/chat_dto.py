"""
Application Layer - Chat DTOs

チャット関連のデータ転送オブジェクト（DTO）を定義します。
Domain層とPresentation層の間でデータをやり取りするための中間オブジェクトです。
"""

from dataclasses import dataclass
from typing import Any


@dataclass
class ChatMessageDTO:
    """チャットメッセージDTO"""
    role: str
    content: str
    timestamp: str  # ISO format
    metadata: dict[str, Any] | None = None


@dataclass
class ChatContextDTO:
    """チャットコンテキストDTO"""
    current_path: str | None = None
    file_list: list[dict[str, Any]] | None = None
    current_file: str | None = None
    current_file_content: dict[str, str | None] | None = None
    attached_file_content: list[dict[str, str]] | None = None
    conversation_history: list[dict[str, Any]] | None = None
    all_files: list[dict[str, Any]] | None = None
    send_file_context_to_llm: bool | None = None


@dataclass
class LLMCommandDTO:
    """LLMコマンドDTO"""
    action: str
    title: str | None = None
    new_title: str | None = None
    content: str | None = None
    category: str | None = None
    tags: list[str] | None = None
    start_line: int | None = None
    end_line: int | None = None


@dataclass
class TokenUsageDTO:
    """トークン使用量DTO"""
    current_tokens: int
    max_tokens: int
    usage_ratio: float
    needs_summary: bool
    input_tokens: int | None = None
    output_tokens: int | None = None
    total_tokens: int | None = None


@dataclass
class ChatRequestDTO:
    """チャットリクエストDTO"""
    message: str
    provider: str
    model: str
    context: ChatContextDTO | None = None
    client_id: str | None = None


@dataclass
class ChatResponseDTO:
    """チャットレスポンスDTO"""
    message: str
    commands: list[LLMCommandDTO] | None = None
    provider: str | None = None
    model: str | None = None
    history_count: int | None = None
    token_usage: TokenUsageDTO | None = None
