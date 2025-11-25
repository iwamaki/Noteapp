"""Get Provider Info Use Case

This use case retrieves information about available LLM providers
and their models.
"""

from src.core.logger import logger

from ..dtos import LLMProviderDTO
from ..ports.output import LLMProviderPort


class GetProviderInfoUseCase:
    """Get provider information use case

    This use case retrieves information about LLM providers,
    including available models, metadata, and pricing.
    """

    def __init__(self, provider_registry: dict[str, LLMProviderPort]):
        """Initialize use case

        Args:
            provider_registry: Dictionary of provider name -> provider port
        """
        self.provider_registry = provider_registry

    async def execute(self) -> list[LLMProviderDTO]:
        """Execute get provider info use case

        Returns:
            List of LLMProviderDTO with provider and model information
        """
        logger.info("Retrieving provider information", extra={"category": "llm"})

        provider_dtos: list[LLMProviderDTO] = []

        for provider_name, provider_port in self.provider_registry.items():
            try:
                # Get provider availability
                is_available = provider_port.is_available()
                status = "available" if is_available else "unavailable"

                # Get available models
                models = provider_port.get_available_models()

                # Get provider name
                name = provider_port.get_provider_name()

                # Default model (first model in list)
                default_model = models[0] if models else ""

                # TODO: Get model metadata from provider
                # For now, return basic info
                provider_dto = LLMProviderDTO(
                    name=name,
                    defaultModel=default_model,
                    models=models,
                    status=status,
                    modelMetadata=None  # TODO: Implement metadata retrieval
                )

                provider_dtos.append(provider_dto)

                logger.info(
                    f"Added provider: {name}, models={len(models)}, status={status}",
                    extra={"category": "llm"}
                )

            except Exception as e:
                logger.error(
                    f"Error getting provider info for {provider_name}: {str(e)}",
                    extra={"category": "llm"}
                )

        logger.info(
            f"Retrieved {len(provider_dtos)} providers",
            extra={"category": "llm"}
        )

        return provider_dtos
