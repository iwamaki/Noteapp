# @file context_builder.py
# @summary チャットコンテキストの構築を担当するビルダークラスを提供します。
# @responsibility ChatContextから必要な情報を抽出し、LLMとツールに渡すコンテキストを構築します。

from typing import List, Optional, Dict, Any
from dataclasses import dataclass
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage

from src.llm.models import ChatContext, EditScreenContext, FilelistScreenContext
from src.shared.utils import set_file_context, set_directory_context, set_all_files_context
from src.domain.llm.providers.config import (
    CONTEXT_MSG_EDIT_SCREEN,
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
            # Note: FilelistScreenContext は画面識別のみに使用
            # ファイルリスト情報は allFiles として送信される
            logger.info("Active screen: FilelistScreen (no context set - using allFiles)")

    def _setup_edit_screen_context(self, screen: EditScreenContext) -> None:
        """編集画面のコンテキストを設定

        Args:
            screen: 編集画面のコンテキスト
        """
        file_path = screen.filePath
        file_content = screen.fileContent

        # ツール用のファイルコンテキスト設定（ツールは常にコンテキストを必要とする）
        set_file_context({'filename': file_path, 'content': file_content})
        self._has_file_context = True
        logger.info(f"File context set from EditScreen: {file_path}")

        # ツール用のディレクトリコンテキスト設定
        current_path = self._extract_directory_path(file_path)
        set_directory_context({'currentPath': current_path, 'fileList': []})
        logger.info(f"Directory context set from EditScreen: {current_path}")

        # LLMに渡すコンテキストメッセージ生成
        # Note: fileContentはフロントエンドでsendFileContextToLLMの設定に従って空文字になる
        if file_content is not None and file_content != '':
            self._context_msg = CONTEXT_MSG_EDIT_SCREEN.format(
                file_path=file_path,
                content=file_content
            )


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
            self._setup_attached_files_context(context.attachedFileContent)

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

    def _setup_attached_files_context(self, files_content: List[Dict[str, Any]]) -> None:
        """添付ファイルコンテキストを設定（複数ファイル対応）

        Args:
            files_content: 添付ファイルコンテキストのリスト
        """
        if not files_content:
            return

        # 複数ファイルのコンテキストメッセージを構築
        context_messages = []
        for file_data in files_content:
            content = file_data.get('content')
            if content:
                filename = file_data.get('filename', 'unknown_file')
                msg = CONTEXT_MSG_ATTACHED_FILE.format(
                    filename=filename,
                    content=content
                )
                context_messages.append(msg)

        if context_messages:
            # 複数ファイルのメッセージを結合
            self._context_msg = '\n'.join(context_messages)
            self._has_file_context = True
            logger.info(f"File context set from attachedFileContent: {len(files_content)} file(s)")

        # Note: set_file_context()は呼ばない
        # 添付ファイルはLLMへの情報提供が目的であり、ツールの編集対象ではないため

    def _process_all_files_context(self, context: ChatContext) -> None:
        """全ファイルリストのコンテキストを処理

        Args:
            context: チャットコンテキスト
        """
        # sendFileContextToLLMがFalseの場合はスキップ
        if context.sendFileContextToLLM is False:
            logger.info("All files context skipped: sendFileContextToLLM is False")
            return

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
            elif role == 'system':
                # システムメッセージ（要約など）をサポート
                self._chat_history.append(SystemMessage(content=content))
                logger.info("System message (summary) added to chat history")

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
