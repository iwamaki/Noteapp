"""Search Knowledge Base Use Case

This use case handles searching the knowledge base (RAG):
1. Collection existence validation
2. Vector store search
3. Result formatting
"""

from src.core.logger import logger

from ..dtos import SearchRequestDTO, SearchResponseDTO, SearchResultDTO
from ..ports.output import VectorStorePort


class SearchKnowledgeBaseUseCase:
    """Search knowledge base use case

    This use case performs semantic search on document collections
    using vector store.
    """

    def __init__(self, vector_store_port: VectorStorePort):
        """Initialize use case

        Args:
            vector_store_port: Vector store port
        """
        self.vector_store = vector_store_port

    async def execute(
        self,
        request: SearchRequestDTO,
        user_id: str
    ) -> SearchResponseDTO:
        """Execute knowledge base search use case

        Args:
            request: Search request DTO
            user_id: Authenticated user ID

        Returns:
            SearchResponseDTO with search results

        Raises:
            ValueError: If collection doesn't exist
        """
        logger.info(
            f"[SearchKnowledgeBaseUseCase] Searching: "
            f"collection={request.collection_name}, query={request.query[:50]}, "
            f"top_k={request.top_k}"
        )

        # Step 1: Check if collection exists
        exists = await self.vector_store.collection_exists(request.collection_name)
        if not exists:
            logger.error(
                f"[SearchKnowledgeBaseUseCase] Collection not found: "
                f"{request.collection_name}"
            )
            raise ValueError(f"コレクション '{request.collection_name}' が見つかりません")

        # Step 2: Perform search
        try:
            raw_results = await self.vector_store.search(
                collection_name=request.collection_name,
                query=request.query,
                top_k=request.top_k
            )

            logger.info(
                f"[SearchKnowledgeBaseUseCase] Found {len(raw_results)} results"
            )

        except Exception as e:
            logger.error(
                f"[SearchKnowledgeBaseUseCase] Search failed: {str(e)}"
            )
            raise

        # Step 3: Convert to DTOs
        result_dtos: list[SearchResultDTO] = []
        for result in raw_results:
            result_dto = SearchResultDTO(
                content=result.get("content", ""),
                metadata=result.get("metadata", {}),
                score=result.get("score")
            )
            result_dtos.append(result_dto)

        # Step 4: Construct response
        response = SearchResponseDTO(
            results=result_dtos,
            collection_name=request.collection_name,
            query=request.query
        )

        logger.info(
            "[SearchKnowledgeBaseUseCase] Search completed successfully"
        )

        return response
