"""
LLM Domain - Message Entity

メッセージエンティティを定義します。
チャット会話における個々のメッセージを表現するドメインオブジェクトです。

責務:
- メッセージの構造と整合性を保証
- メッセージのロール（役割）の型安全性
- ビジネスルールの適用（文字数制限、バリデーション等）
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any


class MessageRole(str, Enum):
    """メッセージの役割を表す列挙型"""
    USER = "user"  # ユーザーメッセージ
    AI = "ai"  # AI応答
    SYSTEM = "system"  # システムメッセージ（要約、コンテキスト等）
    TOOL = "tool"  # ツール実行結果


@dataclass(frozen=True)
class Message:
    """
    メッセージエンティティ（不変オブジェクト）

    チャット会話における1つのメッセージを表現します。
    frozen=Trueにより不変性を保証し、意図しない状態変更を防ぎます。

    Attributes:
        role: メッセージの役割（user, ai, system, tool）
        content: メッセージの内容
        timestamp: メッセージ作成日時
        metadata: 追加のメタデータ（任意）
    """
    role: MessageRole
    content: str
    timestamp: datetime = field(default_factory=datetime.utcnow)
    metadata: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        """初期化後のバリデーション"""
        # contentの検証
        if not self.content or not self.content.strip():
            raise ValueError("Message content cannot be empty")

        # 極端に長いメッセージの検出（100万文字以上）
        if len(self.content) > 1_000_000:
            raise ValueError(
                f"Message content too long: {len(self.content)} characters "
                "(max 1,000,000)"
            )

    @classmethod
    def create_user_message(
        cls,
        content: str,
        timestamp: datetime | None = None,
        metadata: dict[str, Any] | None = None
    ) -> "Message":
        """ユーザーメッセージを作成するファクトリーメソッド"""
        return cls(
            role=MessageRole.USER,
            content=content,
            timestamp=timestamp or datetime.utcnow(),
            metadata=metadata or {}
        )

    @classmethod
    def create_ai_message(
        cls,
        content: str,
        timestamp: datetime | None = None,
        metadata: dict[str, Any] | None = None
    ) -> "Message":
        """AI応答メッセージを作成するファクトリーメソッド"""
        return cls(
            role=MessageRole.AI,
            content=content,
            timestamp=timestamp or datetime.utcnow(),
            metadata=metadata or {}
        )

    @classmethod
    def create_system_message(
        cls,
        content: str,
        timestamp: datetime | None = None,
        metadata: dict[str, Any] | None = None
    ) -> "Message":
        """システムメッセージを作成するファクトリーメソッド"""
        return cls(
            role=MessageRole.SYSTEM,
            content=content,
            timestamp=timestamp or datetime.utcnow(),
            metadata=metadata or {}
        )

    @classmethod
    def create_tool_message(
        cls,
        content: str,
        tool_name: str,
        timestamp: datetime | None = None,
        metadata: dict[str, Any] | None = None
    ) -> "Message":
        """ツール実行結果メッセージを作成するファクトリーメソッド"""
        meta = metadata or {}
        meta["tool_name"] = tool_name
        return cls(
            role=MessageRole.TOOL,
            content=content,
            timestamp=timestamp or datetime.utcnow(),
            metadata=meta
        )

    def is_user_message(self) -> bool:
        """ユーザーメッセージかどうか"""
        return self.role == MessageRole.USER

    def is_ai_message(self) -> bool:
        """AI応答メッセージかどうか"""
        return self.role == MessageRole.AI

    def is_system_message(self) -> bool:
        """システムメッセージかどうか"""
        return self.role == MessageRole.SYSTEM

    def is_tool_message(self) -> bool:
        """ツールメッセージかどうか"""
        return self.role == MessageRole.TOOL

    def get_character_count(self) -> int:
        """文字数を取得"""
        return len(self.content)

    def to_dict(self) -> dict[str, Any]:
        """辞書形式に変換（シリアライゼーション用）"""
        return {
            "role": self.role.value,
            "content": self.content,
            "timestamp": self.timestamp.isoformat(),
            "metadata": self.metadata
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Message":
        """辞書から復元（デシリアライゼーション用）"""
        return cls(
            role=MessageRole(data["role"]),
            content=data["content"],
            timestamp=datetime.fromisoformat(data["timestamp"]),
            metadata=data.get("metadata", {})
        )


@dataclass(frozen=True)
class LLMCommand:
    """
    LLMが生成するコマンドエンティティ

    LLMがファイル操作などのアクションを指示する際のコマンドを表現します。

    Attributes:
        action: アクション名（create_file, edit_file, delete_file等）
        title: ファイル名（フラット構造）
        new_title: リネーム時の新しいファイル名
        content: ファイルの内容
        category: カテゴリー（階層パス形式: "研究/AI"）
        tags: タグリスト
        start_line: 開始行（行ベース編集用、1-based）
        end_line: 終了行（行ベース編集用、1-based）
    """
    action: str
    title: str | None = None
    new_title: str | None = None
    content: str | None = None
    category: str | None = None
    tags: list[str] | None = None
    start_line: int | None = None
    end_line: int | None = None

    def __post_init__(self):
        """初期化後のバリデーション"""
        if not self.action:
            raise ValueError("Command action cannot be empty")

        # 行番号のバリデーション
        if self.start_line is not None and self.start_line < 1:
            raise ValueError("start_line must be >= 1")
        if self.end_line is not None and self.end_line < 1:
            raise ValueError("end_line must be >= 1")
        if (self.start_line is not None and self.end_line is not None
            and self.start_line > self.end_line):
            raise ValueError("start_line must be <= end_line")

    def is_file_creation(self) -> bool:
        """ファイル作成コマンドかどうか"""
        return self.action == "create_file"

    def is_file_edit(self) -> bool:
        """ファイル編集コマンドかどうか"""
        return self.action in ["edit_file", "edit_file_lines"]

    def is_file_deletion(self) -> bool:
        """ファイル削除コマンドかどうか"""
        return self.action == "delete_file"

    def is_file_rename(self) -> bool:
        """ファイルリネームコマンドかどうか"""
        return self.action == "rename_file"

    def to_dict(self) -> dict[str, Any]:
        """辞書形式に変換"""
        result = {"action": self.action}
        if self.title is not None:
            result["title"] = self.title
        if self.new_title is not None:
            result["new_title"] = self.new_title
        if self.content is not None:
            result["content"] = self.content
        if self.category is not None:
            result["category"] = self.category
        if self.tags is not None:
            result["tags"] = self.tags
        if self.start_line is not None:
            result["start_line"] = self.start_line
        if self.end_line is not None:
            result["end_line"] = self.end_line
        return result
