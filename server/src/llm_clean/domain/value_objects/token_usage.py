"""Token Usage Value Object

Immutable value object representing token usage information for conversations.
"""

from pydantic import BaseModel, Field, field_validator


class TokenUsageInfo(BaseModel):
    """Token usage information value object

    Represents token usage metrics for a conversation or request.
    This is an immutable value object.

    Attributes:
        current_tokens: Current conversation history token count
        max_tokens: Recommended maximum token limit
        usage_ratio: Usage ratio (0.0-1.0)
        needs_summary: Whether summarization is recommended
        input_tokens: Actual input tokens used (for billing)
        output_tokens: Actual output tokens used (for billing)
        total_tokens: Total tokens used (for billing)
    """

    current_tokens: int = Field(ge=0)
    max_tokens: int = Field(gt=0)
    usage_ratio: float = Field(ge=0.0, le=1.0)
    needs_summary: bool

    # Actual token usage from API (for billing)
    input_tokens: int | None = Field(None, ge=0)
    output_tokens: int | None = Field(None, ge=0)
    total_tokens: int | None = Field(None, ge=0)

    @field_validator("usage_ratio")
    @classmethod
    def validate_usage_ratio(cls, v: float, values) -> float:
        """Validate that usage ratio matches current/max tokens if possible"""
        # Note: In Pydantic v2, we can't access other field values during validation
        # This validation is kept for explicit ratio validation
        if v < 0.0 or v > 1.0:
            raise ValueError("usage_ratio must be between 0.0 and 1.0")
        return v

    @field_validator("total_tokens")
    @classmethod
    def validate_total_tokens(cls, v: int | None, info) -> int | None:
        """Validate that total_tokens equals input + output if all are present"""
        if v is not None:
            data = info.data
            input_t = data.get("input_tokens")
            output_t = data.get("output_tokens")

            if input_t is not None and output_t is not None:
                expected_total = input_t + output_t
                if v != expected_total:
                    raise ValueError(
                        f"total_tokens ({v}) must equal input_tokens ({input_t}) "
                        f"+ output_tokens ({output_t}) = {expected_total}"
                    )
        return v

    def is_over_threshold(self, threshold: float = 0.8) -> bool:
        """Check if usage is over a specific threshold

        Args:
            threshold: The threshold ratio (default 0.8 = 80%)

        Returns:
            True if usage_ratio >= threshold
        """
        return self.usage_ratio >= threshold

    def get_remaining_tokens(self) -> int:
        """Get the number of remaining tokens before hitting max

        Returns:
            Remaining tokens (max_tokens - current_tokens)
        """
        return max(0, self.max_tokens - self.current_tokens)

    def get_percentage_used(self) -> float:
        """Get usage as a percentage (0-100)

        Returns:
            Usage percentage
        """
        return self.usage_ratio * 100.0

    def has_billing_info(self) -> bool:
        """Check if billing information is available

        Returns:
            True if input/output/total tokens are available
        """
        return (
            self.input_tokens is not None
            and self.output_tokens is not None
            and self.total_tokens is not None
        )

    def __eq__(self, other: object) -> bool:
        """Value objects are equal if all their attributes are equal"""
        if not isinstance(other, TokenUsageInfo):
            return False

        return (
            self.current_tokens == other.current_tokens
            and self.max_tokens == other.max_tokens
            and abs(self.usage_ratio - other.usage_ratio) < 1e-9
            and self.needs_summary == other.needs_summary
            and self.input_tokens == other.input_tokens
            and self.output_tokens == other.output_tokens
            and self.total_tokens == other.total_tokens
        )

    def __hash__(self) -> int:
        """Make value object hashable"""
        return hash((
            self.current_tokens,
            self.max_tokens,
            self.usage_ratio,
            self.needs_summary,
            self.input_tokens,
            self.output_tokens,
            self.total_tokens
        ))

    class Config:
        """Pydantic configuration"""
        frozen = True  # Value objects are immutable
