"""Gemini Token Counter Implementation

Infrastructure implementation of token counting for Google Gemini models.
"""
from typing import Any

from langchain_google_genai import ChatGoogleGenerativeAI

from ...domain.interfaces.token_counter import ITokenCounter


class GeminiTokenCounter(ITokenCounter):
    """Gemini Token Counter implementation

    Uses LangChain's ChatGoogleGenerativeAI to count tokens for Gemini models.

    This is an infrastructure adapter that implements the ITokenCounter interface.
    """

    # Model context length mappings
    MODEL_MAX_CONTEXT = {
        "gemini-2.0-flash-exp": 1048576,  # 1M tokens
        "gemini-1.5-flash": 1048576,
        "gemini-1.5-flash-8b": 1048576,
        "gemini-1.5-pro": 2097152,  # 2M tokens
        "gemini-pro": 32768,
        "gemini-pro-vision": 16384,
    }

    DEFAULT_MAX_CONTEXT = 32768

    def __init__(self, api_key: str, default_model: str = "gemini-2.0-flash-exp"):
        """Initialize Gemini token counter

        Args:
            api_key: Google API key
            default_model: Default model name for token counting
        """
        self._api_key = api_key
        self._default_model = default_model
        self._llm_cache: dict[str, ChatGoogleGenerativeAI] = {}

    def _get_llm(self, model: str) -> ChatGoogleGenerativeAI:
        """Get or create LLM client for a model

        Args:
            model: Model name

        Returns:
            ChatGoogleGenerativeAI client
        """
        if model not in self._llm_cache:
            self._llm_cache[model] = ChatGoogleGenerativeAI(
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
            Provider name ("gemini")
        """
        return "gemini"

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
        For Gemini, we estimate 20% of input tokens as output.

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
            True if supported (all Gemini models)
        """
        return model.startswith("gemini")

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
