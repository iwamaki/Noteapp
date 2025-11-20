"""Chat Context Value Object

Immutable value object representing the context of a chat conversation.
"""
from typing import Any, Literal

from pydantic import BaseModel, Field


class FilelistScreenContext(BaseModel):
    """File list screen context value object

    Represents the state of the file list screen.
    Note: visibleFileList is deprecated (redundant).
    All file information is sent as ChatContext.allFiles.

    Attributes:
        name: Screen identifier (always "filelist")
    """

    name: Literal["filelist"] = "filelist"

    class Config:
        """Pydantic configuration"""
        frozen = True


class EditScreenContext(BaseModel):
    """Edit screen context value object

    Represents the state of the edit screen.

    Attributes:
        name: Screen identifier (always "edit")
        file_path: Path to the file being edited
        file_content: Content of the file being edited
    """

    name: Literal["edit"] = "edit"
    file_path: str = Field(alias="filePath")
    file_content: str = Field(alias="fileContent")

    class Config:
        """Pydantic configuration"""
        frozen = True
        populate_by_name = True


class ChatContext(BaseModel):
    """Chat context value object

    Represents the complete context for a chat conversation,
    including file information, directory structure, and conversation history.

    This is an immutable value object that captures the state at a point in time.

    Attributes:
        current_path: Current working directory path
        file_list: List of files in the current directory
        current_file: Currently selected file name
        current_file_content: Currently open file content
        attached_file_content: List of attached file contents
        conversation_history: Previous conversation messages
        active_screen: Currently active screen (filelist or edit)
        all_files: All files in the system
        send_file_context_to_llm: Whether to send file context to LLM
    """

    current_path: str | None = Field(None, alias="currentPath")
    file_list: list[dict[str, Any]] | None = Field(None, alias="fileList")
    current_file: str | None = Field(None, alias="currentFile")
    current_file_content: dict[str, str | None] | None = Field(
        None, alias="currentFileContent"
    )
    attached_file_content: list[dict[str, str]] | None = Field(
        None, alias="attachedFileContent"
    )
    conversation_history: list[dict[str, Any]] | None = Field(
        None, alias="conversationHistory"
    )
    active_screen: FilelistScreenContext | EditScreenContext | None = Field(
        None, discriminator="name", alias="activeScreen"
    )
    all_files: list[dict[str, Any]] | None = Field(None, alias="allFiles")
    send_file_context_to_llm: bool | None = Field(
        None, alias="sendFileContextToLLM"
    )

    def has_current_file(self) -> bool:
        """Check if there is a current file

        Returns:
            True if current_file is set
        """
        return self.current_file is not None

    def has_file_context(self) -> bool:
        """Check if file context should be sent to LLM

        Returns:
            True if file context should be sent
        """
        return self.send_file_context_to_llm is True

    def has_conversation_history(self) -> bool:
        """Check if there is conversation history

        Returns:
            True if conversation_history is not empty
        """
        return (
            self.conversation_history is not None
            and len(self.conversation_history) > 0
        )

    def get_conversation_history_count(self) -> int:
        """Get the number of messages in conversation history

        Returns:
            Number of messages
        """
        if self.conversation_history is None:
            return 0
        return len(self.conversation_history)

    def has_attached_files(self) -> bool:
        """Check if there are attached files

        Returns:
            True if attached_file_content is not empty
        """
        return (
            self.attached_file_content is not None
            and len(self.attached_file_content) > 0
        )

    def get_attached_file_count(self) -> int:
        """Get the number of attached files

        Returns:
            Number of attached files
        """
        if self.attached_file_content is None:
            return 0
        return len(self.attached_file_content)

    def is_filelist_screen(self) -> bool:
        """Check if the active screen is filelist

        Returns:
            True if active screen is filelist
        """
        return isinstance(self.active_screen, FilelistScreenContext)

    def is_edit_screen(self) -> bool:
        """Check if the active screen is edit

        Returns:
            True if active screen is edit
        """
        return isinstance(self.active_screen, EditScreenContext)

    def get_total_file_count(self) -> int:
        """Get the total number of files in the system

        Returns:
            Number of files in all_files
        """
        if self.all_files is None:
            return 0
        return len(self.all_files)

    class Config:
        """Pydantic configuration"""
        frozen = True  # Value objects are immutable
        populate_by_name = True
