
# @file base.py
# @summary LLMプロバイダーの抽象基底クラスを定義します。
# @responsibility すべてのLLMプロバイダーが実装すべき共通のインターフェース（メソッド、プロパティ）を定義します。
from abc import ABC, abstractmethod
from typing import Optional, List
from langchain.schema import HumanMessage, AIMessage, BaseMessage
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from src.llm.models import ChatResponse, ChatContext, LLMCommand, NotelistScreenContext, EditScreenContext
from src.llm.tools import AVAILABLE_TOOLS
from src.llm.tools.context_manager import set_file_context, set_directory_context, set_all_files_context
from src.core.logger import logger, log_llm_raw

class BaseLLMProvider(ABC):
    """LLMプロバイダーの抽象基底クラス"""

    @abstractmethod
    def __init__(self, api_key: str, model: str):
        """コンストラクタ"""
        pass

    @abstractmethod
    async def chat(self, message: str, context: Optional[ChatContext] = None) -> ChatResponse:
        """チャットメッセージを処理し、応答を返す"""
        pass


class BaseAgentLLMProvider(BaseLLMProvider):
    """Langchainエージェントを使用するLLMプロバイダーの抽象基底クラス

    GeminiProviderとOpenAIProviderに共通するエージェント関連のロジックを統合します。
    各プロバイダーは、LLMクライアントの初期化のみを実装すれば良くなります。
    """

    def __init__(self, api_key: str, model: str):
        """コンストラクタ

        Args:
            api_key: APIキー
            model: 使用するモデル名
        """
        self.model = model
        self.llm = self._create_llm_client(api_key, model)
        self._setup_agent()

    @abstractmethod
    def _get_provider_name(self) -> str:
        """プロバイダー名を返す（ログ出力用）

        Returns:
            プロバイダー名（例: "gemini", "openai"）
        """
        pass

    @abstractmethod
    def _create_llm_client(self, api_key: str, model: str):
        """プロバイダー固有のLLMクライアントを作成する

        Args:
            api_key: APIキー
            model: 使用するモデル名

        Returns:
            LangchainのChatモデルインスタンス
        """
        pass

    def _get_system_prompt(self) -> str:
        """システムプロンプトを取得する

        デフォルト実装を提供しますが、プロバイダー固有のカスタマイズが必要な場合は
        オーバーライドできます。

        Returns:
            システムプロンプト文字列
        """
        return (
            "あなたは親切で有能なAIアシスタントです。ユーザーのノート作成と編集をサポートします。\n"
            "利用可能なツールを使って、ユーザーの要求に応えてください。\n"
            "もしユーザーの指定したファイル名が曖昧な場合は、まず `search_files` ツールを使って正確なファイルパスを特定してから、他のツール（`read_file`など）を使用してください。"
        )

    def _setup_agent(self):
        """Langchainエージェントとエグゼキューターをセットアップする

        このメソッドは共通ロジックとして、プロンプトテンプレート、エージェント、
        AgentExecutorを初期化します。
        """
        # プロンプトテンプレートを作成
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", self._get_system_prompt()),
            MessagesPlaceholder(variable_name="chat_history", optional=True),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])

        # エージェントを作成
        self.agent = create_tool_calling_agent(self.llm, AVAILABLE_TOOLS, self.prompt)

        # AgentExecutorを作成
        self.agent_executor = AgentExecutor(
            agent=self.agent,  # type: ignore[arg-type]
            tools=AVAILABLE_TOOLS,
            verbose=True,  # デバッグ用
            max_iterations=5,  # 最大5回までツールを呼び出せる
            handle_parsing_errors=True,
            return_intermediate_steps=True  # コマンド抽出に必要
        )

    async def chat(self, message: str, context: Optional[ChatContext] = None) -> ChatResponse:
        """チャットメッセージを処理し、応答を返す（Agent Executor使用）

        Args:
            message: ユーザーメッセージ
            context: チャットコンテキスト（ファイル情報、会話履歴など）

        Returns:
            ChatResponse: AI応答とコマンド
        """
        provider_name = self._get_provider_name()

        # コンテキストの初期化と設定
        set_file_context(None)
        set_directory_context(None)
        set_all_files_context(None)
        chat_history: List[BaseMessage] = []
        context_msg: Optional[str] = None
        has_file_context = False
        history_count = 0

        if context:
            # 1. activeScreenからコンテキストを設定
            if context.activeScreen:
                active_screen = context.activeScreen
                if isinstance(active_screen, EditScreenContext):
                    # --- EditScreenコンテキスト ---
                    file_path = active_screen.filePath
                    file_content = active_screen.fileContent
                    
                    # ツール用のファイルコンテキスト
                    set_file_context({'filename': file_path, 'content': file_content})
                    has_file_context = True
                    logger.info(f"File context set from EditScreen: {file_path}")

                    # ツール用のディレクトリコンテキスト
                    current_path = '/'.join(file_path.split('/')[:-1]) if '/' in file_path else '/'
                    if not current_path:
                        current_path = '/'
                    set_directory_context({'currentPath': current_path, 'fileList': []})
                    logger.info(f"Directory context set from EditScreen: {current_path}")

                    # LLMに渡すプロンプト用のコンテキストメッセージ
                    if file_content is not None:
                        context_msg = f"\n\n[現在開いているファイル情報]\nファイルパス: {file_path}\n内容:\n---\n{file_content}\n---"

                elif isinstance(active_screen, NotelistScreenContext):
                    # --- NoteListScreenコンテキスト ---
                    processed_file_list = []
                    for item in active_screen.visibleFileList:
                        # Directly use name and type from the frontend
                        if hasattr(item, 'name') and hasattr(item, 'type') and item.name and item.type:
                            processed_file_list.append({
                                'name': item.name,
                                'type': item.type
                            })

                    set_directory_context({
                        'currentPath': active_screen.currentPath,
                        'fileList': processed_file_list
                    })
                    logger.info(f"Directory context set from NotelistScreen: {active_screen.currentPath} with {len(processed_file_list)} items")

                    # LLMに渡すプロンプト用のコンテキストメッセージを追加
                    if active_screen.visibleFileList:
                        file_list_str = "\n".join([f"- {item.filePath}" for item in active_screen.visibleFileList])
                        context_msg = f"\n\n[現在表示中のファイルリスト]\nカレントパス: {active_screen.currentPath}\nファイル一覧:\n{file_list_str}"

            # 2. (フォールバック) 古い形式のファイルコンテキスト
            if not has_file_context:
                if context.currentFileContent:
                    set_file_context(context.currentFileContent)
                    has_file_context = True
                    logger.info("File context set from currentFileContent")
                    fallback_content = context.currentFileContent.get('content')
                    if fallback_content:
                        fallback_path = context.currentFileContent.get('filename', 'unknown_file')
                        context_msg = f"\n\n[現在開いているファイル情報]\nファイルパス: {fallback_path}\n内容:\n---\n{fallback_content}\n---"
                elif context.attachedFileContent:
                    set_file_context(context.attachedFileContent)
                    has_file_context = True
                    logger.info("File context set from attachedFileContent")
                    attached_content = context.attachedFileContent.get('content')
                    if attached_content:
                        attached_filename = context.attachedFileContent.get('filename', 'unknown_file')
                        context_msg = f"\n\n[添付ファイル情報]\nファイル名: {attached_filename}\n内容:\n---\n{attached_content}\n---"

            # 3. 全ファイルリストのコンテキスト
            if context.allFiles:
                set_all_files_context(context.allFiles)
                logger.info(f"All files context set: {len(context.allFiles)} files")

            # 4. コンテキストメッセージを履歴の先頭に追加
            # Note: SystemMessageではなくHumanMessageとして追加（Gemini APIの制約のため）
            if context_msg:
                chat_history.append(HumanMessage(content=context_msg))

            # 5. 会話履歴
            if context.conversationHistory:
                history_count = len(context.conversationHistory)
                for msg in context.conversationHistory:
                    if msg.get('role') == 'user':
                        chat_history.append(HumanMessage(content=msg.get('content', '')))
                    elif msg.get('role') == 'ai':
                        chat_history.append(AIMessage(content=msg.get('content', '')))

        # ログ記録
        log_llm_raw(provider_name, "agent_request", {
            "message": message,
            "model": self.model,
            "history_count": history_count,
            "has_file_context": bool(
                context and (
                    (context.activeScreen and isinstance(context.activeScreen, EditScreenContext)) or
                    context.currentFileContent or
                    context.attachedFileContent
                )
            )
        }, {})

        # AgentExecutorを実行
        try:
            result = await self.agent_executor.ainvoke({
                "input": message,
                "chat_history": chat_history
            })

            agent_output = result.get("output", "")

            # ログ記録
            log_llm_raw(provider_name, "agent_response", {
                "output": agent_output,
                "intermediate_steps": len(result.get("intermediate_steps", [])),
                "model": self.model
            }, {})

            # edit_fileツールが呼ばれたかチェック（最終的なツール呼び出しを検出）
            commands = self._extract_commands_from_agent_result(result)

            # デバッグ: intermediate_steps の内容を詳細にログ出力
            logger.debug({
                "intermediate_steps_count": len(result.get("intermediate_steps", [])),
                "intermediate_steps_raw": result.get("intermediate_steps", []),
                "extracted_commands": commands
            })

            if commands:
                log_llm_raw(provider_name, "agent_commands", {
                    "count": len(commands),
                    "actions": [f"{cmd.action}:{cmd.path}" for cmd in commands]
                }, {})

            return ChatResponse(
                message=agent_output,
                commands=commands if commands else None,
                provider=provider_name,
                model=self.model,
                historyCount=history_count
            )

        except Exception as e:
            logger.error(f"Agent execution error: {e}")
            return ChatResponse(
                message=f"エラーが発生しました: {str(e)}",
                provider=provider_name,
                model=self.model,
                historyCount=history_count
            )

    def _extract_commands_from_agent_result(self, result: dict) -> Optional[List[LLMCommand]]:
        """AgentExecutorの実行結果から、フロントエンドで実行すべきコマンドを抽出する

        Args:
            result: AgentExecutorの実行結果

        Returns:
            抽出されたコマンドのリスト（なければNone）
        """
        commands = []
        intermediate_steps = result.get("intermediate_steps", [])

        for action, observation in intermediate_steps:
            if not hasattr(action, 'tool'):
                continue

            tool_name = action.tool
            tool_input = action.tool_input

            if tool_name == 'edit_file':
                commands.append(LLMCommand(
                    action='edit_file',
                    path=tool_input.get('filename'),
                    content=tool_input.get('content')
                ))
            elif tool_name == 'create_directory':
                commands.append(LLMCommand(
                    action='create_directory',
                    path=tool_input.get('path', '/'),
                    content=tool_input.get('name')
                ))
            elif tool_name == 'move_item':
                commands.append(LLMCommand(
                    action='move_item',
                    source=tool_input.get('source_path'),
                    destination=tool_input.get('dest_path')
                ))
            elif tool_name == 'delete_item':
                commands.append(LLMCommand(
                    action='delete_item',
                    path=tool_input.get('path')
                ))

        return commands if commands else None
