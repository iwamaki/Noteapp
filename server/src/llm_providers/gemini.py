# @file gemini.py
# @summary Google GeminiのLLMプロバイダーを実装します。
# @responsibility BaseLLMProviderを継承し、GeminiのAPIと通信してチャット応答を生成します。
from typing import Optional, List
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import HumanMessage, SystemMessage, AIMessage
from src.models import ChatResponse, ChatContext, LLMCommand
from src.tools.file_tools import AVAILABLE_TOOLS
from .base import BaseLLMProvider
from src.logger import logger, log_llm_raw

class GeminiProvider(BaseLLMProvider):
    """Google GeminiのLLMプロバイダー"""

    def __init__(self, api_key: str, model: str = "gemini-2.5-flash"):
        self.llm = ChatGoogleGenerativeAI(
            model=model if model.startswith("gemini") else "gemini-2.5-flash",
            google_api_key=api_key,
            temperature=0.7
        )
        self.model = model

    async def chat(self, message: str, context: Optional[ChatContext] = None) -> ChatResponse:
        """チャットメッセージを処理し、応答を返す"""
        llm_with_tools = self.llm.bind_tools(AVAILABLE_TOOLS)

        messages = [
            SystemMessage(content="あなたは親切で有能なAIアシスタントです。ユーザーのノート作成と編集をサポートします。")
        ]

        history_count = 0
        if context and context.conversationHistory:
            history_count = len(context.conversationHistory)
            for history_message in context.conversationHistory:
                role = history_message.get('role')
                content = history_message.get('content', '')
                if role == 'user':
                    messages.append(HumanMessage(content=content))
                elif role == 'ai':
                    messages.append(AIMessage(content=content))

        full_user_message = message
        if context and context.attachedFileContent:
            context_msg = f"\n\n[添付ファイル情報]\nファイル名: {context.attachedFileContent.get('filename')}\n内容:\n---\n{context.attachedFileContent.get('content')}\n---"
            full_user_message += context_msg
        
        messages.append(HumanMessage(content=full_user_message))

        # 生のメッセージ内容をログに記録
        log_llm_raw("gemini", "request", full_user_message, {
            "model": self.model,
            "history_count": history_count,
            "total_messages": len(messages)
        })

        response = llm_with_tools.invoke(messages)
        
        # 生のレスポンス全体をログに記録
        log_llm_raw("gemini", "response", {
            "content": response.content if response.content else "",
            "has_tool_calls": hasattr(response, 'tool_calls') and bool(response.tool_calls),
            "tool_calls_raw": response.tool_calls if hasattr(response, 'tool_calls') and response.tool_calls else [],
            "response_metadata": getattr(response, 'response_metadata', {}),
            "full_response": str(response)
        }, {
            "model": self.model
        })

        commands = self._extract_tool_calls(response)
        
        # コマンドの詳細をログに記録
        if commands:
            log_llm_raw("gemini", "commands", {
                "count": len(commands),
                "actions": [f"{cmd.action}:{cmd.path}" for cmd in commands],
                "detailed_commands": [
                    {
                        "action": cmd.action,
                        "path": cmd.path,
                        "content": cmd.content[:500] + "..." if cmd.content and len(cmd.content) > 500 else cmd.content
                    } for cmd in commands
                ]
            })
        
        content = response.content
        message = "".join(content) if isinstance(content, list) else content
        
        return ChatResponse(
            message=message if message else "ファイルの編集コマンドを生成しました。",
            commands=commands if commands else None,
            provider="gemini",
            model=self.model,
            historyCount=history_count
        )

    def _extract_tool_calls(self, response) -> Optional[List[LLMCommand]]:
        """
        LLMのレスポンスからツール呼び出しを抽出し、LLMCommandに変換する
        """
        if not hasattr(response, 'tool_calls') or not response.tool_calls:
            return None

        commands = []
        for tool_call in response.tool_calls:
            if tool_call.get('name') == 'edit_file':
                args = tool_call.get('args', {})
                commands.append(LLMCommand(
                    action='edit_file',
                    path=args.get('filename'),
                    content=args.get('content')
                ))
            elif tool_call.get('name') == 'read_file':
                args = tool_call.get('args', {})
                commands.append(LLMCommand(
                    action='read_file',
                    path=args.get('filename')
                ))

        return commands if commands else None
