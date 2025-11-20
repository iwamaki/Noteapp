"""Model Metadata Value Objects

Immutable value objects for model metadata, pricing, and cost information.
"""
from typing import Literal

from pydantic import BaseModel, Field


class CostInfo(BaseModel):
    """Cost information value object (in USD per 1M tokens)

    Represents the wholesale cost of using an LLM model.

    Attributes:
        input_price_per_1m: Input token price per 1 million tokens (USD)
        output_price_per_1m: Output token price per 1 million tokens (USD)
    """

    input_price_per_1m: float = Field(ge=0.0, alias="inputPricePer1M")
    output_price_per_1m: float = Field(ge=0.0, alias="outputPricePer1M")

    def calculate_input_cost(self, tokens: int) -> float:
        """Calculate input cost for a given number of tokens

        Args:
            tokens: Number of input tokens

        Returns:
            Cost in USD
        """
        return (tokens / 1_000_000) * self.input_price_per_1m

    def calculate_output_cost(self, tokens: int) -> float:
        """Calculate output cost for a given number of tokens

        Args:
            tokens: Number of output tokens

        Returns:
            Cost in USD
        """
        return (tokens / 1_000_000) * self.output_price_per_1m

    def calculate_total_cost(self, input_tokens: int, output_tokens: int) -> float:
        """Calculate total cost for input and output tokens

        Args:
            input_tokens: Number of input tokens
            output_tokens: Number of output tokens

        Returns:
            Total cost in USD
        """
        return self.calculate_input_cost(input_tokens) + self.calculate_output_cost(output_tokens)

    def __eq__(self, other: object) -> bool:
        """Value objects are equal if all their attributes are equal"""
        if not isinstance(other, CostInfo):
            return False
        return (
            abs(self.input_price_per_1m - other.input_price_per_1m) < 1e-9
            and abs(self.output_price_per_1m - other.output_price_per_1m) < 1e-9
        )

    def __hash__(self) -> int:
        """Make value object hashable"""
        return hash((self.input_price_per_1m, self.output_price_per_1m))

    class Config:
        """Pydantic configuration"""
        frozen = True
        populate_by_name = True


class PricingInfo(BaseModel):
    """Pricing information value object

    Represents both wholesale cost and retail pricing for an LLM model.

    Attributes:
        cost: Wholesale cost information (USD)
        selling_price_jpy: Retail selling price per 1M tokens (JPY)
    """

    cost: CostInfo
    selling_price_jpy: float = Field(ge=0.0, alias="sellingPriceJPY")

    def calculate_margin(self, exchange_rate: float = 150.0) -> float:
        """Calculate profit margin percentage

        Args:
            exchange_rate: USD to JPY exchange rate (default: 150)

        Returns:
            Margin as a percentage
        """
        # Average cost in USD per 1M tokens
        avg_cost_usd = (self.cost.input_price_per_1m + self.cost.output_price_per_1m) / 2
        avg_cost_jpy = avg_cost_usd * exchange_rate

        if avg_cost_jpy == 0:
            return 0.0

        margin = ((self.selling_price_jpy - avg_cost_jpy) / avg_cost_jpy) * 100
        return margin

    def __eq__(self, other: object) -> bool:
        """Value objects are equal if all their attributes are equal"""
        if not isinstance(other, PricingInfo):
            return False
        return (
            self.cost == other.cost
            and abs(self.selling_price_jpy - other.selling_price_jpy) < 1e-9
        )

    def __hash__(self) -> int:
        """Make value object hashable"""
        return hash((self.cost, self.selling_price_jpy))

    class Config:
        """Pydantic configuration"""
        frozen = True
        populate_by_name = True


class ModelMetadata(BaseModel):
    """Model metadata value object

    Represents metadata about an LLM model including category,
    display information, and pricing.

    Attributes:
        category: Model category ("quick" or "think")
        display_name: Human-readable display name
        description: Model description
        recommended: Whether this model is recommended
        pricing: Pricing information
    """

    category: Literal["quick", "think"]
    display_name: str | None = Field(None, alias="displayName")
    description: str | None = None
    recommended: bool = False
    pricing: PricingInfo | None = None

    def is_quick_model(self) -> bool:
        """Check if this is a quick/fast model

        Returns:
            True if category is "quick"
        """
        return self.category == "quick"

    def is_think_model(self) -> bool:
        """Check if this is a thinking/reasoning model

        Returns:
            True if category is "think"
        """
        return self.category == "think"

    def has_pricing(self) -> bool:
        """Check if pricing information is available

        Returns:
            True if pricing is defined
        """
        return self.pricing is not None

    def __eq__(self, other: object) -> bool:
        """Value objects are equal if all their attributes are equal"""
        if not isinstance(other, ModelMetadata):
            return False
        return (
            self.category == other.category
            and self.display_name == other.display_name
            and self.description == other.description
            and self.recommended == other.recommended
            and self.pricing == other.pricing
        )

    def __hash__(self) -> int:
        """Make value object hashable"""
        return hash((
            self.category,
            self.display_name,
            self.description,
            self.recommended,
            self.pricing
        ))

    class Config:
        """Pydantic configuration"""
        frozen = True
        populate_by_name = True
