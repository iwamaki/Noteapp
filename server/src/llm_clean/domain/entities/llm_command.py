"""LLMCommand Entity

Domain entity representing a command extracted from LLM output.
Commands are actions that the LLM wants to perform on files/notes.
"""
from typing import Any, Literal

from pydantic import BaseModel, field_validator

# Define allowed actions as a type
CommandAction = Literal[
    "create_file",
    "edit_file",
    "edit_file_lines",
    "delete_file",
    "rename_file",
    "search_files",
    "read_file"
]


class LLMCommand(BaseModel):
    """LLM Command entity

    Represents a command that the LLM wants to execute on the system.
    This is a domain entity that encapsulates command validation and behavior.

    Attributes:
        action: The action to perform
        title: The file name (flat structure identification)
        new_title: New file name (for rename operations)
        content: File content (for create/edit operations)
        category: Category path (hierarchical: "研究/AI")
        tags: List of tags for the file
        start_line: Start line for line-based editing (1-based, inclusive)
        end_line: End line for line-based editing (1-based, inclusive)
    """

    action: str
    title: str | None = None
    new_title: str | None = None
    content: str | None = None
    category: str | None = None
    tags: list[str] | None = None
    start_line: int | None = None
    end_line: int | None = None

    @field_validator("action")
    @classmethod
    def validate_action(cls, v: str) -> str:
        """Validate that action is one of the allowed actions"""
        allowed_actions = {
            "create_file",
            "edit_file",
            "edit_file_lines",
            "delete_file",
            "rename_file",
            "search_files",
            "read_file"
        }
        if v not in allowed_actions:
            raise ValueError(f"Invalid action: {v}. Must be one of {allowed_actions}")
        return v

    @field_validator("start_line", "end_line")
    @classmethod
    def validate_line_numbers(cls, v: int | None) -> int | None:
        """Validate that line numbers are positive"""
        if v is not None and v < 1:
            raise ValueError("Line numbers must be positive (1-based)")
        return v

    def is_file_operation(self) -> bool:
        """Check if this command is a file operation"""
        file_operations = {
            "create_file",
            "edit_file",
            "edit_file_lines",
            "delete_file",
            "rename_file",
            "read_file"
        }
        return self.action in file_operations

    def is_search_operation(self) -> bool:
        """Check if this command is a search operation"""
        return self.action == "search_files"

    def requires_title(self) -> bool:
        """Check if this command requires a title"""
        return self.action in {
            "create_file",
            "edit_file",
            "edit_file_lines",
            "delete_file",
            "rename_file",
            "read_file"
        }

    def requires_content(self) -> bool:
        """Check if this command requires content"""
        return self.action in {"create_file", "edit_file"}

    def is_line_based_edit(self) -> bool:
        """Check if this is a line-based edit command"""
        return self.action == "edit_file_lines"

    def validate_command(self) -> None:
        """Validate that the command has all required fields

        Raises:
            ValueError: If validation fails
        """
        if self.requires_title() and not self.title:
            raise ValueError(f"Action '{self.action}' requires a title")

        if self.requires_content() and not self.content:
            raise ValueError(f"Action '{self.action}' requires content")

        if self.action == "rename_file" and not self.new_title:
            raise ValueError("Rename action requires new_title")

        if self.is_line_based_edit():
            if self.start_line is None or self.end_line is None:
                raise ValueError("Line-based edit requires start_line and end_line")
            if self.start_line > self.end_line:
                raise ValueError("start_line must be less than or equal to end_line")

    def get_target_identifier(self) -> str | None:
        """Get the target identifier for this command

        Returns:
            The title or None if not applicable
        """
        return self.title

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary format"""
        result: dict[str, Any] = {
            "action": self.action
        }

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

    class Config:
        """Pydantic configuration"""
        validate_assignment = True
