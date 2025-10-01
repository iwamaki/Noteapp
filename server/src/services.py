"""
ビジネスロジック（サービス層）
"""
from typing import Optional
import os
from .models import ChatResponse, ChatContext


class SimpleLLMService:
    def __init__(self):
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.gemini_api_key = os.getenv("GOOGLE_API_KEY")

    async def process_chat(
        self,
        message: str,
        provider: str = "openai",
        model: str = "gpt-3.5-turbo",
        context: Optional[ChatContext] = None
    ) -> ChatResponse:
        """チャットメッセージを処理"""
        try:
            # OpenAIを使用する場合
            if provider == "openai" and self.openai_api_key:
                from langchain_openai import ChatOpenAI
                from langchain.schema import HumanMessage, SystemMessage

                llm = ChatOpenAI(
                    api_key=self.openai_api_key,
                    model=model,
                    temperature=0.7
                )

                messages = [
                    SystemMessage(content="あなたは親切で有能なAIアシスタントです。ユーザーのノート作成と編集をサポートします。"),
                    HumanMessage(content=message)
                ]

                # コンテキストがある場合は追加情報を含める
                if context and context.currentFileContent:
                    context_msg = f"\n\n現在編集中のファイル: {context.currentFileContent.get('filename')}\n内容:\n{context.currentFileContent.get('content')}"
                    messages.append(HumanMessage(content=context_msg))

                response = llm.invoke(messages)

                return ChatResponse(
                    message=response.content,
                    response=response.content,
                    provider=provider,
                    model=model
                )

            # Geminiを使用する場合
            elif provider == "gemini" and self.gemini_api_key:
                from langchain_google_genai import ChatGoogleGenerativeAI
                from langchain.schema import HumanMessage, SystemMessage

                llm = ChatGoogleGenerativeAI(
                    model=model if model.startswith("gemini") else "gemini-1.5-flash",
                    google_api_key=self.gemini_api_key,
                    temperature=0.7
                )

                messages = [
                    SystemMessage(content="あなたは親切で有能なAIアシスタントです。ユーザーのノート作成と編集をサポートします。"),
                    HumanMessage(content=message)
                ]

                if context and context.currentFileContent:
                    context_msg = f"\n\n現在編集中のファイル: {context.currentFileContent.get('filename')}\n内容:\n{context.currentFileContent.get('content')}"
                    messages.append(HumanMessage(content=context_msg))

                response = llm.invoke(messages)

                return ChatResponse(
                    message=response.content,
                    response=response.content,
                    provider=provider,
                    model=model
                )

            else:
                # APIキーが設定されていない場合のフォールバック
                return ChatResponse(
                    message=f"受信したメッセージ: {message}\n\n申し訳ありません。現在LLMサービスが利用できません。APIキーを設定してください。",
                    response=f"エコー応答: {message}",
                    provider=provider,
                    model=model
                )

        except Exception as e:
            print(f"Error in process_chat: {str(e)}")
            return ChatResponse(
                message=f"エラーが発生しました: {str(e)}",
                response=f"エラー: {str(e)}",
                provider=provider,
                model=model
            )
