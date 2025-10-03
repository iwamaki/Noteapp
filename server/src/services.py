# @file services.py
# @summary このファイルは、LLM（大規模言語モデル）とのインタラクションを管理するビジネスロジック（サービス層）を提供します。
# OpenAIおよびGoogle GeminiのLLMプロバイダーを統合し、チャットメッセージの処理、ツール呼び出しの実行、およびコンテキストの管理を行います。
# @responsibility LLMからの応答を生成し、必要に応じてファイル編集などのツール呼び出しコマンドを抽出し、
# アプリケーションの他の部分に返します。また、APIキーの管理やエラーハンドリングも行います。
from typing import Optional, List
import os
from google.cloud import secretmanager
from google.api_core import exceptions
from .models import ChatResponse, ChatContext, LLMCommand
from .tools import AVAILABLE_TOOLS


class SimpleLLMService:
    def __init__(self):
        self.openai_api_key = None
        self.gemini_api_key = None

        gcp_project_id = os.getenv("GCP_PROJECT_ID")
        openai_secret_id = os.getenv("OPENAI_API_SECRET_ID", "OPENAI_API_KEY")
        gemini_secret_id = os.getenv("GEMINI_API_SECRET_ID", "GOOGLE_API_KEY")
        
        # GOOGLE_APPLICATION_CREDENTIALS が設定されている場合、Secret Managerを試す
        if os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
            try:
                client = secretmanager.SecretManagerServiceClient()
                
                # OpenAI APIキーの取得
                if gcp_project_id and openai_secret_id:
                    secret_name = f"projects/{gcp_project_id}/secrets/{openai_secret_id}/versions/latest"
                    try:
                        response = client.access_secret_version(request={"name": secret_name})
                        self.openai_api_key = response.payload.data.decode("UTF-8").strip()
                    except exceptions.NotFound:
                        print(f"Secret {openai_secret_id} not found in project {gcp_project_id}. Falling back to environment variable.")
                    except Exception as e:
                        print(f"Error accessing secret {openai_secret_id}: {e}. Falling back to environment variable.")

                # Gemini APIキーの取得
                if gcp_project_id and gemini_secret_id:
                    secret_name = f"projects/{gcp_project_id}/secrets/{gemini_secret_id}/versions/latest"
                    try:
                        response = client.access_secret_version(request={"name": secret_name})
                        self.gemini_api_key = response.payload.data.decode("UTF-8").strip()
                    except exceptions.NotFound:
                        print(f"Secret {gemini_secret_id} not found in project {gcp_project_id}. Falling back to environment variable.")
                    except Exception as e:
                        print(f"Error accessing secret {gemini_secret_id}: {e}. Falling back to environment variable.")

            except Exception as e:
                print(f"Could not initialize Secret Manager client: {e}. Falling back to environment variables.")

    # チャットメッセージを処理するメインメソッド
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

                # Tool Callingを有効化
                llm_with_tools = llm.bind_tools(AVAILABLE_TOOLS)

                messages = [
                    SystemMessage(content="あなたは親切で有能なAIアシスタントです。ユーザーのノート作成と編集をサポートします。"),
                    HumanMessage(content=message)
                ]

                # コンテキストがある場合は追加情報を含める
                if context and context.currentFileContent:
                    context_msg = f"\n\n現在編集中のファイル: {context.currentFileContent.get('filename')}\n内容:\n{context.currentFileContent.get('content')}"
                    messages.append(HumanMessage(content=context_msg))

                response = llm_with_tools.invoke(messages)

                # ツール呼び出しがあるかチェック
                commands = self._extract_tool_calls(response)

                return ChatResponse(
                    message=response.content if response.content else "ファイルの編集コマンドを生成しました。",
                    commands=commands if commands else None,
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

                # Tool Callingを有効化
                llm_with_tools = llm.bind_tools(AVAILABLE_TOOLS)

                messages = [
                    SystemMessage(content="あなたは親切で有能なAIアシスタントです。ユーザーのノート作成と編集をサポートします。"),
                    HumanMessage(content=message)
                ]

                if context and context.currentFileContent:
                    context_msg = f"\n\n現在編集中のファイル: {context.currentFileContent.get('filename')}\n内容:\n{context.currentFileContent.get('content')}"
                    messages.append(HumanMessage(content=context_msg))

                response = llm_with_tools.invoke(messages)

                # ツール呼び出しがあるかチェック
                commands = self._extract_tool_calls(response)

                return ChatResponse(
                    message=response.content if response.content else "ファイルの編集コマンドを生成しました。",
                    commands=commands if commands else None,
                    provider=provider,
                    model=model
                )

            else:
                # APIキーが設定されていない場合のフォールバック
                return ChatResponse(
                    message=f"受信したメッセージ: {message}\n\n申し訳ありません。現在LLMサービスが利用できません。APIキーを設定してください。",
                    provider=provider,
                    model=model
                )

        except Exception as e:
            import traceback
            print(f"Error in process_chat: {str(e)}")
            print(traceback.format_exc()) 
            return ChatResponse(
                message=f"エラーが発生しました: {str(e)}",
                provider=provider,
                model=model
            )

    # LLMのレスポンスからツール呼び出しを抽出するヘルパーメソッド
    def _extract_tool_calls(self, response) -> Optional[List[LLMCommand]]:
        """
        LLMのレスポンスからツール呼び出しを抽出し、LLMCommandに変換する
        """
        if not hasattr(response, 'tool_calls') or not response.tool_calls:
            return None

        commands = []
        for tool_call in response.tool_calls:
            # edit_fileツールの場合
            if tool_call.get('name') == 'edit_file':
                args = tool_call.get('args', {})
                commands.append(LLMCommand(
                    action='edit_file',
                    path=args.get('filename'),
                    content=args.get('content')
                ))

        return commands if commands else None
