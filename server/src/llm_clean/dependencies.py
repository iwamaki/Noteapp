"""Dependency Injection for LLM Clean Architecture

This module provides FastAPI dependency functions for use cases and ports.
It acts as the composition root for the application.
"""
from collections.abc import Generator
from typing import Any

from fastapi import Depends
from sqlalchemy.orm import Session

from src.billing import SessionLocal
from src.core.logger import logger

# Import application layer
from .application.ports.output import (
    BillingPort,
    LLMProviderPort,
)
from .application.use_cases import (
    GetProviderInfoUseCase,
    ProcessChatUseCase,
    SummarizeConversationUseCase,
)

# Import domain services
from .domain import CommandExtractorService

# ===== Database Session Dependency =====

def get_db() -> Generator[Session, None, None]:
    """Get database session

    This is used for billing operations.

    Yields:
        SQLAlchemy Session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ===== Billing Port Dependency =====

class BillingPortImpl(BillingPort):
    """Billing port implementation using existing billing module"""

    def __init__(self, db: Session, user_id: str):
        from src.billing.application.services.billing_service import BillingService
        from src.billing.application.services.token_validator import TokenBalanceValidator

        self.db = db
        self.user_id = user_id
        self.validator = TokenBalanceValidator(db, user_id)
        self.service = BillingService(db, user_id)

    def validate_token_balance(self, model_id: str, estimated_tokens: int) -> None:
        """Validate token balance"""
        self.validator.validate_and_raise(model_id, estimated_tokens)

    def get_available_tokens(self, model_id: str) -> int:
        """Get available tokens"""
        return self.validator.get_available_tokens(model_id)

    def record_token_consumption(
        self,
        model_id: str,
        input_tokens: int,
        output_tokens: int,
        metadata: dict[str, Any]
    ) -> bool:
        """Record token consumption"""
        try:
            self.service.consume_tokens(
                model_id=model_id,
                input_tokens=input_tokens,
                output_tokens=output_tokens
            )
            logger.info(
                f"[BillingPortImpl] Token consumption recorded: "
                f"model={model_id}, input={input_tokens}, output={output_tokens}"
            )
            return True
        except Exception as e:
            logger.error(
                f"[BillingPortImpl] Failed to record token consumption: {str(e)}"
            )
            return False

    def get_balance_summary(self) -> dict[str, Any]:
        """Get balance summary"""
        return self.service.get_balance()

    def check_balance_exists(self, model_id: str) -> bool:
        """Check if balance exists"""
        return self.validator.verify_balance_exists(model_id)


def get_billing_port(db: Session = Depends(get_db), user_id: str = None) -> BillingPort:
    """Get billing port instance

    Args:
        db: Database session
        user_id: User ID (provided by router)

    Returns:
        BillingPort implementation
    """
    if not user_id:
        raise ValueError("user_id is required for billing operations")

    return BillingPortImpl(db, user_id)


# ===== LLM Provider Port Dependency =====

class LLMProviderPortImpl(LLMProviderPort):
    """LLM provider port implementation using Clean Architecture providers"""

    def __init__(self, provider_name: str, model: str):
        from .infrastructure.llm_providers.provider_factory import LLMClientFactory

        self.provider_name = provider_name
        self.model = model
        self._provider = LLMClientFactory.create_provider(provider_name, model)

    async def chat(
        self,
        message: str,
        context: Any = None,
        user_id: str = None,
        model: str = None
    ) -> dict[str, Any]:
        """Process chat"""
        if not self._provider:
            raise ValueError(f"Provider {self.provider_name} is not available")

        response = await self._provider.chat(message, context, user_id, model or self.model)

        # Convert ChatResponse to dict
        return {
            "message": response.message,
            "agent_result": getattr(response, 'agent_result', None),
            "input_tokens": response.tokenUsage.inputTokens if response.tokenUsage else None,
            "output_tokens": response.tokenUsage.outputTokens if response.tokenUsage else None,
            "token_usage": response.tokenUsage,
            "history_count": response.historyCount,
            "warning": response.warning
        }

    def get_provider_name(self) -> str:
        """Get provider name"""
        return self.provider_name

    def get_available_models(self) -> list[str]:
        """Get available models"""
        from .infrastructure.llm_providers.provider_registry import get_provider_config

        config = get_provider_config(self.provider_name)
        if not config:
            return []
        return config.get_model_ids()

    def is_available(self) -> bool:
        """Check if provider is available"""
        return self._provider is not None


def get_llm_provider_port(provider_name: str, model: str) -> LLMProviderPort:
    """Get LLM provider port instance

    Args:
        provider_name: Provider name (e.g., "gemini")
        model: Model name

    Returns:
        LLMProviderPort implementation
    """
    return LLMProviderPortImpl(provider_name, model)


# ===== Use Case Dependencies =====

def get_command_extractor() -> CommandExtractorService:
    """Get command extractor service

    Returns:
        CommandExtractorService instance
    """
    return CommandExtractorService()


def get_process_chat_use_case(
    provider_name: str,
    model: str,
    user_id: str,
    db: Session = Depends(get_db)
) -> ProcessChatUseCase:
    """Get ProcessChatUseCase instance

    Args:
        provider_name: Provider name
        model: Model name
        user_id: User ID
        db: Database session

    Returns:
        ProcessChatUseCase instance
    """
    llm_provider = get_llm_provider_port(provider_name, model)
    billing = BillingPortImpl(db, user_id)
    command_extractor = get_command_extractor()

    return ProcessChatUseCase(llm_provider, billing, command_extractor)


def get_summarize_conversation_use_case(
    provider_name: str,
    model: str,
    user_id: str,
    db: Session = Depends(get_db)
) -> SummarizeConversationUseCase:
    """Get SummarizeConversationUseCase instance

    Args:
        provider_name: Provider name
        model: Model name
        user_id: User ID
        db: Database session

    Returns:
        SummarizeConversationUseCase instance
    """
    llm_provider = get_llm_provider_port(provider_name, model)
    billing = BillingPortImpl(db, user_id)

    return SummarizeConversationUseCase(llm_provider, billing)


# ===== Provider Registry =====

def get_provider_registry() -> dict[str, LLMProviderPort]:
    """Get provider registry

    Returns:
        Dict of provider name -> provider port
    """
    from .infrastructure.llm_providers.provider_registry import (
        get_all_provider_names,
        get_provider_config,
    )

    provider_ports = {}
    provider_names = get_all_provider_names()

    for provider_name in provider_names:
        config = get_provider_config(provider_name)
        if config:
            default_model = config.default_model
            try:
                provider_port = get_llm_provider_port(provider_name, default_model)
                provider_ports[provider_name] = provider_port
            except Exception as e:
                logger.error(
                    f"[get_provider_registry] Failed to create port for {provider_name}: {str(e)}"
                )

    return provider_ports


def get_get_provider_info_use_case() -> GetProviderInfoUseCase:
    """Get GetProviderInfoUseCase instance

    Returns:
        GetProviderInfoUseCase instance
    """
    provider_registry = get_provider_registry()
    return GetProviderInfoUseCase(provider_registry)
