"""
Application Layer - Summarize Conversation Command

会話履歴要約コマンドを定義します。
CQRSパターンにおけるCommandの実装です。

責務:
- 会話履歴の要約処理をオーケストレーション
- トークン数削減のための圧縮戦略の適用
- 重要な情報の保持と古いメッセージの要約
"""

from typing import Any

from src.core.logger import logger
from src.llm.models import SummarizeResponse  # Legacy Pydanticモデル
from src.llm.services.summarization_service import SummarizationService  # Legacy Service


class SummarizeConversationCommand:
    """会話履歴要約コマンド

    CQRSパターンにおけるCommandの実装。
    長い会話履歴を圧縮して、重要な情報を保持したまま
    トークン数を削減します。

    処理戦略:
    1. 最新N件のメッセージは保持（preserve_recent）
    2. 古いメッセージをLLMで要約
    3. 要約 + 最新メッセージで新しい会話履歴を構成

    Note: 現時点ではLegacy SummarizationServiceを使用。
    将来的にはDomain Servicesに移行予定。
    """

    def __init__(self):
        """コンストラクタ

        Note: 依存するSummarizationServiceは内部で初期化。
        将来的にはDIコンテナから注入する予定。
        """
        self.summarization_service = SummarizationService()

    async def execute(
        self,
        conversation_history: list[dict[str, Any]],
        max_tokens: int = 4000,
        preserve_recent: int = 10,
        provider: str | None = None,
        model: str | None = None
    ) -> SummarizeResponse:
        """会話履歴を要約する

        処理フロー:
        1. 元のトークン数を計算
        2. メッセージを分割（古いメッセージ vs 最新メッセージ）
        3. 古いメッセージをLLMで要約
        4. 要約 + 最新メッセージでトークン数を再計算
        5. 圧縮率などの統計情報を含むレスポンスを返却

        Args:
            conversation_history: 要約対象の会話履歴
                形式: [{"role": "user", "content": "..."}, ...]
            max_tokens: 圧縮後の最大トークン数（デフォルト: 4000）
            preserve_recent: 保持する最新メッセージ数（デフォルト: 10）
            provider: 要約に使用するLLMプロバイダー（"gemini", "openai"等）
                Noneの場合はデフォルトプロバイダーを使用
            model: 要約に使用するモデル
                Noneの場合はプロバイダーのデフォルトモデルを使用

        Returns:
            SummarizeResponse: 要約結果
                - summary: 要約されたシステムメッセージ
                - recentMessages: 保持された最新メッセージ
                - compressionRatio: 圧縮率（0.0-1.0）
                - originalTokens: 元のトークン数
                - compressedTokens: 圧縮後のトークン数

        Raises:
            Exception: LLMプロバイダーのエラー、要約生成エラー
        """
        logger.info(
            f"Executing SummarizeConversationCommand: "
            f"{len(conversation_history)} messages, "
            f"max_tokens={max_tokens}, preserve_recent={preserve_recent}, "
            f"provider={provider}, model={model}"
        )

        # SummarizationServiceに処理を委譲
        # Note: このサービスは既に完全な実装を持っているため、
        # ここでは薄いラッパーとして機能します。
        # 将来的にはDomain ServicesとEntitiesを使用した実装に移行します。
        response = await self.summarization_service.summarize(
            conversation_history=conversation_history,
            max_tokens=max_tokens,
            preserve_recent=preserve_recent,
            provider=provider,
            model=model
        )

        logger.info(
            f"SummarizeConversationCommand completed: "
            f"{response.originalTokens} -> {response.compressedTokens} tokens "
            f"(compression ratio: {response.compressionRatio:.2%})"
        )

        return response


class SummarizeDocumentCommand:
    """文書要約コマンド

    CQRSパターンにおけるCommandの実装。
    文書の内容をLLMで要約します。

    Note: 現時点ではLegacy SummarizationServiceを使用。
    将来的にはDomain Servicesに移行予定。
    """

    def __init__(self):
        """コンストラクタ"""
        self.summarization_service = SummarizationService()

    async def execute(
        self,
        content: str,
        title: str,
        provider: str | None = None,
        model: str | None = None
    ) -> dict[str, Any]:
        """文書を要約する

        Args:
            content: 文書の内容
            title: 文書のタイトル（コンテキスト用）
            provider: 要約に使用するLLMプロバイダー
                Noneの場合はデフォルトプロバイダーを使用
            model: 要約に使用するモデル
                Noneの場合はプロバイダーのデフォルトモデルを使用

        Returns:
            要約情報を含む辞書:
                - summary: 生成された要約テキスト
                - model: 使用したモデルID
                - inputTokens: 入力トークン数
                - outputTokens: 出力トークン数
                - totalTokens: 合計トークン数

        Raises:
            Exception: LLMプロバイダーのエラー、要約生成エラー
        """
        logger.info(
            f"Executing SummarizeDocumentCommand: "
            f"title='{title}', content_length={len(content)}, "
            f"provider={provider}, model={model}"
        )

        # SummarizationServiceに処理を委譲
        result = await self.summarization_service.summarize_document(
            content=content,
            title=title,
            provider=provider,
            model=model
        )

        logger.info(
            f"SummarizeDocumentCommand completed: "
            f"summary_length={len(result['summary'])}, "
            f"tokens: input={result.get('inputTokens')}, output={result.get('outputTokens')}"
        )

        return result
