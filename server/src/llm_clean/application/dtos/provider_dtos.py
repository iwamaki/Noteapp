"""Provider DTOs (Data Transfer Objects)

This module defines DTOs for LLM provider information.
"""

from pydantic import BaseModel


class CostInfoDTO(BaseModel):
    """Cost information DTO (USD per 1M tokens)"""
    inputPricePer1M: float
    outputPricePer1M: float


class PricingInfoDTO(BaseModel):
    """Pricing information DTO"""
    cost: CostInfoDTO  # Cost (USD)
    sellingPriceJPY: float  # Selling price (JPY per 1M tokens)


class ModelMetadataDTO(BaseModel):
    """Model metadata DTO

    Contains additional information about a model:
    category, display name, description, pricing, etc.
    """
    category: str  # "quick" or "think"
    displayName: str | None = None
    description: str | None = None
    recommended: bool | None = False
    pricing: PricingInfoDTO | None = None


class LLMProviderDTO(BaseModel):
    """LLM provider DTO

    Represents an LLM provider with its available models and metadata.
    """
    name: str
    defaultModel: str
    models: list[str]
    status: str
    modelMetadata: dict[str, ModelMetadataDTO] | None = None


# Mapper functions

def model_metadata_domain_to_dto(domain_metadata) -> ModelMetadataDTO:
    """Convert Domain ModelMetadata to DTO

    Args:
        domain_metadata: Domain ModelMetadata

    Returns:
        ModelMetadataDTO
    """
    pricing_dto = None
    if domain_metadata.pricing:
        pricing_dto = PricingInfoDTO(
            cost=CostInfoDTO(
                inputPricePer1M=domain_metadata.pricing.cost.input_price_per_1m,
                outputPricePer1M=domain_metadata.pricing.cost.output_price_per_1m
            ),
            sellingPriceJPY=domain_metadata.pricing.selling_price_jpy
        )

    return ModelMetadataDTO(
        category=domain_metadata.category,
        displayName=domain_metadata.display_name,
        description=domain_metadata.description,
        recommended=domain_metadata.recommended,
        pricing=pricing_dto
    )
