# @file command_extractor.py
# @summary エージェント実行結果からLLMCommandを抽出するクラスを提供します。
# @responsibility AgentExecutorの実行結果から、フロントエンドで実行すべきコマンドを抽出・変換します。

from typing import List, Optional, Dict, Any, Callable
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
        """
        self._handlers: Dict[str, Callable[[Dict[str, Any]], Optional[LLMCommand]]] = {
            'edit_file': self._handle_edit_file,
            'create_directory': self._handle_create_directory,
            'move_item': self._handle_move_item,
            'delete_item': self._handle_delete_item,
        }

    def extract_commands(self, agent_result: Dict[str, Any]) -> Optional[List[LLMCommand]]:
        """エージェント実行結果からコマンドを抽出

        Args:
            agent_result: AgentExecutorの実行結果

        Returns:
            抽出されたコマンドのリスト（なければNone）
        """
        commands: List[LLMCommand] = []
        intermediate_steps = agent_result.get("intermediate_steps", [])

        for action, observation in intermediate_steps:
            command = self._process_action(action)
            if command:
                commands.append(command)

        if commands:
            logger.debug({
                "extracted_commands_count": len(commands),
                "command_types": [cmd.action for cmd in commands]
            })

        return commands if commands else None

    def _process_action(self, action: Any) -> Optional[LLMCommand]:
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

    def _handle_edit_file(self, tool_input: Dict[str, Any]) -> Optional[LLMCommand]:
        """edit_fileツールの処理

        Args:
            tool_input: ツールの入力パラメータ

        Returns:
            LLMCommand
        """
        filename = tool_input.get('filename')
        content = tool_input.get('content')

        if not filename:
            logger.warning("edit_file: filename is missing")
            return None

        return LLMCommand(
            action='edit_file',
            path=filename,
            content=content
        )

    def _handle_create_directory(self, tool_input: Dict[str, Any]) -> Optional[LLMCommand]:
        """create_directoryツールの処理

        Args:
            tool_input: ツールの入力パラメータ

        Returns:
            LLMCommand
        """
        path = tool_input.get('path', '/')
        name = tool_input.get('name')

        if not name:
            logger.warning("create_directory: name is missing")
            return None

        return LLMCommand(
            action='create_directory',
            path=path,
            content=name
        )

    def _handle_move_item(self, tool_input: Dict[str, Any]) -> Optional[LLMCommand]:
        """move_itemツールの処理

        Args:
            tool_input: ツールの入力パラメータ

        Returns:
            LLMCommand
        """
        source_path = tool_input.get('source_path')
        dest_path = tool_input.get('dest_path')

        if not source_path or not dest_path:
            logger.warning("move_item: source_path or dest_path is missing")
            return None

        return LLMCommand(
            action='move_item',
            source=source_path,
            destination=dest_path
        )

    def _handle_delete_item(self, tool_input: Dict[str, Any]) -> Optional[LLMCommand]:
        """delete_itemツールの処理

        Args:
            tool_input: ツールの入力パラメータ

        Returns:
            LLMCommand
        """
        path = tool_input.get('path')

        if not path:
            logger.warning("delete_item: path is missing")
            return None

        return LLMCommand(
            action='delete_item',
            path=path
        )

    def register_handler(
        self,
        tool_name: str,
        handler: Callable[[Dict[str, Any]], Optional[LLMCommand]]
    ) -> None:
        """新しいツールハンドラーを登録（拡張ポイント）

        Args:
            tool_name: ツール名
            handler: ツール入力をLLMCommandに変換するハンドラー関数
        """
        self._handlers[tool_name] = handler
        logger.info(f"Registered handler for tool: {tool_name}")
