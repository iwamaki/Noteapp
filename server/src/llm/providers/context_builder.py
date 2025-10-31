# @file context_builder.py
# @summary チャットコンテキストの構築を担当するビルダークラスを提供します。
# @responsibility ChatContextから必要な情報を抽出し、LLMとツールに渡すコンテキストを構築します。

from typing import List, Optional, Dict, Any
from dataclasses import dataclass
from langchain.schema import BaseMessage, HumanMessage, AIMessage

from src.llm.models import ChatContext, EditScreenContext, FilelistScreenContext
from src.llm.tools.context_manager import set_file_context, set_directory_context, set_all_files_context
from src.llm.providers.config import (
    CONTEXT_MSG_EDIT_SCREEN,
    CONTEXT_MSG_FILELIST_SCREEN,
    CONTEXT_MSG_ATTACHED_FILE,
    DEFAULT_ROOT_PATH
)
from src.core.logger import logger


@dataclass
class BuiltContext:
    """構築されたコンテキスト情報を保持するデータクラス"""
    chat_history: List[BaseMessage]
    """LLMに渡す会話履歴（コンテキストメッセージを含む）"""

    history_count: int
    """元の会話履歴の件数"""

    has_file_context: bool
    """ファイルコンテキストが設定されたかどうか"""


class ChatContextBuilder:
    """チャットコンテキストを構築するビルダークラス

    責務:
    - ChatContextオブジェクトから情報を抽出
    - ツール用のグローバルコンテキストを設定
    - LLMに渡す会話履歴を構築
    - コンテキストメッセージの生成
    """

    def __init__(self):
        """コンストラクタ"""
        self._reset()

    def _reset(self) -> None:
        """内部状態をリセット"""
        self._chat_history: List[BaseMessage] = []
        self._context_msg: Optional[str] = None
        self._has_file_context: bool = False
        self._history_count: int = 0

    def build(self, context: Optional[ChatContext]) -> BuiltContext:
        """チャットコンテキストを構築する

        Args:
            context: 入力されたチャットコンテキスト

        Returns:
            構築されたコンテキスト情報
        """
        self._reset()
        self._initialize_tool_contexts()

        if context:
            self._process_active_screen(context)
            self._process_fallback_file_context(context)
            self._process_all_files_context(context)
            self._append_context_message()
            self._process_conversation_history(context)

        return BuiltContext(
            chat_history=self._chat_history,
            history_count=self._history_count,
            has_file_context=self._has_file_context
        )

    def _initialize_tool_contexts(self) -> None:
        """ツール用のグローバルコンテキストを初期化"""
        set_file_context(None)
        set_directory_context(None)
        set_all_files_context(None)

    def _process_active_screen(self, context: ChatContext) -> None:
        """アクティブスクリーンからコンテキストを処理

        Args:
            context: チャットコンテキスト
        """
        if not context.activeScreen:
            return

        active_screen = context.activeScreen

        if isinstance(active_screen, EditScreenContext):
            self._setup_edit_screen_context(active_screen)
        elif isinstance(active_screen, FilelistScreenContext):
            self._setup_filelist_screen_context(active_screen)

    def _setup_edit_screen_context(self, screen: EditScreenContext) -> None:
        """編集画面のコンテキストを設定

        Args:
            screen: 編集画面のコンテキスト
        """
        file_path = screen.filePath
        file_content = screen.fileContent

        # ツール用のファイルコンテキスト設定
        set_file_context({'filename': file_path, 'content': file_content})
        self._has_file_context = True
        logger.info(f"File context set from EditScreen: {file_path}")

        # ツール用のディレクトリコンテキスト設定
        current_path = self._extract_directory_path(file_path)
        set_directory_context({'currentPath': current_path, 'fileList': []})
        logger.info(f"Directory context set from EditScreen: {current_path}")

        # LLMに渡すコンテキストメッセージ生成
        if file_content is not None:
            self._context_msg = CONTEXT_MSG_EDIT_SCREEN.format(
                file_path=file_path,
                content=file_content
            )

    def _setup_filelist_screen_context(self, screen: FilelistScreenContext) -> None:
        """ファイルリスト画面のコンテキストを設定（フラット構造）

        Args:
            screen: ファイルリスト画面のコンテキスト
        """
        # ファイルリストの処理（フラット構造ではディレクトリ概念なし）
        processed_file_list = self._process_visible_file_list(screen.visibleFileList)

        # ツール用のディレクトリコンテキスト設定（フラット構造では空）
        # 注: ツールとの互換性のため残すが、currentPathは使用しない
        set_directory_context({
            'currentPath': '/',  # フラット構造では常にルート
            'fileList': processed_file_list
        })
        logger.info(
            f"File list context set from FilelistScreen (flat structure) "
            f"with {len(processed_file_list)} files"
        )

        # LLMに渡すコンテキストメッセージ生成（フラット構造版）
        if screen.visibleFileList:
            file_list_str = "\n".join([
                self._format_file_item(item) for item in screen.visibleFileList
            ])
            self._context_msg = CONTEXT_MSG_FILELIST_SCREEN.format(
                file_list=file_list_str
            )

    def _process_visible_file_list(self, visible_file_list: List[Any]) -> List[Dict[str, str]]:
        """表示中のファイルリストを処理（フラット構造）

        Args:
            visible_file_list: 表示中のファイルリスト

        Returns:
            処理されたファイルリスト
        """
        processed_list = []
        for item in visible_file_list:
            if hasattr(item, 'title') and hasattr(item, 'type'):
                processed_list.append({
                    'title': item.title,
                    'type': item.type
                })
        return processed_list

    def _format_file_item(self, item: Any) -> str:
        """ファイルアイテムをLLM用に整形（フラット構造）

        Args:
            item: FileListItemオブジェクト

        Returns:
            整形された文字列
        """
        parts = [f"- {item.title}"]
        if hasattr(item, 'category') and item.category:
            parts.append(f" [カテゴリー: {item.category}]")
        if hasattr(item, 'tags') and item.tags:
            parts.append(f" [タグ: {', '.join(item.tags)}]")
        return "".join(parts)

    def _process_fallback_file_context(self, context: ChatContext) -> None:
        """フォールバック用のファイルコンテキストを処理（古い形式のサポート）

        Args:
            context: チャットコンテキスト
        """
        # 既にアクティブスクリーンから設定済みの場合はスキップ
        if self._has_file_context:
            return

        if context.currentFileContent:
            self._setup_current_file_context(context.currentFileContent)
        elif context.attachedFileContent:
            self._setup_attached_file_context(context.attachedFileContent)

    def _setup_current_file_context(self, file_content: Dict[str, Any]) -> None:
        """現在のファイルコンテキストを設定

        Args:
            file_content: ファイルコンテキスト辞書
        """
        set_file_context(file_content)
        self._has_file_context = True
        logger.info("File context set from currentFileContent")

        content = file_content.get('content')
        if content:
            file_path = file_content.get('filename', 'unknown_file')
            self._context_msg = CONTEXT_MSG_EDIT_SCREEN.format(
                file_path=file_path,
                content=content
            )

    def _setup_attached_file_context(self, file_content: Dict[str, Any]) -> None:
        """添付ファイルコンテキストを設定

        Args:
            file_content: 添付ファイルコンテキスト辞書
        """
        set_file_context(file_content)
        self._has_file_context = True
        logger.info("File context set from attachedFileContent")

        content = file_content.get('content')
        if content:
            filename = file_content.get('filename', 'unknown_file')
            self._context_msg = CONTEXT_MSG_ATTACHED_FILE.format(
                filename=filename,
                content=content
            )

    def _process_all_files_context(self, context: ChatContext) -> None:
        """全ファイルリストのコンテキストを処理

        Args:
            context: チャットコンテキスト
        """
        if context.allFiles:
            set_all_files_context(context.allFiles)
            logger.info(f"All files context set: {len(context.allFiles)} files")

    def _append_context_message(self) -> None:
        """コンテキストメッセージを履歴に追加

        Note:
            SystemMessageではなくHumanMessageとして追加（Gemini APIの制約のため）
        """
        if self._context_msg:
            self._chat_history.append(HumanMessage(content=self._context_msg))

    def _process_conversation_history(self, context: ChatContext) -> None:
        """会話履歴を処理

        Args:
            context: チャットコンテキスト
        """
        if not context.conversationHistory:
            return

        self._history_count = len(context.conversationHistory)

        for msg in context.conversationHistory:
            role = msg.get('role')
            content = msg.get('content', '')

            if role == 'user':
                self._chat_history.append(HumanMessage(content=content))
            elif role == 'ai':
                self._chat_history.append(AIMessage(content=content))

    @staticmethod
    def _extract_directory_path(file_path: str) -> str:
        """ファイルパスからディレクトリパスを抽出

        Args:
            file_path: ファイルパス

        Returns:
            ディレクトリパス
        """
        if '/' not in file_path:
            return DEFAULT_ROOT_PATH

        current_path = '/'.join(file_path.split('/')[:-1])
        return current_path if current_path else DEFAULT_ROOT_PATH
