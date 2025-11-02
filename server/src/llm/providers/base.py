
# @file base.py
# @summary LLMプロバイダーの抽象基底クラスを定義します。
# @responsibility すべてのLLMプロバイダーが実装すべき共通のインターフェース（メソッド、プロパティ）を定義します。
from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any
from langchain_core.messages import BaseMessage, AIMessage, HumanMessage
from langchain.agents import create_agent

from src.llm.models import ChatResponse, ChatContext, LLMCommand
from src.llm.tools import AVAILABLE_TOOLS
from src.llm.providers.config import (
    AGENT_VERBOSE,
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
        """Langchainエージェントをセットアップする

        LangChain 1.0のcreate_agent APIを使用してエージェントを作成します。
        create_agentはCompiledStateGraphを返し、これがエージェント実行を管理します。
        """
        # LangChain 1.0: create_agentを使用
        # プロンプトテンプレートは不要で、system_promptを直接指定
        self.agent: Any = create_agent(
            model=self.llm,
            tools=AVAILABLE_TOOLS,
            system_prompt=self._get_system_prompt(),
            debug=AGENT_VERBOSE
        )
        # Note: max_iterations, handle_parsing_errors, return_intermediate_stepsは
        # LangChain 1.0では異なる方法で制御されるため、ここでは省略

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
            エージェント実行結果（messagesキーを含む辞書）
        """
        # LangChain 1.0: messagesリストにchat_historyと新しいmessageを統合
        messages = chat_history + [HumanMessage(content=message)]
        result: Dict[str, Any] = await self.agent.ainvoke({  # type: ignore[misc]
            "messages": messages
        })
        return result

    def _build_response(
        self,
        agent_result: Dict[str, Any],
        provider_name: str,
        history_count: int
    ) -> ChatResponse:
        """エージェント実行結果からChatResponseを構築する

        Args:
            agent_result: エージェント実行結果（LangChain 1.0形式: {"messages": [...]})
            provider_name: プロバイダー名
            history_count: 会話履歴の件数

        Returns:
            ChatResponse
        """
        # LangChain 1.0: messagesリストから最後のAIメッセージを取得
        messages = agent_result.get("messages", [])

        # 最後のメッセージを取得（通常は最後のAIMessage）
        agent_output = ""
        if messages:
            last_message = messages[-1]
            if isinstance(last_message, AIMessage):
                # contentはstr | list[str | dict]の可能性がある
                content = last_message.content
                if isinstance(content, str):
                    agent_output = content
                elif isinstance(content, list):
                    # リスト形式の場合は文字列に変換
                    agent_output = str(content)
                else:
                    agent_output = ""
            else:
                # フォールバック: どんなメッセージでもcontentを取得
                content = getattr(last_message, 'content', '')
                agent_output = str(content) if content else ""

        # ツール呼び出しの数をカウント（intermediate_stepsの代替）
        tool_call_count = sum(
            len(getattr(msg, 'tool_calls', []))
            for msg in messages
            if isinstance(msg, AIMessage)
        )

        # レスポンスログ記録
        self._log_agent_response(
            provider_name,
            agent_output,
            tool_call_count
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
        # フラット構造ではtitleを使用、旧階層構造ではpathを使用
        actions = []
        for cmd in commands:
            target = getattr(cmd, 'title', getattr(cmd, 'path', 'N/A'))
            actions.append(f"{cmd.action}:{target}")

        log_llm_raw(provider_name, "agent_commands", {
            "count": len(commands),
            "actions": actions
        }, {})
