"""ChatMessage Entity

Pure domain entity representing a chat message in a conversation.
This is a domain model with business logic and validation.
"""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, field_validator


class ChatMessage(BaseModel):
    """Chat message entity

    Represents a single message in a conversation with its role, content, and metadata.
    This entity encapsulates the core business logic for chat messages.

    Attributes:
        role: The role of the message sender (user, assistant, system, tool)
        content: The message content
        timestamp: When the message was created (ISO format)
        message_id: Unique identifier for the message
    """

    role: Literal["user", "assistant", "system", "tool"]
    content: str
    timestamp: str | None = None
    message_id: str | None = None

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: str) -> str:
        """Validate that content is not empty"""
        if not v or not v.strip():
            raise ValueError("Message content cannot be empty")
        return v

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        """Validate that role is one of the allowed values"""
        allowed_roles = {"user", "assistant", "system", "tool"}
        if v not in allowed_roles:
            raise ValueError(f"Role must be one of {allowed_roles}, got: {v}")
        return v

    def __init__(self, **data):
        """Initialize ChatMessage with automatic timestamp if not provided"""
        if "timestamp" not in data or data["timestamp"] is None:
            data["timestamp"] = datetime.utcnow().isoformat()
        super().__init__(**data)

    def is_user_message(self) -> bool:
        """Check if this is a user message"""
        return self.role == "user"

    def is_assistant_message(self) -> bool:
        """Check if this is an assistant message"""
        return self.role == "assistant"

    def is_system_message(self) -> bool:
        """Check if this is a system message"""
        return self.role == "system"

    def get_content_length(self) -> int:
        """Get the length of the message content"""
        return len(self.content)

    def to_dict(self) -> dict:
        """Convert to dictionary format for serialization"""
        return {
            "role": self.role,
            "content": self.content,
            "timestamp": self.timestamp,
            **({"message_id": self.message_id} if self.message_id else {})
        }

    class Config:
        """Pydantic configuration"""
        frozen = False  # Entities can be mutable
        validate_assignment = True  # Validate on attribute assignment
