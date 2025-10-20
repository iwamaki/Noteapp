
# @file base.py
# @summary LLMプロバイダーの抽象基底クラスを定義します。
# @responsibility すべてのLLMプロバイダーが実装すべき共通のインターフェース（メソッド、プロパティ）を定義します。
from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any
from langchain.schema import BaseMessage
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder

from src.llm.models import ChatResponse, ChatContext, LLMCommand
from src.llm.tools import AVAILABLE_TOOLS
from src.llm.providers.config import (
    MAX_AGENT_ITERATIONS,
    AGENT_VERBOSE,
    HANDLE_PARSING_ERRORS,
    RETURN_INTERMEDIATE_STEPS,
    DEFAULT_SYSTEM_PROMPT
)
from src.llm.providers.context_builder import ChatContextBuilder
from src.llm.providers.command_extractor import AgentCommandExtractor
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

    責務:
    - エージェントのセットアップと管理
    - チャット処理のオーケストレーション
    - コンテキスト構築とコマンド抽出の委譲
    """

    def __init__(self, api_key: str, model: str):
        """コンストラクタ

        Args:
            api_key: APIキー
            model: 使用するモデル名
        """
        self.model = model
        self.llm = self._create_llm_client(api_key, model)
        self._context_builder = ChatContextBuilder()
        self._command_extractor = AgentCommandExtractor()
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
        return DEFAULT_SYSTEM_PROMPT

    def _setup_agent(self) -> None:
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
            verbose=AGENT_VERBOSE,
            max_iterations=MAX_AGENT_ITERATIONS,
            handle_parsing_errors=HANDLE_PARSING_ERRORS,
            return_intermediate_steps=RETURN_INTERMEDIATE_STEPS
        )

    async def chat(self, message: str, context: Optional[ChatContext] = None) -> ChatResponse:
        """チャットメッセージを処理し、応答を返す（Agent Executor使用）

        このメソッドは全体の処理フローをオーケストレートします：
        1. コンテキストの構築（ChatContextBuilderに委譲）
        2. エージェントの実行
        3. コマンドの抽出（AgentCommandExtractorに委譲）
        4. レスポンスの構築

        Args:
            message: ユーザーメッセージ
            context: チャットコンテキスト（ファイル情報、会話履歴など）

        Returns:
            ChatResponse: AI応答とコマンド
        """
        provider_name = self._get_provider_name()

        # 1. コンテキスト構築
        built_context = self._context_builder.build(context)

        # リクエストログ記録
        self._log_agent_request(
            provider_name,
            message,
            built_context.history_count,
            built_context.has_file_context
        )

        # 2. エージェント実行
        try:
            result = await self._execute_agent(message, built_context.chat_history)

            # 3. レスポンス構築
            return self._build_response(
                result,
                provider_name,
                built_context.history_count
            )

        except Exception as e:
            logger.error(f"Agent execution error: {e}")
            return self._build_error_response(
                str(e),
                provider_name,
                built_context.history_count
            )

    async def _execute_agent(
        self,
        message: str,
        chat_history: List[BaseMessage]
    ) -> Dict[str, Any]:
        """エージェントを実行する

        Args:
            message: ユーザーメッセージ
            chat_history: 会話履歴

        Returns:
            エージェント実行結果
        """
        return await self.agent_executor.ainvoke({
            "input": message,
            "chat_history": chat_history
        })

    def _build_response(
        self,
        agent_result: Dict[str, Any],
        provider_name: str,
        history_count: int
    ) -> ChatResponse:
        """エージェント実行結果からChatResponseを構築する

        Args:
            agent_result: エージェント実行結果
            provider_name: プロバイダー名
            history_count: 会話履歴の件数

        Returns:
            ChatResponse
        """
        agent_output = agent_result.get("output", "")

        # レスポンスログ記録
        self._log_agent_response(
            provider_name,
            agent_output,
            len(agent_result.get("intermediate_steps", []))
        )

        # コマンド抽出
        commands = self._command_extractor.extract_commands(agent_result)

        # コマンドログ記録
        if commands:
            self._log_agent_commands(provider_name, commands)

        return ChatResponse(
            message=agent_output,
            commands=commands,
            provider=provider_name,
            model=self.model,
            historyCount=history_count
        )

    def _build_error_response(
        self,
        error_message: str,
        provider_name: str,
        history_count: int
    ) -> ChatResponse:
        """エラーレスポンスを構築する

        Args:
            error_message: エラーメッセージ
            provider_name: プロバイダー名
            history_count: 会話履歴の件数

        Returns:
            エラーを含むChatResponse
        """
        return ChatResponse(
            message=f"エラーが発生しました: {error_message}",
            provider=provider_name,
            model=self.model,
            historyCount=history_count
        )

    def _log_agent_request(
        self,
        provider_name: str,
        message: str,
        history_count: int,
        has_file_context: bool
    ) -> None:
        """エージェントリクエストをログ記録

        Args:
            provider_name: プロバイダー名
            message: ユーザーメッセージ
            history_count: 会話履歴の件数
            has_file_context: ファイルコンテキストの有無
        """
        log_llm_raw(provider_name, "agent_request", {
            "message": message,
            "model": self.model,
            "history_count": history_count,
            "has_file_context": has_file_context
        }, {})

    def _log_agent_response(
        self,
        provider_name: str,
        output: str,
        intermediate_steps_count: int
    ) -> None:
        """エージェントレスポンスをログ記録

        Args:
            provider_name: プロバイダー名
            output: エージェント出力
            intermediate_steps_count: 中間ステップの件数
        """
        log_llm_raw(provider_name, "agent_response", {
            "output": output,
            "intermediate_steps": intermediate_steps_count,
            "model": self.model
        }, {})

    def _log_agent_commands(
        self,
        provider_name: str,
        commands: List[LLMCommand]
    ) -> None:
        """抽出されたコマンドをログ記録

        Args:
            provider_name: プロバイダー名
            commands: 抽出されたコマンドリスト
        """
        log_llm_raw(provider_name, "agent_commands", {
            "count": len(commands),
            "actions": [f"{cmd.action}:{cmd.path}" for cmd in commands]
        }, {})
