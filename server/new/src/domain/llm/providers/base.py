
# @file base.py
# @summary LLMプロバイダーの抽象基底クラスを定義します。
# @responsibility すべてのLLMプロバイダーが実装すべき共通のインターフェース（メソッド、プロパティ）を定義します。
from abc import ABC, abstractmethod
from typing import Any

from langchain.agents import create_agent
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage

from src.core.logger import log_llm_raw, logger
from src.domain.llm.providers.command_extractor import AgentCommandExtractor
from src.domain.llm.providers.config import (
    AGENT_VERBOSE,
    DEFAULT_SYSTEM_PROMPT,
    MAX_CONVERSATION_TOKENS,
)
from src.domain.llm.providers.context_builder import ChatContextBuilder
from src.features.tools import AVAILABLE_TOOLS
from src.llm.models import ChatContext, ChatResponse, LLMCommand, TokenUsageInfo
from src.llm.utils.token_counter import count_message_tokens


class BaseLLMProvider(ABC):
    """LLMプロバイダーの抽象基底クラス"""

    @abstractmethod
    def __init__(self, api_key: str, model: str):
        """コンストラクタ"""
        pass

    @abstractmethod
    async def chat(self, message: str, context: ChatContext | None = None) -> ChatResponse:
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
        # 有効なツールのリストをログ出力
        tool_names = [tool.name for tool in AVAILABLE_TOOLS]
        logger.info(f"Setting up agent with {len(AVAILABLE_TOOLS)} enabled tools: {tool_names}")

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

    async def chat(self, message: str, context: ChatContext | None = None) -> ChatResponse:
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
            # 会話履歴を取得（トークン計算用）
            # 注: 最新のユーザーメッセージとAI応答を含めた履歴でトークンを計算する必要がある
            conversation_history = context.conversationHistory if context and context.conversationHistory else []

            # AI応答を取得
            messages = result.get("messages", [])
            agent_output = ""
            if messages:
                last_message = messages[-1]
                if isinstance(last_message, AIMessage):
                    content = last_message.content
                    if isinstance(content, str):
                        agent_output = content
                    elif isinstance(content, list):
                        text_parts = []
                        for item in content:
                            if isinstance(item, str):
                                text_parts.append(item)
                            elif isinstance(item, dict) and 'text' in item:
                                text_parts.append(item['text'])
                        agent_output = ''.join(text_parts)

            # トークン計算用に最新の会話履歴を構築（今回のやり取りを含む）
            updated_conversation_history = list(conversation_history)
            updated_conversation_history.append({
                "role": "user",
                "content": message,
                "timestamp": ""
            })
            updated_conversation_history.append({
                "role": "ai",
                "content": agent_output,
                "timestamp": ""
            })

            return self._build_response(
                result,
                provider_name,
                built_context.history_count,
                updated_conversation_history
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
        chat_history: list[BaseMessage]
    ) -> dict[str, Any]:
        """エージェントを実行する

        Args:
            message: ユーザーメッセージ
            chat_history: 会話履歴

        Returns:
            エージェント実行結果（messagesキーを含む辞書）
        """
        # LangChain 1.0: messagesリストにchat_historyと新しいmessageを統合
        messages = chat_history + [HumanMessage(content=message)]
        result: dict[str, Any] = await self.agent.ainvoke({  # type: ignore[misc]
            "messages": messages
        })
        return result

    def _build_response(
        self,
        agent_result: dict[str, Any],
        provider_name: str,
        history_count: int,
        conversation_history: list[dict[str, Any]] = None
    ) -> ChatResponse:
        """エージェント実行結果からChatResponseを構築する

        Args:
            agent_result: エージェント実行結果（LangChain 1.0形式: {"messages": [...]})
            provider_name: プロバイダー名
            history_count: 会話履歴の件数
            conversation_history: 会話履歴（トークン計算用）

        Returns:
            ChatResponse
        """
        # LangChain 1.0: messagesリストから最後のAIメッセージを取得
        if conversation_history is None:
            conversation_history = []
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
                    # リスト形式の場合は各要素からテキストを抽出
                    text_parts = []
                    for item in content:
                        if isinstance(item, str):
                            text_parts.append(item)
                        elif isinstance(item, dict) and 'text' in item:
                            text_parts.append(item['text'])
                    agent_output = ''.join(text_parts)
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

        # トークン使用情報を計算
        token_usage = self._calculate_token_usage(
            conversation_history,
            provider_name,
            messages  # AIMessageを渡して実際のトークン使用量を取得
        )

        return ChatResponse(
            message=agent_output,
            commands=commands,
            provider=provider_name,
            model=self.model,
            historyCount=history_count,
            tokenUsage=token_usage
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
        commands: list[LLMCommand]
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

    def _calculate_token_usage(
        self,
        conversation_history: list[dict[str, Any]],
        provider_name: str,
        messages: list[BaseMessage] | None = None
    ) -> TokenUsageInfo | None:
        """会話履歴のトークン使用情報を計算する

        Args:
            conversation_history: 会話履歴
            provider_name: プロバイダー名
            messages: エージェントの実行結果メッセージ（実際のトークン使用量取得用）

        Returns:
            TokenUsageInfo or None
        """
        try:
            # 推奨最大トークン数
            max_tokens = MAX_CONVERSATION_TOKENS

            # 実際に使用したトークン数を取得（LangChainのAIMessageから）
            input_tokens = None
            output_tokens = None
            total_tokens = None

            if messages:
                # 最後のAIMessageからusage_metadataを取得
                for msg in reversed(messages):
                    if isinstance(msg, AIMessage) and hasattr(msg, 'usage_metadata'):
                        usage_metadata = msg.usage_metadata
                        if usage_metadata:
                            input_tokens = usage_metadata.get('input_tokens')
                            output_tokens = usage_metadata.get('output_tokens')
                            total_tokens = usage_metadata.get('total_tokens')
                            logger.debug(
                                f"Actual token usage from API: "
                                f"input={input_tokens}, output={output_tokens}, total={total_tokens}"
                            )
                            break

            # 会話履歴が空の場合でも初期状態を返す
            if not conversation_history:
                return TokenUsageInfo(
                    currentTokens=0,
                    maxTokens=max_tokens,
                    usageRatio=0.0,
                    needsSummary=False,
                    inputTokens=input_tokens,
                    outputTokens=output_tokens,
                    totalTokens=total_tokens
                )

            # 現在のトークン数を計算
            current_tokens = count_message_tokens(
                conversation_history,
                provider=provider_name,
                model=self.model
            )

            # 使用率を計算
            usage_ratio = current_tokens / max_tokens if max_tokens > 0 else 0.0

            # 要約が必要かどうか（80%以上で推奨）
            needs_summary = usage_ratio >= 0.8

            logger.debug(
                f"Token usage: {current_tokens}/{max_tokens} "
                f"({usage_ratio:.1%}) - Summary recommended: {needs_summary}"
            )

            return TokenUsageInfo(
                currentTokens=current_tokens,
                maxTokens=max_tokens,
                usageRatio=usage_ratio,
                needsSummary=needs_summary,
                inputTokens=input_tokens,
                outputTokens=output_tokens,
                totalTokens=total_tokens
            )

        except Exception as e:
            logger.error(f"Error calculating token usage: {e}")
            return None
