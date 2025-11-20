"""Conversation Aggregate Root

Manages a collection of chat messages and conversation metadata.
This is the aggregate root for chat conversations.
"""
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from .chat_message import ChatMessage


class Conversation(BaseModel):
    """Conversation aggregate root

    Encapsulates a collection of chat messages and provides methods
    for managing the conversation state.

    Attributes:
        conversation_id: Unique identifier for the conversation
        messages: List of chat messages in chronological order
        created_at: When the conversation was created
        updated_at: When the conversation was last updated
        metadata: Additional metadata for the conversation
    """

    conversation_id: str
    messages: list[ChatMessage] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    metadata: dict[str, Any] = Field(default_factory=dict)

    def add_message(self, message: ChatMessage) -> None:
        """Add a message to the conversation

        Args:
            message: The chat message to add

        Raises:
            ValueError: If message validation fails
        """
        self.messages.append(message)
        self.updated_at = datetime.utcnow().isoformat()

    def add_user_message(self, content: str) -> ChatMessage:
        """Add a user message to the conversation

        Args:
            content: The message content

        Returns:
            The created ChatMessage

        Raises:
            ValueError: If content is empty
        """
        message = ChatMessage(role="user", content=content)
        self.add_message(message)
        return message

    def add_assistant_message(self, content: str) -> ChatMessage:
        """Add an assistant message to the conversation

        Args:
            content: The message content

        Returns:
            The created ChatMessage

        Raises:
            ValueError: If content is empty
        """
        message = ChatMessage(role="assistant", content=content)
        self.add_message(message)
        return message

    def add_system_message(self, content: str) -> ChatMessage:
        """Add a system message to the conversation

        Args:
            content: The message content

        Returns:
            The created ChatMessage

        Raises:
            ValueError: If content is empty
        """
        message = ChatMessage(role="system", content=content)
        self.add_message(message)
        return message

    def get_messages(self) -> list[ChatMessage]:
        """Get all messages in the conversation

        Returns:
            List of chat messages in chronological order
        """
        return self.messages.copy()

    def get_recent_messages(self, count: int) -> list[ChatMessage]:
        """Get the most recent N messages

        Args:
            count: Number of recent messages to retrieve

        Returns:
            List of the most recent messages
        """
        return self.messages[-count:] if count > 0 else []

    def get_message_count(self) -> int:
        """Get the total number of messages

        Returns:
            Total number of messages in the conversation
        """
        return len(self.messages)

    def get_user_messages(self) -> list[ChatMessage]:
        """Get all user messages

        Returns:
            List of user messages
        """
        return [msg for msg in self.messages if msg.is_user_message()]

    def get_assistant_messages(self) -> list[ChatMessage]:
        """Get all assistant messages

        Returns:
            List of assistant messages
        """
        return [msg for msg in self.messages if msg.is_assistant_message()]

    def clear_messages(self) -> None:
        """Clear all messages from the conversation"""
        self.messages = []
        self.updated_at = datetime.utcnow().isoformat()

    def remove_messages_before(self, index: int) -> None:
        """Remove messages before a specific index

        Args:
            index: The index to remove messages before (0-based)
        """
        if 0 <= index < len(self.messages):
            self.messages = self.messages[index:]
            self.updated_at = datetime.utcnow().isoformat()

    def to_dict_list(self) -> list[dict[str, Any]]:
        """Convert messages to a list of dictionaries

        Returns:
            List of message dictionaries
        """
        return [msg.to_dict() for msg in self.messages]

    def is_empty(self) -> bool:
        """Check if the conversation has no messages

        Returns:
            True if there are no messages, False otherwise
        """
        return len(self.messages) == 0

    class Config:
        """Pydantic configuration"""
        validate_assignment = True
