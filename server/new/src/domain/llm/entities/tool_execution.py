"""
LLM Domain - ToolExecution Entity

ツール実行エンティティを定義します。
LLMエージェントによるツール（関数）の実行情報を管理するドメインオブジェクトです。

責務:
- ツール実行の記録と状態管理
- 実行結果の保持
- エラーハンドリング情報の管理
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any
from uuid import uuid4


class ToolExecutionStatus(str, Enum):
    """ツール実行ステータス"""
    PENDING = "pending"  # 実行待ち
    RUNNING = "running"  # 実行中
    COMPLETED = "completed"  # 完了（成功）
    FAILED = "failed"  # 失敗


@dataclass
class ToolExecution:
    """
    ツール実行エンティティ

    LLMがツール（関数）を実行した際の情報を管理します。
    実行パラメータ、結果、エラー情報などを保持します。

    Attributes:
        id: 実行の一意識別子
        tool_name: ツール名（例: "read_file", "search_files"）
        arguments: ツールに渡された引数
        status: 実行ステータス
        result: 実行結果（成功時）
        error: エラー情報（失敗時）
        started_at: 実行開始日時
        completed_at: 実行完了日時
        duration_ms: 実行時間（ミリ秒）
        metadata: 追加のメタデータ
    """
    tool_name: str
    arguments: dict[str, Any]
    id: str = field(default_factory=lambda: str(uuid4()))
    status: ToolExecutionStatus = ToolExecutionStatus.PENDING
    result: Any | None = None
    error: str | None = None
    started_at: datetime = field(default_factory=datetime.utcnow)
    completed_at: datetime | None = None
    duration_ms: int | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        """初期化後のバリデーション"""
        if not self.tool_name:
            raise ValueError("tool_name cannot be empty")
        if not isinstance(self.arguments, dict):
            raise ValueError("arguments must be a dictionary")

    def start_execution(self) -> None:
        """実行を開始"""
        if self.status != ToolExecutionStatus.PENDING:
            raise ValueError(f"Cannot start execution: current status is {self.status}")
        self.status = ToolExecutionStatus.RUNNING
        self.started_at = datetime.utcnow()

    def complete_execution(self, result: Any) -> None:
        """
        実行を成功で完了

        Args:
            result: 実行結果
        """
        if self.status != ToolExecutionStatus.RUNNING:
            raise ValueError(f"Cannot complete execution: current status is {self.status}")

        self.status = ToolExecutionStatus.COMPLETED
        self.result = result
        self.completed_at = datetime.utcnow()
        self._calculate_duration()

    def fail_execution(self, error: str) -> None:
        """
        実行を失敗で完了

        Args:
            error: エラーメッセージ
        """
        if self.status != ToolExecutionStatus.RUNNING:
            raise ValueError(f"Cannot fail execution: current status is {self.status}")

        self.status = ToolExecutionStatus.FAILED
        self.error = error
        self.completed_at = datetime.utcnow()
        self._calculate_duration()

    def _calculate_duration(self) -> None:
        """実行時間を計算（ミリ秒単位）"""
        if self.completed_at:
            delta = self.completed_at - self.started_at
            self.duration_ms = int(delta.total_seconds() * 1000)

    def is_pending(self) -> bool:
        """実行待ち状態かどうか"""
        return self.status == ToolExecutionStatus.PENDING

    def is_running(self) -> bool:
        """実行中かどうか"""
        return self.status == ToolExecutionStatus.RUNNING

    def is_completed(self) -> bool:
        """完了（成功）したかどうか"""
        return self.status == ToolExecutionStatus.COMPLETED

    def is_failed(self) -> bool:
        """失敗したかどうか"""
        return self.status == ToolExecutionStatus.FAILED

    def is_finished(self) -> bool:
        """実行が終了（成功または失敗）したかどうか"""
        return self.status in (ToolExecutionStatus.COMPLETED, ToolExecutionStatus.FAILED)

    def get_argument(self, key: str, default: Any = None) -> Any:
        """
        引数を取得

        Args:
            key: 引数のキー
            default: デフォルト値

        Returns:
            引数の値
        """
        return self.arguments.get(key, default)

    def to_dict(self) -> dict[str, Any]:
        """辞書形式に変換（シリアライゼーション用）"""
        return {
            "id": self.id,
            "tool_name": self.tool_name,
            "arguments": self.arguments,
            "status": self.status.value,
            "result": self.result,
            "error": self.error,
            "started_at": self.started_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "duration_ms": self.duration_ms,
            "metadata": self.metadata
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "ToolExecution":
        """辞書から復元（デシリアライゼーション用）"""
        return cls(
            id=data["id"],
            tool_name=data["tool_name"],
            arguments=data["arguments"],
            status=ToolExecutionStatus(data["status"]),
            result=data.get("result"),
            error=data.get("error"),
            started_at=datetime.fromisoformat(data["started_at"]),
            completed_at=(
                datetime.fromisoformat(data["completed_at"])
                if data.get("completed_at")
                else None
            ),
            duration_ms=data.get("duration_ms"),
            metadata=data.get("metadata", {})
        )

    def __repr__(self) -> str:
        return (
            f"ToolExecution(id={self.id}, "
            f"tool_name={self.tool_name}, "
            f"status={self.status.value}, "
            f"duration_ms={self.duration_ms})"
        )
