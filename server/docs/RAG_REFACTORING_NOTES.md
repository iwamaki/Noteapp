# RAG ツール リファクタリングメモ

## 課題

### 1. user_id 決定ロジックの重複
- `knowledge_base_router.py`: `_determine_collection_params()`
- `search_knowledge_base.py`: インライン (56-59行目)
- `web_search_with_rag.py`: `user_id=None` 固定

### 2. パラメータの柔軟性不足
- `search_knowledge_base`: similarity_threshold がない
- `web_search_with_rag`: chunk_size/overlap が固定
- ローカル知識はデータ種類で最適パラメータが異なる

### 3. 認証コンテキストの欠如
- `DEFAULT_USER_ID = "default_user"` がハードコード

## 改善案

### RAGContext クラス導入
```python
@dataclass
class RAGContext:
    user_id: str | None
    collection_type: Literal["temp", "persistent"]

    @classmethod
    def from_collection_name(cls, name: str, auth_user_id: str | None = None):
        if name.startswith("web_") or name.startswith("temp_"):
            return cls(user_id=None, collection_type="temp")
        return cls(user_id=auth_user_id or "default_user", collection_type="persistent")
```

### search_knowledge_base パラメータ拡張
```python
async def search_knowledge_base(
    query: str,
    max_results: int = 4,
    collection_name: str = "default",
    similarity_threshold: float = 0.0,  # 新規
) -> str:
```

## 優先順位
1. RAGContext 導入（重複解消）
2. similarity_threshold 追加（検索精度）
3. chunk設定カスタマイズ（将来）

---
作成日: 2025-11-26
