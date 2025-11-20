"""
Application Layer - Send Chat Message Command

チャットメッセージ送信コマンドを定義します。
CQRSパターンにおけるCommandの実装です。

責務:
- チャットメッセージ送信処理のオーケストレーション
- LLMプロバイダーの取得と実行
- Legacy Pydanticモデルとアプリケーション層DTOの変換
- エラーハンドリングとロギング
"""

from src.application.llm.dto.chat_dto import (
    ChatContextDTO,
    ChatRequestDTO,
    ChatResponseDTO,
    LLMCommandDTO,
    TokenUsageDTO,
)
from src.core.logger import logger
from src.domain.llm.providers.factory import LLMClientFactory
from src.llm.models import ChatContext  # Legacy Pydanticモデル（段階的移行のため一時使用）


class SendChatMessageCommand:
    """チャットメッセージ送信コマンド

    CQRSパターンにおけるCommandの実装。
    チャットメッセージの送信処理をカプセル化し、
    Domain層のProvidersを使用してLLMとの通信を行います。

    Note: 現在はLegacy Pydanticモデル（ChatContext, ChatResponse）を使用していますが、
    将来的にはDomain層の純粋なエンティティに移行予定です。
    """

    def __init__(self):
        """コンストラクタ

        Note: 現時点では依存注入は最小限。
        LLMClientFactoryは静的ファクトリーメソッドを使用。
        将来的にはConversationRepositoryなどを注入予定。
        """
        pass

    async def execute(self, request: ChatRequestDTO) -> ChatResponseDTO:
        """チャットメッセージを送信して応答を取得

        処理フロー:
        1. WebSocket client_idの設定（ツール実行に必要）
        2. LLMプロバイダーの取得（Factory経由）
        3. コンテキストDTOをLegacyモデルに変換
        4. LLMプロバイダーでチャット実行
        5. レスポンスをDTOに変換して返却

        Args:
            request: チャットリクエストDTO
                - message: ユーザーメッセージ
                - provider: LLMプロバイダー名（"gemini", "openai"等）
                - model: モデル名
                - context: チャットコンテキスト（オプション）
                - client_id: WebSocket接続ID（オプション）

        Returns:
            ChatResponseDTO: チャット応答
                - message: AI応答メッセージ
                - commands: 抽出されたLLMコマンド（ファイル操作等）
                - provider: 使用したプロバイダー
                - model: 使用したモデル
                - history_count: 会話履歴数
                - token_usage: トークン使用量情報

        Raises:
            Exception: LLMプロバイダーのエラー（内部でキャッチしてエラーメッセージを返す）
        """
        # 1. client_id設定（WebSocket用）
        # Note: ツール（read_file等）がWebSocket経由でファイル内容を取得する際に使用
        if request.client_id:
            from src.shared.utils import set_client_id
            set_client_id(request.client_id)
            logger.debug(f"Client ID set for this request: {request.client_id}")

        # 2. プロバイダー取得
        provider = LLMClientFactory.create_provider(request.provider, request.model)

        if not provider:
            # プロバイダーが取得できない場合（APIキー未設定等）
            logger.warning(
                f"LLM provider not available: provider={request.provider}, "
                f"model={request.model}"
            )
            return ChatResponseDTO(
                message="申し訳ありません。現在LLMサービスが利用できません。APIキーを設定してください。",
                provider=request.provider,
                model=request.model
            )

        # 3. コンテキストの準備
        # Note: 現時点ではDTOをLegacy ChatContextに変換
        # 将来的にはDomain層のContextエンティティを使用
        context = self._convert_context_dto_to_legacy(request.context) if request.context else None

        try:
            # 4. チャット実行
            logger.info(
                f"Executing chat: provider={request.provider}, model={request.model}, "
                f"message_length={len(request.message)}"
            )
            response = await provider.chat(request.message, context)

            # 5. Legacy ChatResponse → ChatResponseDTO 変換
            response_dto = self._convert_response_to_dto(response)

            logger.info(
                f"Chat completed: provider={response.provider}, model={response.model}, "
                f"response_length={len(response.message)}, "
                f"commands_count={len(response_dto.commands) if response_dto.commands else 0}"
            )

            return response_dto

        except Exception as e:
            import traceback
            logger.error(f"Error in SendChatMessageCommand: {str(e)}")
            logger.error(traceback.format_exc())
            return ChatResponseDTO(
                message=f"エラーが発生しました: {str(e)}",
                provider=request.provider,
                model=request.model
            )

    def _convert_context_dto_to_legacy(self, context_dto: ChatContextDTO) -> ChatContext:
        """ChatContextDTOをLegacy ChatContextに変換

        DTOのsnake_caseフィールドをPydanticのcamelCaseフィールドにマッピングします。

        Note: 現時点ではDTOとLegacyモデルの構造がほぼ同じなので、
        フィールドを1:1でマッピングします。
        activeScreenはDTOに含まれていないため、Noneになります。

        Args:
            context_dto: アプリケーション層のコンテキストDTO

        Returns:
            ChatContext: Legacy Pydanticモデル
        """
        return ChatContext(
            currentPath=context_dto.current_path,
            fileList=context_dto.file_list,
            currentFile=context_dto.current_file,
            currentFileContent=context_dto.current_file_content,
            attachedFileContent=context_dto.attached_file_content,
            conversationHistory=context_dto.conversation_history,
            activeScreen=None,  # DTOには含まれていない
            allFiles=context_dto.all_files,
            sendFileContextToLLM=context_dto.send_file_context_to_llm
        )

    def _convert_response_to_dto(self, response) -> ChatResponseDTO:
        """Legacy ChatResponseをChatResponseDTOに変換

        PydanticモデルをdataclassベースのDTOに変換します。

        Args:
            response: Legacy ChatResponse（Pydanticモデル）

        Returns:
            ChatResponseDTO: アプリケーション層のレスポンスDTO
        """
        # commandsの変換
        commands_dto = None
        if response.commands:
            commands_dto = [
                LLMCommandDTO(
                    action=cmd.action,
                    title=cmd.title,
                    new_title=cmd.new_title,
                    content=cmd.content,
                    category=cmd.category,
                    tags=cmd.tags,
                    start_line=cmd.start_line,
                    end_line=cmd.end_line
                )
                for cmd in response.commands
            ]

        # tokenUsageの変換
        token_usage_dto = None
        if response.tokenUsage:
            token_usage_dto = TokenUsageDTO(
                current_tokens=response.tokenUsage.currentTokens,
                max_tokens=response.tokenUsage.maxTokens,
                usage_ratio=response.tokenUsage.usageRatio,
                needs_summary=response.tokenUsage.needsSummary,
                input_tokens=response.tokenUsage.inputTokens,
                output_tokens=response.tokenUsage.outputTokens,
                total_tokens=response.tokenUsage.totalTokens
            )

        return ChatResponseDTO(
            message=response.message,
            commands=commands_dto,
            provider=response.provider,
            model=response.model,
            history_count=response.historyCount,
            token_usage=token_usage_dto
        )
