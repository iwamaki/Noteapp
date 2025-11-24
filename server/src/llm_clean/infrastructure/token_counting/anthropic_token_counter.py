"""Anthropic Token Counter Implementation

Infrastructure implementation of token counting for Anthropic Claude models.
"""
from typing import Any

from langchain_anthropic import ChatAnthropic

from ...domain.interfaces.token_counter import ITokenCounter


class AnthropicTokenCounter(ITokenCounter):
    """Anthropic Token Counter implementation

    Uses LangChain's ChatAnthropic to count tokens for Claude models.

    This is an infrastructure adapter that implements the ITokenCounter interface.
    """

    # Model context length mappings
    MODEL_MAX_CONTEXT = {
        "claude-3-5-sonnet-20241022": 200000,
        "claude-3-5-haiku-20241022": 200000,
        "claude-3-opus-20240229": 200000,
        "claude-3-sonnet-20240229": 200000,
        "claude-3-haiku-20240307": 200000,
        "claude-sonnet-4-5-20250929": 200000,
        "claude-2.1": 200000,
        "claude-2.0": 100000,
        "claude-instant-1.2": 100000,
    }

    DEFAULT_MAX_CONTEXT = 200000

    def __init__(self, api_key: str, default_model: str = "claude-3-5-sonnet-20241022"):
        """Initialize Anthropic token counter

        Args:
            api_key: Anthropic API key
            default_model: Default model name for token counting
        """
        self._api_key = api_key
        self._default_model = default_model
        self._llm_cache: dict[str, ChatAnthropic] = {}

    def _get_llm(self, model: str) -> ChatAnthropic:
        """Get or create LLM client for a model

        Args:
            model: Model name

        Returns:
            ChatAnthropic client
        """
        if model not in self._llm_cache:
            self._llm_cache[model] = ChatAnthropic(
                api_key=self._api_key,
                model_name=model
            )
        return self._llm_cache[model]

    def count_tokens(self, text: str) -> int:
        """Count tokens in a text string

        Args:
            text: The text to count tokens for

        Returns:
            Number of tokens

        Raises:
            TokenCountError: If counting fails
        """
        try:
            llm = self._get_llm(self._default_model)
            return llm.get_num_tokens(text)
        except Exception:
            # Fallback: character-based estimation (4 chars per token)
            return len(text) // 4

    def count_message_tokens(
        self,
        messages: list[dict[str, Any]],
        model: str
    ) -> int:
        """Count tokens in a list of messages

        Args:
            messages: List of message dictionaries with 'role' and 'content'
            model: Model name (for provider-specific token counting)

        Returns:
            Total number of tokens

        Raises:
            TokenCountError: If counting fails
        """
        try:
            if not messages:
                return 0

            llm = self._get_llm(model)

            # Convert messages to combined text
            # Format: "role: content\nrole: content\n..."
            message_texts = []
            for message in messages:
                role = message.get("role", "")
                content = message.get("content", "")
                message_texts.append(f"{role}: {content}")

            combined_text = "\n".join(message_texts)

            # Count tokens
            return llm.get_num_tokens(combined_text)

        except Exception:
            # Fallback: character-based estimation (4 chars per token)
            total_chars = sum(len(str(m.get("content", ""))) for m in messages)
            return total_chars // 4

    def get_provider_name(self) -> str:
        """Get the provider name this counter is for

        Returns:
            Provider name ("anthropic")
        """
        return "anthropic"

    def get_max_context_length(self, model: str) -> int:
        """Get the maximum context length for a model

        Args:
            model: Model name

        Returns:
            Maximum context length in tokens
        """
        return self.MODEL_MAX_CONTEXT.get(model, self.DEFAULT_MAX_CONTEXT)

    def estimate_output_tokens(self, input_tokens: int) -> int:
        """Estimate output tokens based on input tokens

        This is a heuristic for billing estimation.
        For Anthropic, we estimate 20% of input tokens as output.

        Args:
            input_tokens: Number of input tokens

        Returns:
            Estimated output tokens
        """
        # Heuristic: estimate 20% of input tokens as output
        return int(input_tokens * 0.2)

    def supports_model(self, model: str) -> bool:
        """Check if this counter supports a specific model

        Args:
            model: Model name

        Returns:
            True if supported (all Claude models)
        """
        return model.startswith("claude")

    def estimate_compression_needed(
        self,
        messages: list[dict[str, Any]],
        max_tokens: int,
        model: str
    ) -> tuple[bool, int, float]:
        """Estimate if compression is needed for messages

        Args:
            messages: List of messages
            max_tokens: Maximum allowed tokens
            model: Model name

        Returns:
            Tuple of (needs_compression, current_tokens, usage_ratio)
        """
        current_tokens = self.count_message_tokens(messages, model)
        usage_ratio = current_tokens / max_tokens if max_tokens > 0 else 0.0
        needs_compression = current_tokens > max_tokens

        return needs_compression, current_tokens, usage_ratio
