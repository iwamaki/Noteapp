"""OpenAI Token Counter Implementation

Infrastructure implementation of token counting for OpenAI models.
"""
from typing import Any

from langchain_openai import ChatOpenAI

from ...domain.interfaces.token_counter import ITokenCounter


class OpenAITokenCounter(ITokenCounter):
    """OpenAI Token Counter implementation

    Uses LangChain's ChatOpenAI to count tokens for OpenAI models.

    This is an infrastructure adapter that implements the ITokenCounter interface.
    """

    # Model context length mappings
    MODEL_MAX_CONTEXT = {
        "gpt-4o": 128000,
        "gpt-4o-mini": 128000,
        "gpt-4-turbo": 128000,
        "gpt-4-turbo-preview": 128000,
        "gpt-4": 8192,
        "gpt-4-32k": 32768,
        "gpt-3.5-turbo": 16385,
        "gpt-3.5-turbo-16k": 16385,
        "o1-preview": 128000,
        "o1-mini": 128000,
    }

    DEFAULT_MAX_CONTEXT = 8192

    def __init__(self, api_key: str, default_model: str = "gpt-4o-mini"):
        """Initialize OpenAI token counter

        Args:
            api_key: OpenAI API key
            default_model: Default model name for token counting
        """
        self._api_key = api_key
        self._default_model = default_model
        self._llm_cache: dict[str, ChatOpenAI] = {}

    def _get_llm(self, model: str) -> ChatOpenAI:
        """Get or create LLM client for a model

        Args:
            model: Model name

        Returns:
            ChatOpenAI client
        """
        if model not in self._llm_cache:
            self._llm_cache[model] = ChatOpenAI(
                api_key=self._api_key,
                model=model
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
            Provider name ("openai")
        """
        return "openai"

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
        For OpenAI, we estimate 20% of input tokens as output.

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
            True if supported (all OpenAI models)
        """
        return model.startswith("gpt") or model.startswith("o1")

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
