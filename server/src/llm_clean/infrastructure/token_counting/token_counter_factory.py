"""Token Counter Factory

Factory for creating appropriate token counter implementations.
"""

from ...domain.interfaces.token_counter import ITokenCounter
from .gemini_token_counter import GeminiTokenCounter


class TokenCounterFactory:
    """Token Counter Factory

    Factory pattern for creating token counter instances based on provider.

    This is an infrastructure component that manages token counter creation.
    """

    def __init__(self):
        """Initialize factory with empty cache"""
        self._counters: dict[str, ITokenCounter] = {}

    def create_token_counter(
        self,
        provider: str,
        api_key: str,
        model: str | None = None
    ) -> ITokenCounter:
        """Create a token counter for a specific provider

        Args:
            provider: Provider name ("gemini", "openai", etc.)
            api_key: API key for the provider
            model: Optional model name

        Returns:
            ITokenCounter implementation for the provider

        Raises:
            ValueError: If provider is not supported
        """
        # Create cache key
        cache_key = f"{provider}:{model or 'default'}"

        # Return cached instance if available
        if cache_key in self._counters:
            return self._counters[cache_key]

        # Create new counter based on provider
        counter: ITokenCounter | None = None

        if provider.lower() == "gemini":
            default_model = model or "gemini-2.0-flash-exp"
            counter = GeminiTokenCounter(api_key, default_model)

        elif provider.lower() == "openai":
            # TODO: Implement OpenAI token counter
            raise NotImplementedError(
                "OpenAI token counter is not yet implemented. "
                "Use Gemini counter for now or implement OpenAITokenCounter."
            )

        else:
            raise ValueError(f"Unsupported provider: {provider}")

        # Cache the counter
        self._counters[cache_key] = counter
        return counter

    def get_cached_counter(
        self,
        provider: str,
        model: str | None = None
    ) -> ITokenCounter | None:
        """Get a cached token counter if available

        Args:
            provider: Provider name
            model: Optional model name

        Returns:
            Cached ITokenCounter or None
        """
        cache_key = f"{provider}:{model or 'default'}"
        return self._counters.get(cache_key)

    def clear_cache(self) -> None:
        """Clear all cached counters"""
        self._counters.clear()


# Global factory instance (singleton)
_global_factory: TokenCounterFactory | None = None


def get_token_counter_factory() -> TokenCounterFactory:
    """Get the global token counter factory instance

    Returns:
        TokenCounterFactory singleton
    """
    global _global_factory
    if _global_factory is None:
        _global_factory = TokenCounterFactory()
    return _global_factory
