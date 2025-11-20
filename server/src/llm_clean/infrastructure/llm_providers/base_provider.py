"""
Base LLM Provider

LLMプロバイダーの抽象基底クラスと実装基底クラスを定義します。
Clean Architecture版: Infrastructure層に配置
"""
from abc import ABC, abstractmethod
from typing import Any

from langchain.agents import create_agent
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage

from src.core.logger import log_llm_raw, logger

# Clean Architecture DTOs (for compatibility with existing code)
from src.llm_clean.application.dtos.chat_dtos import (
    ChatContextDTO as ChatContext,
    ChatResponseDTO as ChatResponse,
    TokenUsageInfoDTO as TokenUsageInfo,
    LLMCommandDTO as LegacyLLMCommand,
    chat_context_dto_to_domain
)
from src.llm_clean.utils.tools import AVAILABLE_TOOLS
from src.llm_clean.utils.token_counter import count_message_tokens, count_tokens, estimate_output_tokens

# Clean Architecture imports
from ...domain.entities.llm_command import LLMCommand
from ...domain.services.command_extractor_service import CommandExtractorService
from .config import AGENT_VERBOSE, DEFAULT_SYSTEM_PROMPT, MAX_CONVERSATION_TOKENS
from .context_builder import ChatContextBuilder


class BaseLLMProvider(ABC):
    """LLMプロバイダーの抽象基底クラス"""

    @abstractmethod
    def __init__(self, api_key: str, model: str):
        """コンストラクタ"""
        pass

    @abstractmethod
    async def chat(
        self,
        message: str,
        context: ChatContext | None = None,
        user_id: str | None = None,
        model_id: str | None = None
    ) -> ChatResponse:
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
        self._command_extractor = CommandExtractorService()
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

    async def chat(
        self,
        message: str,
        context: ChatContext | None = None,
        user_id: str | None = None,
        model_id: str | None = None
    ) -> ChatResponse:
        """チャットメッセージを処理し、応答を返す（Agent Executor使用）

        このメソッドは全体の処理フローをオーケストレートします：
        1. コンテキストの構築（ChatContextBuilderに委譲）
        2. エージェントの実行
        3. コマンドの抽出（CommandExtractorServiceに委譲）
        4. レスポンスの構築

        Args:
            message: ユーザーメッセージ
            context: チャットコンテキスト（ファイル情報、会話履歴など）
            user_id: ユーザーID（トークン残高チェック用）
            model_id: モデルID（トークン残高チェック用）

        Returns:
            ChatResponse: AI応答とコマンド
        """
        provider_name = self._get_provider_name()

        # 1. コンテキスト構築
        # Convert DTO to domain model
        context_domain = chat_context_dto_to_domain(context)
        built_context = self._context_builder.build(context_domain)

        # リクエストログ記録
        self._log_agent_request(
            provider_name,
            message,
            built_context.history_count,
            built_context.has_file_context
        )

        # 2. エージェント実行
        try:
            result = await self._execute_agent(message, built_context.chat_history, user_id, model_id)

            # 3. レスポンス構築
            # 会話履歴を取得（トークン計算用）
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
        chat_history: list[BaseMessage],
        user_id: str | None = None,
        model_id: str | None = None
    ) -> dict[str, Any]:
        """エージェントを実行する

        Args:
            message: ユーザーメッセージ
            chat_history: 会話履歴
            user_id: ユーザーID（トークン残高チェック用）
            model_id: モデルID（トークン残高チェック用）

        Returns:
            エージェント実行結果（messagesキーを含む辞書）
        """
        # DEBUG: パラメータ値を確認
        logger.info(f"[DEBUG] _execute_agent called with user_id={user_id}, model_id={model_id}")

        # LangChain 1.0: messagesリストにchat_historyと新しいmessageを統合
        messages = chat_history + [HumanMessage(content=message)]

        # ===== トークン残高チェック =====
        if user_id and model_id:
            from src.billing import SessionLocal, TokenBalanceValidator, estimate_output_tokens

            # 1. メッセージをトークンカウント用の辞書形式に変換
            message_dicts = []
            for msg in messages:
                role = "user" if isinstance(msg, HumanMessage) else "ai"
                content = msg.content if isinstance(msg.content, str) else str(msg.content)
                message_dicts.append({"role": role, "content": content})

            # 2. メッセージのトークン数を計算
            message_tokens = count_message_tokens(message_dicts, provider=self._get_provider_name(), model=self.model)

            # 3. システムプロンプトのトークン数を計算
            system_prompt = self._get_system_prompt()
            system_prompt_tokens = count_tokens(system_prompt) if system_prompt else 0

            # 4. ツール定義のトークン数を計算
            # LangChainがツールをLLMに送る際の形式に近い文字列を生成
            tools_text_parts = []
            for tool in AVAILABLE_TOOLS:
                # ツール名、説明、引数情報を含める
                tool_info = f"Tool: {tool.name}\nDescription: {tool.description}"
                if hasattr(tool, 'args_schema') and tool.args_schema:
                    # 引数スキーマも含める
                    try:
                        # Check if args_schema has schema method (BaseModel)
                        if hasattr(tool.args_schema, 'schema'):
                            schema = tool.args_schema.schema()  # type: ignore
                            tool_info += f"\nArguments: {schema.get('properties', {})}"
                    except Exception:
                        pass
                tools_text_parts.append(tool_info)

            tools_text = "\n\n".join(tools_text_parts)
            tools_tokens = count_tokens(tools_text) if tools_text else 0

            # 5. 総入力トークン数を計算
            input_tokens = message_tokens + system_prompt_tokens + tools_tokens

            # 6. 出力トークンは推定
            estimated_output = estimate_output_tokens(input_tokens)
            total_estimated = input_tokens + estimated_output

            logger.info(
                f"[TokenCheck] Estimated tokens before LLM call: "
                f"messages={message_tokens}, system={system_prompt_tokens}, tools={tools_tokens}, "
                f"input_total={input_tokens}, output_est={estimated_output}, total={total_estimated}"
            )

            # 7. トークン残高を検証
            db = SessionLocal()
            try:
                validator = TokenBalanceValidator(db, user_id)
                validator.validate_and_raise(model_id, total_estimated)
            finally:
                db.close()

        # ===== LLM実行 =====
        result: dict[str, Any] = await self.agent.ainvoke({  # type: ignore[misc]
            "messages": messages
        })

        # NOTE: トークン減算はフロントエンドから /api/billing/tokens/consume API経由で行われる
        # バックエンドでの自動減算は2重減算を引き起こすため実装しない

        return result

    def _convert_domain_command_to_legacy(self, domain_cmd: LLMCommand) -> LegacyLLMCommand:
        """Convert Domain LLMCommand to Legacy LLMCommand

        Temporary converter during migration from legacy to clean architecture.
        """
        return LegacyLLMCommand(**domain_cmd.model_dump())

    def _build_response(
        self,
        agent_result: dict[str, Any],
        provider_name: str,
        history_count: int,
        conversation_history: list[dict[str, Any]] = []
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
        messages = agent_result.get("messages", [])

        # 最後のメッセージを取得（通常は最後のAIMessage）
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
                else:
                    agent_output = ""
            else:
                content = getattr(last_message, 'content', '')
                agent_output = str(content) if content else ""

        # ツール呼び出しの数をカウント
        tool_call_count = sum(
            len(getattr(msg, 'tool_calls', None) or [])
            for msg in messages
            if isinstance(msg, AIMessage)
        )

        # レスポンスログ記録
        self._log_agent_response(
            provider_name,
            agent_output,
            tool_call_count
        )

        # コマンド抽出（Domain Serviceを使用）
        domain_commands = self._command_extractor.extract_commands(agent_result)

        # Legacy形式に変換（段階的移行のため）
        legacy_commands = [
            self._convert_domain_command_to_legacy(cmd) for cmd in (domain_commands or [])
        ]

        # コマンドログ記録
        if domain_commands:
            self._log_agent_commands(provider_name, domain_commands)

        # トークン使用情報を計算
        token_usage = self._calculate_token_usage(
            conversation_history,
            provider_name,
            messages
        )

        return ChatResponse(
            message=agent_output,
            commands=legacy_commands,
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
        # トークン不足エラーの場合は、errorフィールドに詳細を設定
        if "トークン残高が不足" in error_message:
            return ChatResponse(
                message="トークン残高が不足しているため、リクエストを処理できませんでした。",
                error=error_message,
                provider=provider_name,
                model=self.model,
                historyCount=history_count
            )

        # その他のエラー
        return ChatResponse(
            message=f"エラーが発生しました: {error_message}",
            error=error_message,
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
        """エージェントリクエストをログ記録"""
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
        """エージェントレスポンスをログ記録"""
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
        """抽出されたコマンドをログ記録"""
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
        """会話履歴のトークン使用情報を計算する"""
        try:
            max_tokens = MAX_CONVERSATION_TOKENS

            # 実際に使用したトークン数を取得
            input_tokens = None
            output_tokens = None
            total_tokens = None

            if messages:
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
