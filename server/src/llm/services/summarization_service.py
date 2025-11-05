"""会話履歴の要約サービス

長い会話履歴を圧縮して、重要な情報を保持したまま
トークン数を削減するためのサービス。
"""
from typing import List, Dict, Any, Optional
from datetime import datetime
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage

from src.core.config import settings
from src.core.logger import logger
from src.llm.models import SummarizeResponse, SummaryResult
from src.llm.utils.token_counter import count_message_tokens


class SummarizationService:
    """会話履歴の要約を行うサービス"""

    def __init__(self):
        pass

    def _get_llm_instance(self, provider: str, model: Optional[str]):
        """LLMインスタンスを取得する（Gemini専用）

        Args:
            provider: LLMプロバイダー（"gemini"のみサポート）
            model: モデル名（Noneの場合はデフォルト）

        Returns:
            LangChain LLM instance
        """
        if provider == "gemini":
            if not settings.gemini_api_key:
                raise ValueError("Gemini API key is not configured")

            model_name = model or settings.get_default_model("gemini")
            return ChatGoogleGenerativeAI(
                api_key=settings.gemini_api_key,
                model=model_name,
                temperature=0.3,
            )

        else:
            raise ValueError(f"Unsupported provider: {provider}. Only 'gemini' is supported.")

    async def summarize(
        self,
        conversation_history: List[Dict[str, Any]],
        max_tokens: int = 4000,
        preserve_recent: int = 10,
        provider: Optional[str] = None,
        model: Optional[str] = None
    ) -> SummarizeResponse:
        """会話履歴を要約する

        Args:
            conversation_history: 要約対象の会話履歴
            max_tokens: 圧縮後の最大トークン数
            preserve_recent: 保持する最新メッセージ数
            provider: 要約に使用するLLMプロバイダー（Noneの場合はデフォルト）
            model: 要約に使用するモデル（Noneの場合はデフォルト）

        Returns:
            SummarizeResponse: 要約結果
        """
        # プロバイダーのデフォルト値を設定
        if provider is None:
            provider = settings.get_default_provider()

        logger.info(
            f"Starting summarization: {len(conversation_history)} messages, "
            f"preserve_recent={preserve_recent}, max_tokens={max_tokens}, provider={provider}"
        )

        # 元のトークン数を計算
        original_tokens = count_message_tokens(
            conversation_history,
            provider=provider,
            model=model or settings.get_default_model(provider)
        )

        # メッセージを分割: 古いメッセージ vs 最新メッセージ
        if len(conversation_history) <= preserve_recent:
            logger.warning(
                f"Conversation history ({len(conversation_history)} messages) "
                f"is smaller than preserve_recent ({preserve_recent}). "
                "No summarization needed."
            )
            # 要約不要の場合でもレスポンスを返す
            return SummarizeResponse(
                summary=SummaryResult(
                    content="要約は不要です（会話履歴が短いため）",
                    timestamp=datetime.now().isoformat()
                ),
                recentMessages=conversation_history,
                compressionRatio=1.0,
                originalTokens=original_tokens,
                compressedTokens=original_tokens
            )

        old_messages = conversation_history[:-preserve_recent]
        recent_messages = conversation_history[-preserve_recent:]

        logger.info(
            f"Splitting messages: {len(old_messages)} old, {len(recent_messages)} recent"
        )

        # 古いメッセージを要約
        try:
            llm = self._get_llm_instance(provider, model)
            summary_text = await self._create_summary(llm, old_messages)

            # 要約メッセージを作成
            summary_result = SummaryResult(
                content=summary_text,
                timestamp=datetime.now().isoformat()
            )

            # 圧縮後のトークン数を計算
            # 要約 + 最新メッセージ
            compressed_messages = [
                {"role": "system", "content": summary_text}
            ] + recent_messages

            compressed_tokens = count_message_tokens(
                compressed_messages,
                provider=provider,
                model=model or settings.get_default_model(provider)
            )

            compression_ratio = compressed_tokens / original_tokens if original_tokens > 0 else 1.0

            # 要約が逆効果（トークンが増えた）または効果が小さい場合は警告
            if compression_ratio >= 1.0:
                logger.warning(
                    f"Summarization increased token count: {original_tokens} -> {compressed_tokens} tokens "
                    f"(compression ratio: {compression_ratio:.2%}). "
                    f"This likely means too few messages were summarized (preserve_recent={preserve_recent})."
                )
            elif compression_ratio > 0.95:
                logger.warning(
                    f"Summarization had minimal effect: {original_tokens} -> {compressed_tokens} tokens "
                    f"(compression ratio: {compression_ratio:.2%})"
                )
            else:
                logger.info(
                    f"Summarization complete: {original_tokens} -> {compressed_tokens} tokens "
                    f"(compression ratio: {compression_ratio:.2%})"
                )

            logger.info(f"Generated summary: {summary_text[:200]}..." if len(summary_text) > 200 else f"Generated summary: {summary_text}")

            return SummarizeResponse(
                summary=summary_result,
                recentMessages=recent_messages,
                compressionRatio=compression_ratio,
                originalTokens=original_tokens,
                compressedTokens=compressed_tokens
            )

        except Exception as e:
            logger.error(f"Error during summarization: {str(e)}")
            raise

    async def _create_summary(
        self,
        llm,
        messages: List[Dict[str, Any]]
    ) -> str:
        """LLMを使用して会話履歴の要約を生成する

        Args:
            llm: LangChain LLM instance
            messages: 要約対象のメッセージリスト

        Returns:
            要約テキスト
        """
        # 会話履歴をテキストに変換
        conversation_text = self._format_messages_for_summary(messages)

        # 要約プロンプトを構築
        summary_prompt = self._build_summary_prompt(conversation_text)

        # LLMに要約を依頼
        response = await llm.ainvoke([HumanMessage(content=summary_prompt)])

        # レスポンスからテキストを抽出
        if hasattr(response, 'content'):
            summary_text = response.content
        else:
            summary_text = str(response)

        return summary_text.strip()

    def _format_messages_for_summary(self, messages: List[Dict[str, Any]]) -> str:
        """メッセージリストを要約用のテキストに整形する

        Args:
            messages: メッセージリスト

        Returns:
            整形されたテキスト
        """
        formatted_lines = []

        for i, msg in enumerate(messages, 1):
            role = msg.get("role", "unknown")
            content = msg.get("content", "")

            # roleを日本語化
            role_jp = "ユーザー" if role == "user" else "AI"

            formatted_lines.append(f"{i}. {role_jp}: {content}")

        return "\n".join(formatted_lines)

    def _build_summary_prompt(self, conversation_text: str) -> str:
        """要約用のプロンプトを構築する

        Args:
            conversation_text: 整形された会話テキスト

        Returns:
            要約プロンプト
        """
        prompt = f"""以下の会話履歴を簡潔に要約してください。要約には以下の情報を含めてください：

1. **ユーザーの主な目的や意図**: ユーザーが何を実現しようとしているか
2. **実行済みのタスクと成果**: これまでに完了したタスクや実装した機能
3. **重要な技術的コンテキスト**: ファイル名、実装詳細、技術スタックなど
4. **未完了または進行中のタスク**: まだ完了していないタスクや、次にやるべきこと
5. **重要な決定事項や制約**: 実装方針、使用技術、制約条件など

会話履歴:
{conversation_text}

以下の形式で簡潔に要約してください（各項目は2-3文程度）:

【会話要約】

1. ユーザー意図: ...
2. 実行済みタスク: ...
3. 重要なコンテキスト: ...
4. 未完了事項: ...
5. 決定事項: ...
"""
        return prompt

    async def summarize_document(
        self,
        content: str,
        title: str,
        provider: Optional[str] = None,
        model: Optional[str] = None
    ) -> str:
        """文書内容を要約する

        Args:
            content: 文書の内容
            title: 文書のタイトル（コンテキスト用）
            provider: 要約に使用するLLMプロバイダー（Noneの場合はデフォルト）
            model: 要約に使用するモデル（Noneの場合はデフォルト）

        Returns:
            要約テキスト
        """
        # プロバイダーのデフォルト値を設定
        if provider is None:
            provider = settings.get_default_provider()

        logger.info(
            f"Starting document summarization: title='{title}', "
            f"content_length={len(content)}, provider={provider}"
        )

        try:
            llm = self._get_llm_instance(provider, model)
            summary_text = await self._create_document_summary(llm, title, content)

            logger.info(f"Document summarization complete: {summary_text[:100]}...")
            return summary_text

        except Exception as e:
            logger.error(f"Error during document summarization: {str(e)}")
            raise

    async def _create_document_summary(
        self,
        llm,
        title: str,
        content: str
    ) -> str:
        """LLMを使用して文書の要約を生成する

        Args:
            llm: LangChain LLM instance
            title: 文書のタイトル
            content: 文書の内容

        Returns:
            要約テキスト
        """
        # 要約プロンプトを構築
        summary_prompt = self._build_document_summary_prompt(title, content)

        # LLMに要約を依頼
        response = await llm.ainvoke([HumanMessage(content=summary_prompt)])

        # レスポンスからテキストを抽出
        if hasattr(response, 'content'):
            summary_text = response.content
        else:
            summary_text = str(response)

        return summary_text.strip()

    def _build_document_summary_prompt(self, title: str, content: str) -> str:
        """文書要約用のプロンプトを構築する

        Args:
            title: 文書のタイトル
            content: 文書の内容

        Returns:
            要約プロンプト
        """
        prompt = f"""以下の文書を簡潔に要約してください。

文書タイトル: {title}

文書内容:
{content}

要件:
- 「本文書は」という書き出しから始める
- 文書の主要なトピックや目的を明確にする
- 重要なポイントを漏らさず含める
- 簡潔でありながら、文書の全体像が分かる内容にする
- 自然な文章で記述する（箇条書きや記号は使わない）
- 200文字程度で要約する

要約:"""
        return prompt
