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
        フラット構造用のツールハンドラーを含みます。
        """
        self._handlers: Dict[str, Callable[[Dict[str, Any]], Optional[LLMCommand]]] = {
            # フラット構造用ツール
            'create_file': self._handle_create_file,
            'delete_file': self._handle_delete_file,
            'rename_file': self._handle_rename_file,
            'edit_file': self._handle_edit_file,
            'read_file': self._handle_read_file,
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

    def _handle_create_file(self, tool_input: Dict[str, Any]) -> Optional[LLMCommand]:
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

    def _handle_delete_file(self, tool_input: Dict[str, Any]) -> Optional[LLMCommand]:
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

    def _handle_rename_file(self, tool_input: Dict[str, Any]) -> Optional[LLMCommand]:
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

    def _handle_edit_file(self, tool_input: Dict[str, Any]) -> Optional[LLMCommand]:
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

    def _handle_read_file(self, tool_input: Dict[str, Any]) -> Optional[LLMCommand]:
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
        handler: Callable[[Dict[str, Any]], Optional[LLMCommand]]
    ) -> None:
        """新しいツールハンドラーを登録（拡張ポイント）

        Args:
            tool_name: ツール名
            handler: ツール入力をLLMCommandに変換するハンドラー関数
        """
        self._handlers[tool_name] = handler
        logger.info(f"Registered handler for tool: {tool_name}")
