"""Process Chat Use Case

This use case handles the main chat processing workflow:
1. Token balance validation
2. LLM provider invocation
3. Token consumption recording
4. Command extraction
5. Response construction
"""
from src.core.logger import logger

from ...domain import CommandExtractorService
from ..dtos import (
    ChatRequestDTO,
    ChatResponseDTO,
    TokenUsageInfoDTO,
    chat_context_dto_to_domain,
)
from ..ports.output import BillingPort, LLMProviderPort


class ProcessChatUseCase:
    """Process chat message use case

    This use case orchestrates the chat processing workflow,
    integrating token validation, LLM invocation, and billing.
    """

    def __init__(
        self,
        llm_provider_port: LLMProviderPort,
        billing_port: BillingPort,
        command_extractor: CommandExtractorService
    ):
        """Initialize use case

        Args:
            llm_provider_port: LLM provider port
            billing_port: Billing port
            command_extractor: Command extractor domain service
        """
        self.llm_provider = llm_provider_port
        self.billing = billing_port
        self.command_extractor = command_extractor

    async def execute(
        self,
        request: ChatRequestDTO,
        user_id: str
    ) -> ChatResponseDTO:
        """Execute chat processing use case

        Args:
            request: Chat request DTO
            user_id: Authenticated user ID

        Returns:
            ChatResponseDTO with response message, commands, token usage, etc.

        Raises:
            ValueError: If token balance is insufficient
            Exception: If LLM provider error occurs
        """
        logger.info(
            f"Starting chat processing: user={user_id}, "
            f"provider={request.provider}, model={request.model}",
            extra={"category": "llm"}
        )

        # Step 1: Validate token balance
        # Estimate tokens needed (context + message + estimated response)
        estimated_tokens = await self._estimate_tokens(request)

        logger.info(
            f"Estimated tokens: {estimated_tokens}",
            extra={"category": "llm"}
        )

        try:
            self.billing.validate_token_balance(request.model, estimated_tokens)
        except ValueError as e:
            logger.warning(
                f"Token validation failed: {str(e)}",
                extra={"category": "llm"}
            )
            return ChatResponseDTO(
                message="",
                error=str(e),
                provider=request.provider,
                model=request.model
            )

        # Step 2: Convert DTO to Domain
        domain_context = chat_context_dto_to_domain(request.context)

        # Step 3: Call LLM provider
        try:
            # Use user_id as client_id for WebSocket operations
            # (フロントエンドがWebSocket接続時にclient_idを送っていないため、user_idを使用)
            llm_response = await self.llm_provider.chat(
                message=request.message,
                context=domain_context,
                user_id=user_id,
                model=request.model,
                client_id=user_id  # WebSocketで使用されているclient_idはuser_id
            )

            logger.info(
                f"LLM response received: {len(llm_response.get('message', ''))} chars",
                extra={"category": "llm"}
            )

        except Exception as e:
            import traceback
            logger.error(
                f"LLM provider error: {str(e)}",
                extra={"category": "llm"}
            )
            logger.error(traceback.format_exc(), extra={"category": "llm"})
            return ChatResponseDTO(
                message="",
                error=f"LLMエラーが発生しました: {str(e)}",
                provider=request.provider,
                model=request.model
            )

        # Step 4: Record token consumption (if usage metadata available)
        input_tokens = llm_response.get("input_tokens")
        output_tokens = llm_response.get("output_tokens")

        if input_tokens and output_tokens:
            try:
                self.billing.record_token_consumption(
                    model_id=request.model,
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                    metadata={
                        "operation": "chat",
                        "provider": request.provider,
                        "user_id": user_id
                    }
                )
                logger.info(
                    f"Token consumption recorded: input={input_tokens}, output={output_tokens}",
                    extra={"category": "llm"}
                )
            except Exception as e:
                logger.error(
                    f"Failed to record token consumption: {str(e)}",
                    extra={"category": "llm"}
                )

        # Step 5: Extract commands
        # Note: Legacy provider returns commands directly (not via agent_result)
        commands = []
        legacy_commands = llm_response.get("commands")
        if legacy_commands:
            # Commands are already in format, convert to DTO
            from ..dtos import LLMCommandDTO
            try:
                for legacy_cmd in legacy_commands:
                    # Convert command dict/object to DTO
                    cmd_dict = legacy_cmd if isinstance(legacy_cmd, dict) else legacy_cmd.dict()
                    action = cmd_dict.get("action")
                    if not action:
                        logger.warning(
                            "Skipping command without action",
                            extra={"category": "llm"}
                        )
                        continue
                    commands.append(LLMCommandDTO(
                        action=action,
                        title=cmd_dict.get("title"),
                        new_title=cmd_dict.get("new_title"),
                        content=cmd_dict.get("content"),
                        category=cmd_dict.get("category"),
                        tags=cmd_dict.get("tags"),
                        start_line=cmd_dict.get("start_line"),
                        end_line=cmd_dict.get("end_line")
                    ))
                logger.info(
                    f"Extracted {len(commands)} commands",
                    extra={"category": "llm"}
                )
            except Exception as e:
                logger.error(
                    f"Command extraction error: {str(e)}",
                    extra={"category": "llm"}
                )

        # Step 6: Convert token usage to DTO
        token_usage_dto = None
        if llm_response.get("token_usage"):
            # LLM provider returns Pydantic model with camelCase fields
            # Convert to DTO directly
            legacy_token_usage = llm_response["token_usage"]
            token_usage_dto = TokenUsageInfoDTO(
                currentTokens=getattr(legacy_token_usage, 'currentTokens', 0),
                maxTokens=getattr(legacy_token_usage, 'maxTokens', 4000),
                usageRatio=getattr(legacy_token_usage, 'usageRatio', 0.0),
                needsSummary=getattr(legacy_token_usage, 'needsSummary', False),
                inputTokens=getattr(legacy_token_usage, 'inputTokens', None),
                outputTokens=getattr(legacy_token_usage, 'outputTokens', None),
                totalTokens=getattr(legacy_token_usage, 'totalTokens', None)
            )

        # Step 7: Construct response
        response = ChatResponseDTO(
            message=llm_response.get("message", ""),
            commands=commands if commands else None,
            provider=request.provider,
            model=request.model,
            historyCount=llm_response.get("history_count"),
            tokenUsage=token_usage_dto,
            warning=llm_response.get("warning")
        )

        logger.info(
            "Chat processing completed successfully",
            extra={"category": "llm"}
        )

        return response

    async def _estimate_tokens(self, request: ChatRequestDTO) -> int:
        """Estimate tokens needed for the request

        Args:
            request: Chat request DTO

        Returns:
            Estimated token count
        """
        # Simple estimation: message length + context + estimated response
        # TODO: Use proper token counter for more accurate estimation
        message_length = len(request.message)
        context_length = 0

        if request.context and request.context.conversationHistory:
            for msg in request.context.conversationHistory:
                context_length += len(msg.get("content", ""))

        # Estimate: 1 token ≈ 4 characters (rough approximation)
        estimated_input = (message_length + context_length) // 4

        # Estimate response: typically 2x input (conservative)
        estimated_output = estimated_input * 2

        total_estimated = estimated_input + estimated_output

        # Minimum: 1000 tokens
        return max(total_estimated, 1000)
