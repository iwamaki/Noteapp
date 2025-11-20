"""Token Counter Utilities (Compatibility Layer)

This module provides utility functions for token counting that maintain
compatibility with existing code while using the Clean Architecture implementation.
"""
from typing import Any

from src.core.config import settings
from src.core.logger import logger

from ..infrastructure.token_counting.gemini_token_counter import GeminiTokenCounter


# Cache token counter instances
_token_counter_cache: dict[str, Any] = {}


def _get_token_counter(provider: str = "gemini", model: str | None = None) -> Any:
    """Get or create a token counter instance

    Args:
        provider: Provider name (currently only "gemini" is supported)
        model: Model name (optional)

    Returns:
        Token counter instance
    """
    cache_key = f"{provider}:{model}"

    if cache_key not in _token_counter_cache:
        if provider == "gemini" or provider is None:
            if not settings.gemini_api_key:
                return None

            default_model = model or settings.get_default_model("gemini")
            _token_counter_cache[cache_key] = GeminiTokenCounter(
                api_key=settings.gemini_api_key,
                default_model=default_model
            )
        else:
            logger.warning(f"Unsupported provider for token counting: {provider}")
            return None

    return _token_counter_cache.get(cache_key)


def count_tokens(text: str) -> int:
    """Count tokens in a text string (Gemini)

    Args:
        text: The text to count tokens for

    Returns:
        Number of tokens
    """
    try:
        counter = _get_token_counter("gemini")
        if not counter:
            logger.warning("Token counter not available, using character-based estimation")
            return len(text) // 4

        return counter.count_tokens(text)

    except Exception as e:
        logger.error(f"Error counting tokens: {e}")
        return len(text) // 4


def count_message_tokens(
    messages: list[dict[str, Any]],
    provider: str | None = None,
    model: str | None = None
) -> int:
    """Count tokens in a list of messages

    Args:
        messages: List of message dictionaries with 'role' and 'content'
        provider: LLM provider (defaults to "gemini")
        model: Model name (optional)

    Returns:
        Total number of tokens
    """
    try:
        if not messages:
            return 0

        provider = provider or "gemini"
        counter = _get_token_counter(provider, model)

        if not counter:
            logger.warning("Token counter not available, using character-based estimation")
            total_chars = sum(len(str(m.get("content", ""))) for m in messages)
            return total_chars // 4

        if model is None:
            model = settings.get_default_model(provider)

        return counter.count_message_tokens(messages, model)

    except Exception as e:
        logger.error(f"Error counting message tokens: {e}")
        total_chars = sum(len(str(m.get("content", ""))) for m in messages)
        return total_chars // 4


def estimate_output_tokens(input_tokens: int) -> int:
    """Estimate output tokens based on input tokens

    Args:
        input_tokens: Number of input tokens

    Returns:
        Estimated output tokens
    """
    counter = _get_token_counter("gemini")
    if counter and hasattr(counter, 'estimate_output_tokens'):
        return counter.estimate_output_tokens(input_tokens)

    # Fallback: estimate 20% of input tokens as output
    return int(input_tokens * 0.2)


def estimate_compression_needed(
    messages: list[dict[str, Any]],
    max_tokens: int = 4000,
    provider: str | None = None,
    model: str | None = None
) -> tuple[bool, int, float]:
    """Estimate if compression is needed for messages

    Args:
        messages: List of messages
        max_tokens: Maximum allowed tokens
        provider: LLM provider
        model: Model name

    Returns:
        Tuple of (needs_compression, current_tokens, usage_ratio)
    """
    current_tokens = count_message_tokens(messages, provider, model)
    usage_ratio = current_tokens / max_tokens if max_tokens > 0 else 0.0
    needs_compression = current_tokens > max_tokens

    logger.info(
        f"Token estimate: {current_tokens}/{max_tokens} "
        f"({usage_ratio:.1%}) - Compression needed: {needs_compression}"
    )

    return needs_compression, current_tokens, usage_ratio
