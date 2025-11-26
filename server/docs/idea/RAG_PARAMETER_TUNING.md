# RAG Parameter Tuning - Frontend Exposure

## Overview

RAG検索の精度向上のため、一部パラメータをフロントエンドで調整可能にするアイデア。

## Parameter Classification

| Parameter | Current Value | Frontend Exposure | Reason |
|-----------|---------------|-------------------|--------|
| **top_k** | 4 | Recommended | User should control result count |
| **similarity_threshold** | 0.0 | Recommended | Intuitive noise filtering |
| **chunk_size** | 1000 | Not Recommended | Requires re-indexing, expert knowledge |
| **chunk_overlap** | 200 | Not Recommended | Same as above |
| **embedding model** | Gemini | Not Recommended | Core system design |

## Recommended Approach

### Search-time Parameters (User-adjustable)

```
├─ top_k (1-10)
├─ similarity_threshold (0.0-1.0)
└─ collection selection
```

### Index-time Parameters (Admin-only)

```
├─ chunk_size
└─ chunk_overlap
```

## Implementation Idea

### Frontend UI (Simple Presets)

```typescript
interface SearchOptions {
  precision: "strict" | "normal" | "loose";
  maxResults: number;  // 1-10
}
```

### Backend Mapping

```python
THRESHOLD_MAP = {
    "strict": 0.7,   # High similarity only
    "normal": 0.5,   # Moderate filtering
    "loose": 0.0     # No filtering
}

async def search_knowledge_base(
    query: str,
    precision: str = "normal",
    max_results: int = 5
) -> str:
    threshold = THRESHOLD_MAP.get(precision, 0.5)
    # ... search with threshold
```

## Trade-offs

### chunk_size

- Smaller chunks → Higher precision, less context
- Larger chunks → More context, lower precision
- Difficult for general users to judge

### similarity_threshold

- Higher threshold → Fewer but more relevant results
- Lower threshold → More results, potential noise
- Easy to understand with presets

## Cost Considerations

- Changing chunk settings requires re-vectorization
- API costs (Gemini Embedding) per document
- Time to reprocess large collections

## Benchmark Results (2024-11-26)

Using SQuAD v2.0 dataset:

| Query Type | Avg Score |
|------------|-----------|
| Related | 0.7599 |
| Unrelated | 0.6384 |
| **Difference** | **+0.1215** |

Suggested threshold presets based on benchmark:

- `strict`: 0.7 (filters out most unrelated)
- `normal`: 0.65 (balanced)
- `loose`: 0.0 (no filtering)

## Status

- [ ] Design frontend UI for search options
- [ ] Add precision parameter to search_knowledge_base tool
- [ ] Add API endpoint for search with options
- [ ] Consider admin panel for chunk settings

## References

- `server/src/llm_clean/utils/tools/search_knowledge_base.py` - Current implementation
- `server/src/llm_clean/infrastructure/vector_stores/pgvector_store.py` - Vector store
