# RAG PostgreSQL (pgvector) 移行仕様

## 概要

RAG（Retrieval-Augmented Generation）機能のベクトルストアを、現行のFAISSローカルファイルからPostgreSQL (Supabase) + pgvectorに移行する。

## 背景・課題

### 現状
- ベクトルストア: FAISSを使用し、ローカルファイルシステムに保存
- 保存先: `server/src/data/vector_stores/{collection_name}/`
- 識別子: コレクション名のみ（ユーザー識別なし）

### 課題
- **マルチテナント非対応**: ユーザーごとのデータ分離がない
- **データ分散**: ユーザー情報はPostgreSQL、ベクトルはローカルファイルで分散
- **スケーラビリティ**: サーバーレス環境（Cloud Run等）でファイルシステム依存は問題

## 設計方針

### データ種別

| 種別 | 説明 | user_id | TTL |
|------|------|---------|-----|
| **temp** | Web検索結果などの一時データ | NULL（不要） | 1時間 |
| **persistent** | ユーザー固有の知識ベース | 必須 | なし |

### 識別子設計

#### 一時データ（Web検索）
- 識別子: タイムスタンプベースのユニークID（例: `web_1732000000`）
- ユーザー紐付け: 不要（NULL許可）
- アクセス制御: コレクション名を知っているLLMセッションのみ
- 削除: TTL経過後に自動削除

#### 永続データ（ユーザー知識ベース）
- 識別子: `user_id` + `collection_name`
- ユーザー紐付け: 必須（FK制約）
- アクセス制御: `WHERE user_id = :current_user`
- 削除: ユーザー削除時にCASCADE、または明示削除

## テーブル設計

### DDL

```sql
-- pgvector拡張を有効化（Supabaseダッシュボードで実行）
CREATE EXTENSION IF NOT EXISTS vector;

-- ベクトルドキュメントテーブル
CREATE TABLE vector_documents (
    id SERIAL PRIMARY KEY,

    -- 識別子
    user_id VARCHAR REFERENCES users(user_id) ON DELETE CASCADE,  -- NULL = 一時データ
    collection_name VARCHAR NOT NULL,

    -- データ種別
    collection_type VARCHAR NOT NULL DEFAULT 'temp',  -- 'temp' | 'persistent'

    -- コンテンツ
    content TEXT NOT NULL,
    embedding vector(768) NOT NULL,  -- Gemini embedding-001 (768次元)
    metadata JSONB DEFAULT '{}',

    -- タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,  -- NULL = 永続

    -- 制約
    CONSTRAINT chk_collection_type CHECK (
        collection_type IN ('temp', 'persistent')
    ),
    CONSTRAINT chk_persistent_requires_user CHECK (
        collection_type = 'temp' OR user_id IS NOT NULL
    )
);

-- インデックス
CREATE INDEX idx_vector_docs_user_collection
    ON vector_documents (user_id, collection_name);

CREATE INDEX idx_vector_docs_expires
    ON vector_documents (expires_at)
    WHERE expires_at IS NOT NULL;

-- ベクトル検索用（HNSW - 高速近似最近傍探索）
CREATE INDEX idx_vector_docs_embedding
    ON vector_documents
    USING hnsw (embedding vector_cosine_ops);
```

### カラム説明

| カラム | 型 | 説明 |
|--------|------|------|
| id | SERIAL | 主キー |
| user_id | VARCHAR | ユーザーID（一時データはNULL許可） |
| collection_name | VARCHAR | コレクション名 |
| collection_type | VARCHAR | 'temp' または 'persistent' |
| content | TEXT | ドキュメント本文 |
| embedding | vector(768) | ベクトル埋め込み |
| metadata | JSONB | メタデータ（URL、タイトル等） |
| created_at | TIMESTAMP | 作成日時 |
| expires_at | TIMESTAMP | 有効期限（NULLは永続） |

## データフロー

### 一時データ（Web検索）

```
1. LLMがweb_search_with_ragツールを呼び出し
2. Google Custom Search APIで検索実行
3. ページ内容を取得・チャンク化
4. PostgreSQLにINSERT（user_id=NULL, expires_at=1h後）
5. コレクション名をLLMに返却
6. LLMがsearch_knowledge_baseで検索
7. TTL経過後に自動削除
```

### 永続データ（ユーザー知識ベース）

```
1. ユーザーがドキュメントをアップロード（将来のフロントエンド実装）
2. ドキュメントをチャンク化
3. PostgreSQLにINSERT（user_id=認証ユーザー, expires_at=NULL）
4. チャットでsearch_knowledge_baseを呼び出し
5. WHERE user_id = :current_user でフィルタして検索
```

## 実装タスク

### Phase 1: インフラ準備
- [ ] Supabaseでpgvector拡張を有効化
- [ ] Alembicマイグレーション作成
- [ ] SQLAlchemyモデル作成（pgvector-python使用）

### Phase 2: 基盤実装
- [ ] VectorStorePort実装（PostgreSQL版）
- [ ] CollectionManager実装（PostgreSQL版）
- [ ] DocumentProcessor修正（必要に応じて）

### Phase 3: ユースケース修正
- [ ] web_search_with_rag修正
- [ ] search_knowledge_base修正
- [ ] TTLクリーンアップ処理（pg_cronまたはアプリ側）

### Phase 4: テスト・移行
- [ ] 単体テスト
- [ ] 統合テスト
- [ ] 既存FAISSデータの移行（必要に応じて）

## 考慮事項

### パフォーマンス
- FAISSはインメモリで高速、pgvectorはDB経由で若干遅い
- チャット用途では許容範囲（数百ms程度）
- 大量データ時はHNSWインデックスが必須

### ストレージコスト
- 768次元 × 4バイト = 約3KB/レコード
- メタデータ・コンテンツを含めると数KB〜数十KB/チャンク

### セキュリティ
- 永続データは必ずuser_idでフィルタ
- 一時データはコレクション名の推測が困難（タイムスタンプベース）
- APIエンドポイントでの認証チェック必須

## 関連ファイル

### 現行実装
- `server/src/llm_clean/infrastructure/vector_stores/faiss_vector_store.py`
- `server/src/llm_clean/infrastructure/vector_stores/collection_manager.py`
- `server/src/llm_clean/infrastructure/document_processing/document_processor.py`
- `server/src/llm_clean/utils/tools/web_search_with_rag.py`
- `server/src/llm_clean/application/use_cases/search_knowledge_base_use_case.py`

### 参照
- `server/src/data/models/user.py` - ユーザーモデル
- `server/src/data/database.py` - DB接続設定
