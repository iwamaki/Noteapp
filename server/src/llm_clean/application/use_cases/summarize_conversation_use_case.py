"""Summarize Conversation Use Case

This use case handles conversation history summarization:
1. Token balance validation
2. Message splitting (old vs recent)
3. LLM summarization
4. Token consumption recording
5. Compression statistics calculation
"""
from datetime import datetime
from typing import Any

from src.core.logger import logger

from ..dtos import SummarizeRequestDTO, SummarizeResponseDTO, SummaryResultDTO
from ..ports.output import BillingPort, LLMProviderPort


class SummarizeConversationUseCase:
    """Summarize conversation history use case

    This use case compresses long conversation histories to reduce
    token usage while preserving important context.
    """

    def __init__(
        self,
        llm_provider_port: LLMProviderPort,
        billing_port: BillingPort
    ):
        """Initialize use case

        Args:
            llm_provider_port: LLM provider port
            billing_port: Billing port
        """
        self.llm_provider = llm_provider_port
        self.billing = billing_port

    async def execute(
        self,
        request: SummarizeRequestDTO,
        user_id: str
    ) -> SummarizeResponseDTO:
        """Execute conversation summarization use case

        Args:
            request: Summarize request DTO
            user_id: Authenticated user ID

        Returns:
            SummarizeResponseDTO with summary, compression stats, etc.

        Raises:
            ValueError: If token balance is insufficient
        """
        logger.info(
            f"[SummarizeConversationUseCase] Starting summarization: "
            f"user={user_id}, messages={len(request.conversationHistory)}, "
            f"preserve_recent={request.preserve_recent}"
        )

        # Step 1: Calculate original tokens
        original_tokens = await self._count_tokens(
            request.conversationHistory,
            request.provider,
            request.model
        )

        # Step 2: Split messages
        if len(request.conversationHistory) <= request.preserve_recent:
            logger.warning(
                "[SummarizeConversationUseCase] Conversation is too short to summarize"
            )
            return SummarizeResponseDTO(
                summary=SummaryResultDTO(
                    content="要約は不要です（会話履歴が短いため）",
                    timestamp=datetime.now().isoformat()
                ),
                recentMessages=request.conversationHistory,
                compressionRatio=1.0,
                originalTokens=original_tokens,
                compressedTokens=original_tokens,
                model=request.model
            )

        old_messages = request.conversationHistory[:-request.preserve_recent]
        recent_messages = request.conversationHistory[-request.preserve_recent:]

        logger.info(
            f"[SummarizeConversationUseCase] Split messages: "
            f"{len(old_messages)} old, {len(recent_messages)} recent"
        )

        # Step 3: Estimate tokens for summarization
        old_tokens = await self._count_tokens(old_messages, request.provider, request.model)
        estimated_summary_tokens = old_tokens // 4  # Assume 4:1 compression
        total_estimated = old_tokens + estimated_summary_tokens

        logger.info(
            f"[SummarizeConversationUseCase] Estimated tokens: {total_estimated}"
        )

        # Step 4: Validate token balance
        model_to_use = request.model or self._get_default_model(request.provider)
        try:
            self.billing.validate_token_balance(model_to_use, total_estimated)
        except ValueError as e:
            logger.error(
                f"[SummarizeConversationUseCase] Token validation failed: {str(e)}"
            )
            raise

        # Step 5: Create summary prompt
        summary_prompt = self._build_summary_prompt(old_messages)

        # Step 6: Call LLM for summarization
        try:
            # Use a simple chat call for summarization
            llm_response = await self.llm_provider.chat(
                message=summary_prompt,
                context=None,
                user_id=user_id,
                model=model_to_use
            )

            summary_text = llm_response.get("message", "")
            logger.info(
                f"[SummarizeConversationUseCase] Summary generated: {len(summary_text)} chars"
            )

        except Exception as e:
            logger.error(
                f"[SummarizeConversationUseCase] Summarization failed: {str(e)}"
            )
            raise

        # Step 7: Record token consumption
        input_tokens = llm_response.get("input_tokens")
        output_tokens = llm_response.get("output_tokens")

        if input_tokens and output_tokens:
            try:
                self.billing.record_token_consumption(
                    model_id=model_to_use,
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                    metadata={
                        "operation": "summarization",
                        "provider": request.provider,
                        "user_id": user_id
                    }
                )
                logger.info(
                    "[SummarizeConversationUseCase] Token consumption recorded"
                )
            except Exception as e:
                logger.error(
                    f"[SummarizeConversationUseCase] Failed to record tokens: {str(e)}"
                )

        # Step 8: Calculate compressed tokens
        compressed_messages = [
            {"role": "system", "content": summary_text}
        ] + recent_messages

        compressed_tokens = await self._count_tokens(
            compressed_messages,
            request.provider,
            request.model
        )

        compression_ratio = compressed_tokens / original_tokens if original_tokens > 0 else 1.0

        logger.info(
            f"[SummarizeConversationUseCase] Compression: "
            f"{original_tokens} -> {compressed_tokens} tokens "
            f"(ratio: {compression_ratio:.2%})"
        )

        # Step 9: Construct response
        summary_result = SummaryResultDTO(
            content=summary_text,
            timestamp=datetime.now().isoformat()
        )

        return SummarizeResponseDTO(
            summary=summary_result,
            recentMessages=recent_messages,
            compressionRatio=compression_ratio,
            originalTokens=original_tokens,
            compressedTokens=compressed_tokens,
            tokenUsage={
                "inputTokens": input_tokens,
                "outputTokens": output_tokens,
                "totalTokens": input_tokens + output_tokens if input_tokens and output_tokens else None
            },
            model=model_to_use
        )

    async def _count_tokens(
        self,
        messages: list[dict[str, Any]],
        provider: str,
        model: str | None
    ) -> int:
        """Count tokens in messages

        Args:
            messages: List of messages
            provider: Provider name
            model: Model name

        Returns:
            Token count
        """
        # Simple estimation: 1 token ≈ 4 characters
        # TODO: Use proper token counter
        total_chars = sum(len(msg.get("content", "")) for msg in messages)
        return total_chars // 4

    def _build_summary_prompt(self, messages: list[dict[str, Any]]) -> str:
        """Build summary prompt

        Args:
            messages: Messages to summarize

        Returns:
            Summary prompt
        """
        formatted_lines = []
        for i, msg in enumerate(messages, 1):
            role = msg.get("role", "unknown")
            content = msg.get("content", "")
            role_jp = "ユーザー" if role == "user" else "AI"
            formatted_lines.append(f"{i}. {role_jp}: {content}")

        conversation_text = "\n".join(formatted_lines)

        return f"""以下の会話履歴を簡潔に要約してください。要約には以下の情報を含めてください：

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

    def _get_default_model(self, provider: str) -> str:
        """Get default model for provider

        Args:
            provider: Provider name

        Returns:
            Default model name
        """
        # TODO: Get from settings
        if provider == "gemini":
            return "gemini-2.0-flash-exp"
        elif provider == "openai":
            return "gpt-4o-mini"
        else:
            return "gemini-2.0-flash-exp"
