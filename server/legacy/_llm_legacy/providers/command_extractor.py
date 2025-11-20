# @file command_extractor.py
# @summary エージェント実行結果からLLMCommandを抽出するクラスを提供します。
# @responsibility エージェントの実行結果から、フロントエンドで実行すべきコマンドを抽出・変換します。

from collections.abc import Callable
from typing import Any

from langchain_core.messages import AIMessage
from src.llm.models import LLMCommand

from src.core.logger import logger


class AgentCommandExtractor:
    """エージェント実行結果からコマンドを抽出するクラス

    責務:
    - AgentExecutorのintermediate_stepsからツール呼び出し情報を解析
    - ツール呼び出しをLLMCommandオブジェクトに変換
    - 新しいツールタイプの追加を容易にする拡張可能な設計
    """

    def __init__(self):
        """コンストラクタ

        ツールタイプごとの変換ハンドラーを登録します。
        フラット構造用のツールハンドラーを含みます。
        """
        self._handlers: dict[str, Callable[[dict[str, Any]], LLMCommand | None]] = {
            # フラット構造用ツール
            'create_file': self._handle_create_file,
            'delete_file': self._handle_delete_file,
            'rename_file': self._handle_rename_file,
            'edit_file': self._handle_edit_file,
            'edit_file_lines': self._handle_edit_file_lines,
            'read_file': self._handle_read_file,
        }

    def extract_commands(self, agent_result: dict[str, Any]) -> list[LLMCommand] | None:
        """エージェント実行結果からコマンドを抽出

        LangChain 1.0の新しいmessages形式と、旧形式のintermediate_steps形式の両方をサポートします。

        Args:
            agent_result: エージェントの実行結果
                - LangChain 1.0: {"messages": [...]}
                - 旧形式: {"intermediate_steps": [...]}

        Returns:
            抽出されたコマンドのリスト（なければNone）
        """
        commands: list[LLMCommand] = []

        # LangChain 1.0: messagesリストからツール呼び出しを抽出
        messages = agent_result.get("messages", [])
        for message in messages:
            if isinstance(message, AIMessage) and hasattr(message, 'tool_calls'):
                tool_calls = getattr(message, 'tool_calls', []) or []
                for tool_call in tool_calls:
                    command = self._process_tool_call(tool_call)
                    if command:
                        commands.append(command)

        # フォールバック: 旧形式（intermediate_steps）もサポート
        intermediate_steps = agent_result.get("intermediate_steps", [])
        if intermediate_steps:
            for action, _observation in intermediate_steps:
                command = self._process_action(action)
                if command:
                    commands.append(command)

        if commands:
            logger.debug({
                "extracted_commands_count": len(commands),
                "command_types": [cmd.action for cmd in commands]
            })

        return commands if commands else None

    def _process_tool_call(self, tool_call: Any) -> LLMCommand | None:
        """ツール呼び出しを処理してコマンドに変換（LangChain 1.0形式）

        Args:
            tool_call: ツール呼び出し情報
                例: {"name": "create_file", "args": {...}, "id": "call_xxx", "type": "tool_call"}

        Returns:
            変換されたLLMCommand（変換できない場合はNone）
        """
        if not isinstance(tool_call, dict):
            logger.warning("tool_call is not a dict")
            return None

        tool_name = tool_call.get('name')
        if not tool_name or not isinstance(tool_name, str):
            logger.warning("tool_call does not have a valid 'name' field")
            return None

        tool_input = tool_call.get('args', {})

        # ハンドラーが登録されているか確認
        handler = self._handlers.get(tool_name)
        if not handler:
            logger.debug(f"No handler registered for tool: {tool_name}")
            return None

        # ハンドラーを実行
        try:
            return handler(tool_input)
        except Exception as e:
            logger.error(f"Error processing {tool_name}: {e}")
            return None

    def _process_action(self, action: Any) -> LLMCommand | None:
        """個別のアクションを処理してコマンドに変換

        Args:
            action: エージェントアクション

        Returns:
            変換されたLLMCommand（変換できない場合はNone）
        """
        if not hasattr(action, 'tool'):
            logger.warning("Action does not have 'tool' attribute")
            return None

        tool_name = action.tool
        tool_input = action.tool_input

        # ハンドラーが登録されているか確認
        handler = self._handlers.get(tool_name)
        if not handler:
            logger.debug(f"No handler registered for tool: {tool_name}")
            return None

        # ハンドラーを実行
        try:
            return handler(tool_input)
        except Exception as e:
            logger.error(f"Error processing {tool_name}: {e}")
            return None

    def _handle_create_file(self, tool_input: dict[str, Any]) -> LLMCommand | None:
        """create_fileツールの処理（フラット構造）

        Args:
            tool_input: ツールの入力パラメータ

        Returns:
            LLMCommand
        """
        title = tool_input.get('title')
        content = tool_input.get('content', '')
        category = tool_input.get('category', '')
        tags = tool_input.get('tags', '')

        if not title:
            logger.warning("create_file: title is missing")
            return None

        # カンマ区切り文字列を配列に変換（tagsのみ）
        tags_list = [t.strip() for t in tags.split(',')] if tags else []

        return LLMCommand(
            action='create_file',
            title=title,
            content=content,
            category=category if category else None,
            tags=tags_list if tags_list else None
        )

    def _handle_delete_file(self, tool_input: dict[str, Any]) -> LLMCommand | None:
        """delete_fileツールの処理（フラット構造）

        Args:
            tool_input: ツールの入力パラメータ

        Returns:
            LLMCommand
        """
        title = tool_input.get('title')

        if not title:
            logger.warning("delete_file: title is missing")
            return None

        return LLMCommand(
            action='delete_file',
            title=title
        )

    def _handle_rename_file(self, tool_input: dict[str, Any]) -> LLMCommand | None:
        """rename_fileツールの処理（フラット構造）

        Args:
            tool_input: ツールの入力パラメータ

        Returns:
            LLMCommand
        """
        title = tool_input.get('title')
        new_title = tool_input.get('new_title')

        if not title or not new_title:
            logger.warning("rename_file: title or new_title is missing")
            return None

        return LLMCommand(
            action='rename_file',
            title=title,
            new_title=new_title
        )

    def _handle_edit_file(self, tool_input: dict[str, Any]) -> LLMCommand | None:
        """edit_fileツールの処理（フラット構造）

        Args:
            tool_input: ツールの入力パラメータ

        Returns:
            LLMCommand
        """
        title = tool_input.get('title')
        content = tool_input.get('content')

        if not title:
            logger.warning("edit_file: title is missing")
            return None

        return LLMCommand(
            action='edit_file',
            title=title,
            content=content
        )

    def _handle_edit_file_lines(self, tool_input: dict[str, Any]) -> LLMCommand | None:
        """edit_file_linesツールの処理（部分編集）

        Args:
            tool_input: ツールの入力パラメータ

        Returns:
            LLMCommand
        """
        title = tool_input.get('title')
        start_line = tool_input.get('start_line')
        end_line = tool_input.get('end_line')
        content = tool_input.get('content', '')

        if not title:
            logger.warning("edit_file_lines: title is missing")
            return None

        if start_line is None or end_line is None:
            logger.warning("edit_file_lines: start_line or end_line is missing")
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
        """read_fileツールの処理（フラット構造）

        Note:
            read_fileはフロントエンドでの実行が不要なため、
            コマンドは生成しません（Noneを返す）。

        Args:
            tool_input: ツールの入力パラメータ

        Returns:
            None（read_fileはコマンド生成不要）
        """
        # read_fileはバックエンド内で完結するため、コマンド生成不要
        return None


    def register_handler(
        self,
        tool_name: str,
        handler: Callable[[dict[str, Any]], LLMCommand | None]
    ) -> None:
        """新しいツールハンドラーを登録（拡張ポイント）

        Args:
            tool_name: ツール名
            handler: ツール入力をLLMCommandに変換するハンドラー関数
        """
        self._handlers[tool_name] = handler
        logger.info(f"Registered handler for tool: {tool_name}")
