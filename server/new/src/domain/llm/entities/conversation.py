"""
LLM Domain - Conversation Entity

会話エンティティを定義します。
チャットセッション全体を管理するドメインオブジェクトです。

責務:
- メッセージのコレクション管理
- 会話の整合性保証
- 会話メタデータの管理
- ビジネスルール（要約の必要性判定等）の適用
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import uuid4

from src.domain.llm.entities.message import Message, MessageRole


@dataclass
class Conversation:
    """
    会話エンティティ

    チャットセッションにおける一連のメッセージを管理します。
    メッセージの追加、検索、要約判定などのビジネスロジックを提供します。

    Attributes:
        id: 会話の一意識別子
        messages: メッセージのリスト
        created_at: 会話作成日時
        updated_at: 最終更新日時
        user_id: ユーザーID（オプション）
        metadata: 追加のメタデータ
    """
    id: str = field(default_factory=lambda: str(uuid4()))
    messages: List[Message] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    user_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def add_message(self, message: Message) -> None:
        """
        メッセージを会話に追加

        Args:
            message: 追加するメッセージ

        Raises:
            ValueError: 無効なメッセージの場合
        """
        if not isinstance(message, Message):
            raise ValueError("Invalid message type")

        self.messages.append(message)
        self.updated_at = datetime.utcnow()

    def add_user_message(self, content: str, metadata: Optional[Dict[str, Any]] = None) -> Message:
        """
        ユーザーメッセージを追加

        Args:
            content: メッセージ内容
            metadata: メタデータ

        Returns:
            追加されたメッセージ
        """
        message = Message.create_user_message(content, metadata=metadata)
        self.add_message(message)
        return message

    def add_ai_message(self, content: str, metadata: Optional[Dict[str, Any]] = None) -> Message:
        """
        AI応答メッセージを追加

        Args:
            content: メッセージ内容
            metadata: メタデータ

        Returns:
            追加されたメッセージ
        """
        message = Message.create_ai_message(content, metadata=metadata)
        self.add_message(message)
        return message

    def add_system_message(self, content: str, metadata: Optional[Dict[str, Any]] = None) -> Message:
        """
        システムメッセージを追加

        Args:
            content: メッセージ内容
            metadata: メタデータ

        Returns:
            追加されたメッセージ
        """
        message = Message.create_system_message(content, metadata=metadata)
        self.add_message(message)
        return message

    def get_message_count(self) -> int:
        """メッセージ数を取得"""
        return len(self.messages)

    def get_user_messages(self) -> List[Message]:
        """ユーザーメッセージのみを取得"""
        return [msg for msg in self.messages if msg.is_user_message()]

    def get_ai_messages(self) -> List[Message]:
        """AI応答メッセージのみを取得"""
        return [msg for msg in self.messages if msg.is_ai_message()]

    def get_system_messages(self) -> List[Message]:
        """システムメッセージのみを取得"""
        return [msg for msg in self.messages if msg.is_system_message()]

    def get_recent_messages(self, count: int) -> List[Message]:
        """
        最新のN件のメッセージを取得

        Args:
            count: 取得するメッセージ数

        Returns:
            最新のメッセージリスト
        """
        if count <= 0:
            return []
        return self.messages[-count:]

    def get_messages_after(self, timestamp: datetime) -> List[Message]:
        """
        指定日時以降のメッセージを取得

        Args:
            timestamp: 基準日時

        Returns:
            指定日時以降のメッセージリスト
        """
        return [msg for msg in self.messages if msg.timestamp > timestamp]

    def clear_messages(self) -> None:
        """全メッセージをクリア"""
        self.messages.clear()
        self.updated_at = datetime.utcnow()

    def remove_oldest_messages(self, count: int) -> int:
        """
        古いメッセージを削除

        Args:
            count: 削除するメッセージ数

        Returns:
            実際に削除されたメッセージ数
        """
        if count <= 0:
            return 0

        actual_count = min(count, len(self.messages))
        self.messages = self.messages[actual_count:]
        self.updated_at = datetime.utcnow()
        return actual_count

    def is_empty(self) -> bool:
        """会話が空かどうか"""
        return len(self.messages) == 0

    def get_total_character_count(self) -> int:
        """全メッセージの合計文字数を取得"""
        return sum(msg.get_character_count() for msg in self.messages)

    def get_last_message(self) -> Optional[Message]:
        """最後のメッセージを取得"""
        if self.is_empty():
            return None
        return self.messages[-1]

    def get_last_user_message(self) -> Optional[Message]:
        """最後のユーザーメッセージを取得"""
        user_messages = self.get_user_messages()
        if not user_messages:
            return None
        return user_messages[-1]

    def get_last_ai_message(self) -> Optional[Message]:
        """最後のAI応答メッセージを取得"""
        ai_messages = self.get_ai_messages()
        if not ai_messages:
            return None
        return ai_messages[-1]

    def to_dict(self) -> Dict[str, Any]:
        """辞書形式に変換（シリアライゼーション用）"""
        return {
            "id": self.id,
            "messages": [msg.to_dict() for msg in self.messages],
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "user_id": self.user_id,
            "metadata": self.metadata
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Conversation":
        """辞書から復元（デシリアライゼーション用）"""
        messages = [Message.from_dict(msg_data) for msg_data in data.get("messages", [])]
        return cls(
            id=data["id"],
            messages=messages,
            created_at=datetime.fromisoformat(data["created_at"]),
            updated_at=datetime.fromisoformat(data["updated_at"]),
            user_id=data.get("user_id"),
            metadata=data.get("metadata", {})
        )

    def __repr__(self) -> str:
        return (
            f"Conversation(id={self.id}, "
            f"message_count={self.get_message_count()}, "
            f"user_id={self.user_id})"
        )
