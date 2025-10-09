# @file openai.py
# @summary OpenAIのLLMプロバイダーを実装します。
# @responsibility BaseLLMProviderを継承し、OpenAIのAPIと通信してチャット応答を生成します。
from typing import Optional, List, Any, Dict
from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage, SystemMessage, AIMessage, BaseMessage
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from src.models import ChatResponse, ChatContext, LLMCommand
from src.tools.file_tools import AVAILABLE_TOOLS, set_file_context
from .base import BaseLLMProvider
from src.logger import logger, log_llm_raw

class OpenAIProvider(BaseLLMProvider):
    """OpenAIのLLMプロバイダー"""

    def __init__(self, api_key: str, model: str = "gpt-3.5-turbo"):
        self.llm = ChatOpenAI(
            api_key=api_key,
            model=model,
            temperature=0.7
        )
        self.model = model

        # Agentのプロンプトテンプレートを作成
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", "あなたは親切で有能なAIアシスタントです。ユーザーのノート作成と編集をサポートします。利用可能なツールを使って、ユーザーの要求に応えてください。"),
            MessagesPlaceholder(variable_name="chat_history", optional=True),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])

        # Agentを作成
        self.agent = create_tool_calling_agent(self.llm, AVAILABLE_TOOLS, self.prompt)
        self.agent_executor = AgentExecutor(
            agent=self.agent,
            tools=AVAILABLE_TOOLS,
            verbose=True,  # デバッグ用
            max_iterations=5,  # 最大5回までツールを呼び出せる
            handle_parsing_errors=True,
            return_intermediate_steps=True
        )
    
    async def chat(self, message: str, context: Optional[ChatContext] = None) -> ChatResponse:
        """チャットメッセージを処理し、応答を返す（Agent Executor使用）"""

        # ファイルコンテキストを設定
        if context and context.currentFileContent:
            set_file_context(context.currentFileContent)
            logger.info(f"File context set: {context.currentFileContent.get('filename')}")
        elif context and context.attachedFileContent:
            set_file_context(context.attachedFileContent)
            logger.info(f"File context set from attached: {context.attachedFileContent.get('filename')}")
        else:
            set_file_context(None)

        # 会話履歴を構築
        chat_history: List[BaseMessage] = []
        history_count = 0
        if context and context.conversationHistory:
            history_count = len(context.conversationHistory)
            for history_message in context.conversationHistory:
                role = history_message.get('role')
                content = history_message.get('content', '')
                if role == 'user':
                    chat_history.append(HumanMessage(content=content))
                elif role == 'ai':
                    chat_history.append(AIMessage(content=content))

        # ユーザーメッセージを構築
        full_user_message = message
        if context and context.attachedFileContent:
            context_msg = f"\n\n[添付ファイル情報]\nファイル名: {context.attachedFileContent.get('filename')}\n内容:\n---\n{context.attachedFileContent.get('content')}\n---"
            full_user_message += context_msg

        # ログ記録
        log_llm_raw("openai", "agent_request", {
            "message": full_user_message,
            "model": self.model,
            "history_count": history_count,
            "has_file_context": bool(context and (context.currentFileContent or context.attachedFileContent))
        }, {})

        # AgentExecutorを実行
        try:
            result = await self.agent_executor.ainvoke({
                "input": full_user_message,
                "chat_history": chat_history
            })

            agent_output = result.get("output", "")

            # ログ記録
            log_llm_raw("openai", "agent_response", {
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
                log_llm_raw("openai", "agent_commands", {
                    "count": len(commands),
                    "actions": [f"{cmd.action}:{cmd.path}" for cmd in commands]
                }, {})

            return ChatResponse(
                message=agent_output,
                commands=commands if commands else None,
                provider="openai",
                model=self.model,
                historyCount=history_count
            )

        except Exception as e:
            logger.error(f"Agent execution error: {e}")
            return ChatResponse(
                message=f"エラーが発生しました: {str(e)}",
                provider="openai",
                model=self.model,
                historyCount=history_count
            )

    def _extract_commands_from_agent_result(self, result: dict) -> Optional[List[LLMCommand]]:
        """
        AgentExecutorの実行結果から、フロントエンドで実行すべきコマンドを抽出する
        （edit_fileのみ - read_fileはAgent内で処理済み）
        """
        commands = []
        intermediate_steps = result.get("intermediate_steps", [])

        for action, observation in intermediate_steps:
            # edit_fileツールが呼ばれた場合のみコマンドとして抽出
            if hasattr(action, 'tool') and action.tool == 'edit_file':
                tool_input = action.tool_input
                commands.append(LLMCommand(
                    action='edit_file',
                    path=tool_input.get('filename'),
                    content=tool_input.get('content')
                ))

        return commands if commands else None
