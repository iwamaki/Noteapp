"""Command Extractor Domain Service

Domain service for extracting LLM commands from agent execution results.
"""
from collections.abc import Callable
from typing import Any

from ..entities.llm_command import LLMCommand


class CommandExtractorService:
    """Command Extractor domain service

    Extracts and converts tool calls from LLM agent results into LLMCommand entities.

    This is a domain service that encapsulates the business logic for
    extracting commands from agent execution results.

    Responsibilities:
    - Parse agent execution results (LangChain format)
    - Convert tool calls to LLMCommand entities
    - Support extensibility for new tool types
    """

    def __init__(self):
        """Initialize command extractor

        Registers tool handlers for each supported tool type.
        """
        self._handlers: dict[str, Callable[[dict[str, Any]], LLMCommand | None]] = {
            # File operation tools (flat structure)
            'create_file': self._handle_create_file,
            'delete_file': self._handle_delete_file,
            'rename_file': self._handle_rename_file,
            'edit_file': self._handle_edit_file,
            'edit_file_lines': self._handle_edit_file_lines,
            'read_file': self._handle_read_file,
        }

    def extract_commands(self, agent_result: dict[str, Any]) -> list[LLMCommand] | None:
        """Extract commands from agent execution result

        Supports both LangChain 1.0 messages format and legacy intermediate_steps format.

        Args:
            agent_result: Agent execution result
                - LangChain 1.0: {"messages": [...]}
                - Legacy: {"intermediate_steps": [...]}

        Returns:
            List of extracted LLMCommand entities, or None if no commands found
        """
        commands: list[LLMCommand] = []

        # LangChain 1.0: Extract tool calls from messages
        messages = agent_result.get("messages", [])
        for message in messages:
            # Check if message has tool_calls attribute
            if hasattr(message, 'tool_calls'):
                tool_calls = getattr(message, 'tool_calls', []) or []
                for tool_call in tool_calls:
                    command = self._process_tool_call(tool_call)
                    if command:
                        commands.append(command)

        # Fallback: Support legacy intermediate_steps format
        intermediate_steps = agent_result.get("intermediate_steps", [])
        if intermediate_steps:
            for action, observation in intermediate_steps:
                command = self._process_action(action)
                if command:
                    commands.append(command)

        return commands if commands else None

    def _process_tool_call(self, tool_call: Any) -> LLMCommand | None:
        """Process a tool call and convert to command (LangChain 1.0 format)

        Args:
            tool_call: Tool call information
                Example: {"name": "create_file", "args": {...}, "id": "call_xxx"}

        Returns:
            Converted LLMCommand, or None if conversion fails
        """
        if not isinstance(tool_call, dict):
            return None

        tool_name = tool_call.get('name')
        if not tool_name or not isinstance(tool_name, str):
            return None

        tool_input = tool_call.get('args', {})

        # Get handler for this tool
        handler = self._handlers.get(tool_name)
        if not handler:
            return None

        # Execute handler
        try:
            return handler(tool_input)
        except Exception:
            return None

    def _process_action(self, action: Any) -> LLMCommand | None:
        """Process an action and convert to command (legacy format)

        Args:
            action: Agent action object

        Returns:
            Converted LLMCommand, or None if conversion fails
        """
        if not hasattr(action, 'tool'):
            return None

        tool_name = action.tool
        tool_input = action.tool_input

        # Get handler for this tool
        handler = self._handlers.get(tool_name)
        if not handler:
            return None

        # Execute handler
        try:
            return handler(tool_input)
        except Exception:
            return None

    def _handle_create_file(self, tool_input: dict[str, Any]) -> LLMCommand | None:
        """Handle create_file tool (flat structure)

        Args:
            tool_input: Tool input parameters

        Returns:
            LLMCommand for file creation
        """
        title = tool_input.get('title')
        content = tool_input.get('content', '')
        category = tool_input.get('category', '')
        tags = tool_input.get('tags', '')

        if not title:
            return None

        # Convert comma-separated string to list (tags only)
        tags_list = [t.strip() for t in tags.split(',')] if tags else []

        return LLMCommand(
            action='create_file',
            title=title,
            content=content,
            category=category if category else None,
            tags=tags_list if tags_list else None
        )

    def _handle_delete_file(self, tool_input: dict[str, Any]) -> LLMCommand | None:
        """Handle delete_file tool (flat structure)

        Args:
            tool_input: Tool input parameters

        Returns:
            LLMCommand for file deletion
        """
        title = tool_input.get('title')

        if not title:
            return None

        return LLMCommand(
            action='delete_file',
            title=title
        )

    def _handle_rename_file(self, tool_input: dict[str, Any]) -> LLMCommand | None:
        """Handle rename_file tool (flat structure)

        Args:
            tool_input: Tool input parameters

        Returns:
            LLMCommand for file renaming
        """
        title = tool_input.get('title')
        new_title = tool_input.get('new_title')

        if not title or not new_title:
            return None

        return LLMCommand(
            action='rename_file',
            title=title,
            new_title=new_title
        )

    def _handle_edit_file(self, tool_input: dict[str, Any]) -> LLMCommand | None:
        """Handle edit_file tool (flat structure)

        Args:
            tool_input: Tool input parameters

        Returns:
            LLMCommand for file editing
        """
        title = tool_input.get('title')
        content = tool_input.get('content')

        if not title:
            return None

        return LLMCommand(
            action='edit_file',
            title=title,
            content=content
        )

    def _handle_edit_file_lines(self, tool_input: dict[str, Any]) -> LLMCommand | None:
        """Handle edit_file_lines tool (partial edit)

        Args:
            tool_input: Tool input parameters

        Returns:
            LLMCommand for line-based file editing
        """
        title = tool_input.get('title')
        start_line = tool_input.get('start_line')
        end_line = tool_input.get('end_line')
        content = tool_input.get('content', '')

        if not title:
            return None

        if start_line is None or end_line is None:
            return None

        # Convert float to int if needed (LLM sometimes returns float)
        start_line_int = int(start_line)
        end_line_int = int(end_line)

        return LLMCommand(
            action='edit_file_lines',
            title=title,
            content=content,
            start_line=start_line_int,
            end_line=end_line_int
        )

    def _handle_read_file(self, tool_input: dict[str, Any]) -> LLMCommand | None:
        """Handle read_file tool (flat structure)

        Note:
            read_file does not require frontend execution,
            so no command is generated (returns None).

        Args:
            tool_input: Tool input parameters

        Returns:
            None (read_file does not generate commands)
        """
        # read_file is completed in backend, no command needed
        return None

    def register_handler(
        self,
        tool_name: str,
        handler: Callable[[dict[str, Any]], LLMCommand | None]
    ) -> None:
        """Register a new tool handler (extension point)

        Args:
            tool_name: Tool name
            handler: Handler function that converts tool input to LLMCommand
        """
        self._handlers[tool_name] = handler

    def get_supported_tools(self) -> list[str]:
        """Get list of supported tool names

        Returns:
            List of tool names
        """
        return list(self._handlers.keys())
