# LLM Module - Clean Architecture Migration Plan

**作成日**: 2025-11-20
**対象モジュール**: `server/src/llm`
**目標**: 既存のLLMモジュールをClean Architectureに準拠した構造に移行する

---

## 📊 目次

1. [現状分析](#現状分析)
2. [Phase 1: Domain Layer Migration](#phase-1-domain-layer-migration)
3. [Phase 2: Application Layer Migration](#phase-2-application-layer-migration)
4. [Phase 3: Infrastructure & Integration Migration](#phase-3-infrastructure--integration-migration)
5. [最終的なディレクトリ構造](#最終的なディレクトリ構造)
6. [移行戦略とリスク管理](#移行戦略とリスク管理)
7. [テスト戦略](#テスト戦略)

---

## 📊 現状分析

### 現在のディレクトリ構造

```
llm/
├── models.py                    # Pydantic models (DTOs + Domain models混在)
├── providers/                   # LLM provider実装
│   ├── base.py                 # Abstract base classes ⭐️
│   ├── gemini.py               # Gemini provider
│   ├── openai.py               # OpenAI provider
│   ├── config.py               # Configuration
│   ├── factory.py              # Factory pattern ⭐️
│   ├── registry.py             # Provider registry ⭐️
│   ├── context_builder.py      # Context builder
│   └── command_extractor.py    # Command extraction
├── routers/                     # FastAPI endpoints
│   ├── chat_router.py          # Chat API（⚠️ ビジネスロジック含む）
│   ├── llm_providers_router.py
│   ├── tools_router.py
│   ├── knowledge_base_router.py
│   ├── schemas.py
│   └── error_handlers.py
├── services/                    # Business logic
│   ├── chat_service.py
│   └── summarization_service.py
├── tools/                       # LangChain tools
│   ├── __init__.py
│   ├── context_manager.py      # ⚠️ Global state (anti-pattern)
│   ├── create_file.py
│   ├── read_file.py            # ⚠️ WebSocket直接依存
│   ├── edit_file.py
│   ├── delete_file.py
│   └── [other tools...]
├── rag/                         # RAG機能
│   ├── vector_store.py         # ⭐️ 良い設計
│   ├── collection_manager.py   # ⭐️ 良い設計
│   ├── document_processor.py
│   ├── instances.py
│   └── cleanup_job.py
└── utils/
    └── token_counter.py        # ⚠️ Gemini専用（抽象化必要）
```

### 主な問題点

| 問題 | 影響 | 優先度 |
|------|------|--------|
| **models.pyの混在** | DTOとDomain modelが同じファイル | 🔴 高 |
| **Global State** | `context_manager.py`がグローバル変数使用 | 🔴 高 |
| **Infrastructure漏洩** | `read_file.py`がWebSocket直接参照 | 🟡 中 |
| **Router内のビジネスロジック** | トークン検証が`chat_router.py`に存在 | 🟡 中 |
| **Provider特化Util** | `token_counter.py`がGemini専用 | 🟢 低 |

### 強み ⭐️

- **Provider抽象化**: Factory + Registry patternで実装済み
- **RAGモジュール**: 責務が明確に分離されている
- **エラーハンドリング**: Decorator patternで一元化
- **設定管理**: `config.py`とRegistry SSoT

---

## Phase 1: Domain Layer Migration

**期間**: 1-2週間
**目標**: 純粋なドメインロジックを抽出し、明確なインターフェースを確立

### 📁 作成するディレクトリ構造

```
server/src/llm_clean/
├── domain/
│   ├── __init__.py
│   ├── entities/
│   │   ├── __init__.py
│   │   ├── chat_message.py          # ChatMessage entity
│   │   ├── conversation.py          # Conversation aggregate
│   │   └── llm_command.py           # LLMCommand entity
│   ├── value_objects/
│   │   ├── __init__.py
│   │   ├── token_usage.py           # TokenUsageInfo
│   │   ├── model_metadata.py        # ModelMetadata, PricingInfo
│   │   └── chat_context.py          # ChatContext value object
│   ├── interfaces/
│   │   ├── __init__.py
│   │   ├── llm_provider.py          # ILLMProvider interface
│   │   ├── vector_store.py          # IVectorStore interface
│   │   ├── document_processor.py    # IDocumentProcessor interface
│   │   ├── token_counter.py         # ITokenCounter interface
│   │   └── context_service.py       # IContextService interface
│   └── services/
│       ├── __init__.py
│       ├── command_extractor_service.py  # Command extraction domain service
│       └── context_service.py       # Context management service
└── infrastructure/
    └── token_counting/
        ├── __init__.py
        ├── gemini_token_counter.py  # Gemini implementation
        └── token_counter_factory.py # Factory for token counters
```

### ✅ Phase 1 チェックリスト

#### Step 1.1: Domain Entities抽出

- [ ] **1.1.1** `llm_clean/domain/entities/`ディレクトリ作成
- [ ] **1.1.2** `models.py`から`ChatMessage`を抽出 → `chat_message.py`
  - [ ] `ChatMessage`クラス定義
  - [ ] Validation logic追加
  - [ ] Unit test作成
- [ ] **1.1.3** `Conversation` aggregateを作成 → `conversation.py`
  - [ ] メッセージリスト管理
  - [ ] Conversation metadata
  - [ ] Unit test作成
- [ ] **1.1.4** `models.py`から`LLMCommand`を抽出 → `llm_command.py`
  - [ ] `LLMCommand`クラス定義
  - [ ] Unit test作成
- [ ] **1.1.5** 既存コードとの互換性確認

#### Step 1.2: Value Objects抽出

- [ ] **1.2.1** `llm_clean/domain/value_objects/`ディレクトリ作成
- [ ] **1.2.2** `TokenUsageInfo`を抽出 → `token_usage.py`
  - [ ] Immutabilityを保証
  - [ ] Equality比較実装
  - [ ] Unit test作成
- [ ] **1.2.3** `ModelMetadata`, `PricingInfo`を抽出 → `model_metadata.py`
  - [ ] Value objectパターン適用
  - [ ] Unit test作成
- [ ] **1.2.4** `ChatContext`を抽出 → `chat_context.py`
  - [ ] Value objectパターン適用
  - [ ] Unit test作成

#### Step 1.3: Interfaces定義

- [ ] **1.3.1** `llm_clean/domain/interfaces/`ディレクトリ作成
- [ ] **1.3.2** `ILLMProvider`インターフェース作成 → `llm_provider.py`
  - [ ] `providers/base.py`から抽象メソッド抽出
  - [ ] Type hints完備
  - [ ] Docstring追加
- [ ] **1.3.3** `IVectorStore`インターフェース作成 → `vector_store.py`
  - [ ] RAGに必要なメソッド定義
  - [ ] Type hints完備
- [ ] **1.3.4** `IDocumentProcessor`インターフェース作成 → `document_processor.py`
  - [ ] Document処理メソッド定義
- [ ] **1.3.5** `ITokenCounter`インターフェース作成 → `token_counter.py`
  - [ ] Provider非依存のインターフェース定義
- [ ] **1.3.6** `IContextService`インターフェース作成 → `context_service.py`
  - [ ] Global stateの代替インターフェース定義

#### Step 1.4: Context Manager Refactoring

- [ ] **1.4.1** `ContextService`クラス作成 → `domain/services/context_service.py`
  - [ ] Global変数をクラス変数に変換
  - [ ] Thread-safeな実装（Lock使用）
  - [ ] `IContextService`インターフェース実装
- [ ] **1.4.2** `context_manager.py`の使用箇所を特定
  - [ ] `tools/`内の全ファイルをチェック
  - [ ] 依存関係をリスト化
- [ ] **1.4.3** 段階的移行計画作成
  - [ ] Adapter pattern使用（一時的な互換レイヤー）
  - [ ] 移行スケジュール作成
- [ ] **1.4.4** Unit test作成（ContextService）
- [ ] **1.4.5** Integration test作成

#### Step 1.5: Token Counter抽象化

- [ ] **1.5.1** `llm_clean/infrastructure/token_counting/`ディレクトリ作成
- [ ] **1.5.2** `GeminiTokenCounter`実装 → `gemini_token_counter.py`
  - [ ] `utils/token_counter.py`の既存ロジックを移行
  - [ ] `ITokenCounter`インターフェース実装
  - [ ] Unit test作成
- [ ] **1.5.3** `TokenCounterFactory`作成 → `token_counter_factory.py`
  - [ ] Provider名からインスタンス生成
  - [ ] Factory method pattern適用
- [ ] **1.5.4** 既存の`utils/token_counter.py`使用箇所を特定
- [ ] **1.5.5** 段階的移行（Adapter pattern使用）

#### Step 1.6: Command Extractor Domain Service

- [ ] **1.6.1** `CommandExtractorService`作成 → `domain/services/command_extractor_service.py`
  - [ ] `providers/command_extractor.py`からロジック移行
  - [ ] Domain serviceパターン適用
  - [ ] Unit test作成
- [ ] **1.6.2** 既存コードとの統合テスト

#### Step 1.7: Phase 1 統合テスト

- [ ] **1.7.1** 全Unit testがパス
- [ ] **1.7.2** 既存の`llm/`モジュールとの互換性確認
- [ ] **1.7.3** Integration test実行
- [ ] **1.7.4** Performance test（劣化がないこと確認）
- [ ] **1.7.5** Code review実施

#### Step 1.8: ドキュメント作成

- [ ] **1.8.1** Domain層のREADME作成
- [ ] **1.8.2** Interface仕様書作成
- [ ] **1.8.3** Entity/Value Object設計ドキュメント

---

## Phase 2: Application Layer Migration

**期間**: 1-2週間
**目標**: Use Casesを抽出し、DTOsをDomainから分離

### 📁 作成するディレクトリ構造

```
server/src/llm_clean/application/
├── __init__.py
├── use_cases/
│   ├── __init__.py
│   ├── process_chat_use_case.py         # Main chat processing
│   ├── summarize_conversation_use_case.py  # Summarization
│   ├── search_knowledge_base_use_case.py   # RAG search
│   ├── upload_document_use_case.py      # Document upload
│   ├── manage_collection_use_case.py    # Collection management
│   └── get_provider_info_use_case.py    # Provider info retrieval
├── dtos/
│   ├── __init__.py
│   ├── chat_dtos.py                     # ChatRequestDTO, ChatResponseDTO
│   ├── summarization_dtos.py            # SummarizeRequestDTO, etc.
│   ├── provider_dtos.py                 # LLMProviderDTO
│   └── rag_dtos.py                      # RAG-related DTOs
├── services/
│   ├── __init__.py
│   └── chat_orchestrator.py             # Complex workflow orchestration
└── ports/
    ├── __init__.py
    ├── input/
    │   └── __init__.py
    └── output/
        ├── __init__.py
        ├── llm_provider_port.py         # Output port for LLM providers
        ├── vector_store_port.py         # Output port for vector stores
        └── billing_port.py              # Output port for billing
```

### ✅ Phase 2 チェックリスト

#### Step 2.1: DTOs抽出

- [ ] **2.1.1** `llm_clean/application/dtos/`ディレクトリ作成
- [ ] **2.1.2** Chat関連DTOs作成 → `chat_dtos.py`
  - [ ] `models.py`から`ChatRequest`を移行
  - [ ] `ChatRequestDTO`にリネーム
  - [ ] `ChatResponseDTO`作成
  - [ ] Validation追加
  - [ ] Unit test作成
- [ ] **2.1.3** Summarization DTOs作成 → `summarization_dtos.py`
  - [ ] `SummarizeRequestDTO`
  - [ ] `SummarizeResponseDTO`
  - [ ] Unit test作成
- [ ] **2.1.4** Provider DTOs作成 → `provider_dtos.py`
  - [ ] `LLMProviderDTO`
  - [ ] `ModelInfoDTO`
  - [ ] Unit test作成
- [ ] **2.1.5** RAG DTOs作成 → `rag_dtos.py`
  - [ ] `UploadDocumentRequestDTO`
  - [ ] `SearchRequestDTO`
  - [ ] `SearchResponseDTO`
  - [ ] Unit test作成
- [ ] **2.1.6** DTOとEntity間のマッピング関数作成
  - [ ] `dto_to_entity()`
  - [ ] `entity_to_dto()`
  - [ ] Unit test作成

#### Step 2.2: Output Ports定義

- [ ] **2.2.1** `application/ports/output/`ディレクトリ作成
- [ ] **2.2.2** `LLMProviderPort`インターフェース作成
  - [ ] Domain interfaceをApplication層で再定義
  - [ ] Use caseに必要なメソッドのみ公開
- [ ] **2.2.3** `VectorStorePort`インターフェース作成
- [ ] **2.2.4** `BillingPort`インターフェース作成
  - [ ] Token検証メソッド
  - [ ] Token消費記録メソッド
- [ ] **2.2.5** `DocumentProcessorPort`インターフェース作成

#### Step 2.3: Use Cases作成

- [ ] **2.3.1** `application/use_cases/`ディレクトリ作成
- [ ] **2.3.2** `ProcessChatUseCase`作成 → `process_chat_use_case.py`
  - [ ] `chat_service.py`と`chat_router.py`からロジック抽出
  - [ ] Token検証ロジック移行（routerから）
  - [ ] Billing連携
  - [ ] Context構築
  - [ ] Provider呼び出し
  - [ ] Command抽出
  - [ ] Unit test作成（Mock使用）
  - [ ] Integration test作成
- [ ] **2.3.3** `SummarizeConversationUseCase`作成
  - [ ] `summarization_service.py`からロジック移行
  - [ ] Token管理
  - [ ] Billing連携
  - [ ] Unit test作成
- [ ] **2.3.4** `SearchKnowledgeBaseUseCase`作成
  - [ ] RAG検索ロジック
  - [ ] Collection管理
  - [ ] Unit test作成
- [ ] **2.3.5** `UploadDocumentUseCase`作成
  - [ ] Document処理
  - [ ] VectorStore登録
  - [ ] Unit test作成
- [ ] **2.3.6** `ManageCollectionUseCase`作成
  - [ ] Collection CRUD
  - [ ] TTL管理
  - [ ] Unit test作成
- [ ] **2.3.7** `GetProviderInfoUseCase`作成
  - [ ] Provider一覧取得
  - [ ] Model情報取得
  - [ ] Unit test作成

#### Step 2.4: Application Services作成

- [ ] **2.4.1** `ChatOrchestrator`作成 → `services/chat_orchestrator.py`
  - [ ] 複雑なワークフロー調整
  - [ ] 複数Use caseの連携
  - [ ] Transaction管理
  - [ ] Unit test作成

#### Step 2.5: Dependency Injection設定

- [ ] **2.5.1** `llm_clean/container.py`作成
  - [ ] DIコンテナ選定（`dependency-injector`推奨）
  - [ ] Container設定
  - [ ] Provider登録
  - [ ] Singleton/Factory設定
- [ ] **2.5.2** `llm_clean/dependencies.py`作成
  - [ ] FastAPI dependency functions
  - [ ] Use case取得関数
  - [ ] Port取得関数
- [ ] **2.5.3** Use caseへのDI適用
  - [ ] Constructor injection
  - [ ] Port injection
- [ ] **2.5.4** Integration test（DI動作確認）

#### Step 2.6: Router Refactoring（薄いレイヤー化）

- [ ] **2.6.1** `chat_router.py`リファクタリング
  - [ ] Token検証ロジック削除（Use caseへ移動）
  - [ ] DTO変換のみに専念
  - [ ] Use case呼び出し
  - [ ] Error handling（decoratorのみ）
  - [ ] Integration test作成
- [ ] **2.6.2** `knowledge_base_router.py`リファクタリング
  - [ ] ビジネスロジック削除
  - [ ] Use case呼び出しに変更
  - [ ] Integration test作成
- [ ] **2.6.3** 他のrouterも同様にリファクタリング
  - [ ] `llm_providers_router.py`
  - [ ] `tools_router.py`

#### Step 2.7: Phase 2 統合テスト

- [ ] **2.7.1** 全Unit testがパス
- [ ] **2.7.2** Integration test（E2E）実行
  - [ ] Chat API
  - [ ] Summarization API
  - [ ] RAG APIs
- [ ] **2.7.3** Performance test
- [ ] **2.7.4** 既存APIとの互換性確認
- [ ] **2.7.5** Code review実施

#### Step 2.8: ドキュメント作成

- [ ] **2.8.1** Use case仕様書作成
- [ ] **2.8.2** DTO仕様書作成
- [ ] **2.8.3** API変更ドキュメント（もしあれば）
- [ ] **2.8.4** DI設定ドキュメント

---

## Phase 3: Infrastructure & Integration Migration

**期間**: 2-3週間
**目標**: Infrastructureを分離し、Clean Architectureを完成

### 📁 作成するディレクトリ構造

```
server/src/llm_clean/
├── infrastructure/
│   ├── __init__.py
│   ├── llm_providers/
│   │   ├── __init__.py
│   │   ├── base_provider.py             # Base implementation
│   │   ├── gemini_provider.py
│   │   ├── openai_provider.py
│   │   ├── provider_factory.py
│   │   ├── provider_registry.py
│   │   ├── config.py
│   │   ├── context_builder.py
│   │   └── adapters/
│   │       └── billing_adapter.py       # Billing system adapter
│   ├── vector_stores/
│   │   ├── __init__.py
│   │   ├── faiss_vector_store.py
│   │   ├── collection_manager.py
│   │   ├── cleanup_job.py
│   │   └── adapters/
│   │       └── vector_store_adapter.py  # Implements VectorStorePort
│   ├── document_processing/
│   │   ├── __init__.py
│   │   ├── document_processor.py
│   │   ├── loaders/
│   │   │   ├── __init__.py
│   │   │   ├── pdf_loader.py
│   │   │   ├── text_loader.py
│   │   │   └── markdown_loader.py
│   │   └── adapters/
│   │       └── document_processor_adapter.py
│   ├── tools/
│   │   ├── __init__.py
│   │   ├── tool_registry.py
│   │   ├── adapters/
│   │   │   ├── __init__.py
│   │   │   └── websocket_adapter.py     # WebSocket adapter
│   │   ├── file_tools/
│   │   │   ├── __init__.py
│   │   │   ├── create_file_tool.py
│   │   │   ├── read_file_tool.py
│   │   │   ├── edit_file_tool.py
│   │   │   ├── edit_file_lines_tool.py
│   │   │   ├── delete_file_tool.py
│   │   │   └── rename_file_tool.py
│   │   ├── search_tools/
│   │   │   ├── __init__.py
│   │   │   ├── file_search_tool.py
│   │   │   └── knowledge_base_search_tool.py
│   │   └── web_tools/
│   │       ├── __init__.py
│   │       ├── web_search_tool.py
│   │       └── web_search_with_rag_tool.py
│   └── token_counting/
│       ├── __init__.py
│       ├── gemini_token_counter.py
│       ├── openai_token_counter.py      # Future implementation
│       └── token_counter_factory.py
└── presentation/
    ├── __init__.py
    ├── routers/
    │   ├── __init__.py
    │   ├── chat_router.py
    │   ├── provider_router.py
    │   ├── tools_router.py
    │   └── knowledge_base_router.py
    ├── schemas/
    │   ├── __init__.py
    │   ├── chat_schemas.py              # API-specific schemas
    │   └── rag_schemas.py
    └── middleware/
        ├── __init__.py
        └── error_handler.py
```

### ✅ Phase 3 チェックリスト

#### Step 3.1: LLM Providers Migration

- [ ] **3.1.1** `infrastructure/llm_providers/`ディレクトリ作成
- [ ] **3.1.2** `providers/base.py`を移行
  - [ ] Domain interfaceを実装
  - [ ] Application portを実装
  - [ ] Unit test移行
- [ ] **3.1.3** Concrete providers移行
  - [ ] `gemini_provider.py`移行
  - [ ] `openai_provider.py`移行
  - [ ] Unit test移行
- [ ] **3.1.4** Factory/Registry移行
  - [ ] `provider_factory.py`移行
  - [ ] `provider_registry.py`移行
  - [ ] Unit test移行
- [ ] **3.1.5** Config移行
  - [ ] `config.py`移行
- [ ] **3.1.6** Context Builder移行
  - [ ] `context_builder.py`移行
  - [ ] `ContextService`との統合
  - [ ] Unit test移行
- [ ] **3.1.7** Billing Adapter作成
  - [ ] `BillingPort`実装
  - [ ] 既存billing moduleとの連携
  - [ ] Unit test作成
- [ ] **3.1.8** Integration test実行

#### Step 3.2: RAG Module Migration

- [ ] **3.2.1** `infrastructure/vector_stores/`ディレクトリ作成
- [ ] **3.2.2** Vector Store移行
  - [ ] `rag/vector_store.py` → `faiss_vector_store.py`
  - [ ] Domain interface実装
  - [ ] Unit test移行
- [ ] **3.2.3** Collection Manager移行
  - [ ] `rag/collection_manager.py`移行
  - [ ] Unit test移行
- [ ] **3.2.4** Cleanup Job移行
  - [ ] `rag/cleanup_job.py`移行
- [ ] **3.2.5** Vector Store Adapter作成
  - [ ] `VectorStorePort`実装
  - [ ] Adapter pattern適用
  - [ ] Unit test作成
- [ ] **3.2.6** `infrastructure/document_processing/`ディレクトリ作成
- [ ] **3.2.7** Document Processor移行
  - [ ] `rag/document_processor.py`移行
  - [ ] Domain interface実装
  - [ ] Unit test移行
- [ ] **3.2.8** Loaders移行
  - [ ] 各loader（PDF, Text, Markdown）を移行
  - [ ] Unit test移行
- [ ] **3.2.9** Document Processor Adapter作成
  - [ ] `DocumentProcessorPort`実装
  - [ ] Unit test作成
- [ ] **3.2.10** Integration test実行

#### Step 3.3: Tools Migration

- [ ] **3.3.1** `infrastructure/tools/`ディレクトリ作成
- [ ] **3.3.2** WebSocket Adapter作成
  - [ ] `IFileReader`インターフェース定義（Domain）
  - [ ] `WebSocketFileReader`実装（Infrastructure）
  - [ ] Adapter pattern適用
  - [ ] Unit test作成
- [ ] **3.3.3** File Tools移行
  - [ ] `tools/file_tools/`ディレクトリ作成
  - [ ] `create_file.py` → `create_file_tool.py`
  - [ ] `read_file.py` → `read_file_tool.py`（WebSocket Adapter使用）
  - [ ] `edit_file.py` → `edit_file_tool.py`
  - [ ] `edit_file_lines.py` → `edit_file_lines_tool.py`
  - [ ] `delete_file.py` → `delete_file_tool.py`
  - [ ] `rename_file.py` → `rename_file_tool.py`
  - [ ] 各Tool unit test作成
- [ ] **3.3.4** Search Tools移行
  - [ ] `tools/search_tools/`ディレクトリ作成
  - [ ] `search_files.py` → `file_search_tool.py`
  - [ ] `search_knowledge_base.py` → `knowledge_base_search_tool.py`
  - [ ] Unit test作成
- [ ] **3.3.5** Web Tools移行
  - [ ] `tools/web_tools/`ディレクトリ作成
  - [ ] `web_search.py` → `web_search_tool.py`
  - [ ] `web_search_with_rag.py` → `web_search_with_rag_tool.py`
  - [ ] Unit test作成
- [ ] **3.3.6** Tool Registry更新
  - [ ] `tool_registry.py`作成
  - [ ] 新しいパスで登録
  - [ ] Unit test作成
- [ ] **3.3.7** Integration test実行

#### Step 3.4: Presentation Layer Finalization

- [ ] **3.4.1** `presentation/routers/`ディレクトリ作成
- [ ] **3.4.2** Routers移行
  - [ ] `routers/chat_router.py` → `presentation/routers/chat_router.py`
  - [ ] DI設定更新
  - [ ] Integration test移行
- [ ] **3.4.3** 他のRouters移行
  - [ ] `provider_router.py`
  - [ ] `tools_router.py`
  - [ ] `knowledge_base_router.py`
  - [ ] Integration test移行
- [ ] **3.4.4** API Schemas整理
  - [ ] `presentation/schemas/`ディレクトリ作成
  - [ ] `chat_schemas.py`作成
  - [ ] `rag_schemas.py`作成
- [ ] **3.4.5** Middleware移行
  - [ ] `error_handler.py`移行
  - [ ] Unit test移行
- [ ] **3.4.6** Integration test（全体）

#### Step 3.5: Main.py更新

- [ ] **3.5.1** `src/main.py`のimport更新
  - [ ] 旧`llm/`から新`llm_clean/`に変更
  - [ ] Router paths更新
- [ ] **3.5.2** DI Container初期化追加
  - [ ] Startup時にContainer setup
- [ ] **3.5.3** Cleanup Job登録更新
- [ ] **3.5.4** 動作確認

#### Step 3.6: Legacy Code Cleanup

- [ ] **3.6.1** 旧`llm/`フォルダをアーカイブ
  - [ ] `llm_legacy/`にリネーム
  - [ ] または完全削除（Git履歴に残る）
- [ ] **3.6.2** `llm_clean/` → `llm/`にリネーム
- [ ] **3.6.3** Import paths更新（全体）
- [ ] **3.6.4** 全Integration test実行
- [ ] **3.6.5** Performance test実行
- [ ] **3.6.6** UAT（User Acceptance Test）

#### Step 3.7: Phase 3 最終確認

- [ ] **3.7.1** 全Unit testがパス
- [ ] **3.7.2** 全Integration testがパス
- [ ] **3.7.3** E2E testがパス
- [ ] **3.7.4** Performance劣化がないこと確認
- [ ] **3.7.5** Code coverage 80%以上
- [ ] **3.7.6** Linter/Formatter実行
- [ ] **3.7.7** Security audit実行
- [ ] **3.7.8** Final code review

#### Step 3.8: ドキュメント最終化

- [ ] **3.8.1** Architecture Decision Records (ADR)作成
- [ ] **3.8.2** API仕様書更新
- [ ] **3.8.3** Developer Guide作成
- [ ] **3.8.4** Migration Guide作成（他moduleへの適用用）
- [ ] **3.8.5** README更新

---

## 最終的なディレクトリ構造

```
server/src/llm/                          # (llm_clean からリネーム)
├── domain/                              # 🔵 Enterprise Business Rules
│   ├── entities/                        # ビジネスエンティティ
│   │   ├── chat_message.py
│   │   ├── conversation.py
│   │   └── llm_command.py
│   ├── value_objects/                   # 値オブジェクト
│   │   ├── token_usage.py
│   │   ├── model_metadata.py
│   │   └── chat_context.py
│   ├── interfaces/                      # ドメインインターフェース
│   │   ├── llm_provider.py
│   │   ├── vector_store.py
│   │   ├── document_processor.py
│   │   ├── token_counter.py
│   │   └── context_service.py
│   └── services/                        # ドメインサービス
│       ├── command_extractor_service.py
│       └── context_service.py
│
├── application/                         # 🟢 Application Business Rules
│   ├── use_cases/                       # ユースケース
│   │   ├── process_chat_use_case.py
│   │   ├── summarize_conversation_use_case.py
│   │   ├── search_knowledge_base_use_case.py
│   │   ├── upload_document_use_case.py
│   │   ├── manage_collection_use_case.py
│   │   └── get_provider_info_use_case.py
│   ├── dtos/                            # データ転送オブジェクト
│   │   ├── chat_dtos.py
│   │   ├── summarization_dtos.py
│   │   ├── provider_dtos.py
│   │   └── rag_dtos.py
│   ├── services/                        # アプリケーションサービス
│   │   └── chat_orchestrator.py
│   └── ports/                           # ポート（インターフェース）
│       ├── input/                       # Input ports (use cases)
│       └── output/                      # Output ports
│           ├── llm_provider_port.py
│           ├── vector_store_port.py
│           └── billing_port.py
│
├── infrastructure/                      # 🟡 Frameworks & Drivers
│   ├── llm_providers/                   # LLM Provider実装
│   │   ├── base_provider.py
│   │   ├── gemini_provider.py
│   │   ├── openai_provider.py
│   │   ├── provider_factory.py
│   │   ├── provider_registry.py
│   │   ├── config.py
│   │   ├── context_builder.py
│   │   └── adapters/
│   │       └── billing_adapter.py
│   ├── vector_stores/                   # Vector Store実装
│   │   ├── faiss_vector_store.py
│   │   ├── collection_manager.py
│   │   ├── cleanup_job.py
│   │   └── adapters/
│   │       └── vector_store_adapter.py
│   ├── document_processing/             # Document処理実装
│   │   ├── document_processor.py
│   │   ├── loaders/
│   │   └── adapters/
│   │       └── document_processor_adapter.py
│   ├── tools/                           # LangChain Tools実装
│   │   ├── tool_registry.py
│   │   ├── adapters/
│   │   │   └── websocket_adapter.py
│   │   ├── file_tools/
│   │   ├── search_tools/
│   │   └── web_tools/
│   └── token_counting/                  # Token Counter実装
│       ├── gemini_token_counter.py
│       ├── openai_token_counter.py
│       └── token_counter_factory.py
│
├── presentation/                        # 🔴 Interface Adapters
│   ├── routers/                         # FastAPI Routers
│   │   ├── chat_router.py
│   │   ├── provider_router.py
│   │   ├── tools_router.py
│   │   └── knowledge_base_router.py
│   ├── schemas/                         # API-specific schemas
│   │   ├── chat_schemas.py
│   │   └── rag_schemas.py
│   └── middleware/                      # Middleware
│       └── error_handler.py
│
├── container.py                         # Dependency Injection Container
├── dependencies.py                      # FastAPI Dependencies
└── __init__.py
```

### 依存性の方向（Clean Architectureの原則）

```
presentation/ ──┐
                ├──> application/ ──┐
infrastructure/ ─┘                  ├──> domain/
                                    │
                                    └──> (No dependencies)
```

- **Domain Layer**: 他のレイヤーに依存しない（Pure Python）
- **Application Layer**: Domainにのみ依存（Interfaceを通じて）
- **Infrastructure Layer**: DomainとApplicationのInterfaceを実装
- **Presentation Layer**: ApplicationとInfrastructureを使用

---

## 移行戦略とリスク管理

### 段階的移行戦略

#### 1. Parallel Development（並行開発）

```
server/src/
├── llm/                    # Legacy code（稼働中）
└── llm_clean/              # New architecture（開発中）
```

- 既存コードを維持しながら新構造を構築
- 段階的に新コードへ切り替え
- Rollback可能性を常に保持

#### 2. Feature Flag Pattern

```python
# settings.py
USE_CLEAN_ARCHITECTURE_LLM = os.getenv("USE_CLEAN_ARCHITECTURE_LLM", "false") == "true"

# main.py
if USE_CLEAN_ARCHITECTURE_LLM:
    from llm_clean.presentation.routers import chat_router
else:
    from llm.routers import chat_router
```

- 環境変数でOld/New切り替え
- A/B Testingが可能
- 問題発生時に即座にRollback

#### 3. Adapter Pattern（移行期間）

```python
# Legacy code compatibility adapter
class LegacyLLMAdapter:
    """Adapt new Use Cases to legacy interface"""
    def __init__(self, use_case: ProcessChatUseCase):
        self.use_case = use_case

    def chat(self, request):  # Legacy interface
        dto = self._convert_to_dto(request)
        result = self.use_case.execute(dto)
        return self._convert_from_dto(result)
```

- 旧コードとの互換性レイヤー
- 段階的な移行を可能に
- 移行完了後に削除

### リスク管理

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| **Performance劣化** | 🔴 高 | 🟡 中 | Benchmark作成、各Phase後にPerformance test実行 |
| **Integration破損** | 🔴 高 | 🟡 中 | Integration test充実、Feature flag使用 |
| **Scope Creep** | 🟡 中 | 🔴 高 | 厳密なチェックリスト管理、Phase境界厳守 |
| **Timeline遅延** | 🟡 中 | 🟡 中 | 週次進捗確認、Blockerの早期エスカレーション |
| **Context Manager移行失敗** | 🔴 高 | 🟢 低 | 徹底的なUnit test、Thread-safety test |
| **DI設定ミス** | 🟡 中 | 🟡 中 | DI専用test suite、起動時validation |
| **外部依存破損** | 🔴 高 | 🟢 低 | Integration test、Contract test |

### Rollback Plan

各Phaseで問題が発生した場合のRollback手順：

**Phase 1 Rollback:**
1. Feature flagをOFFに設定
2. 旧`models.py`に戻す
3. Git revert実行

**Phase 2 Rollback:**
1. Feature flagをOFFに設定
2. Routerを旧バージョンに戻す
3. DI設定を無効化

**Phase 3 Rollback:**
1. `main.py`のimportを旧パスに戻す
2. `llm_legacy/`フォルダに切り替え
3. 緊急デプロイ実行

---

## テスト戦略

### Test Pyramid

```
                    E2E Tests (10%)
                  ━━━━━━━━━━━━━━━
                Integration Tests (30%)
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        Unit Tests (60%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Unit Tests

**Coverage目標**: 80%以上

**対象**:
- Domain Entities（100% coverage）
- Value Objects（100% coverage）
- Domain Services（90%以上）
- Use Cases（90%以上）
- Adapters（80%以上）

**Tools**:
- `pytest`
- `pytest-cov`
- `pytest-mock`

**Example**:
```python
# tests/domain/entities/test_chat_message.py
def test_chat_message_creation():
    message = ChatMessage(role="user", content="Hello")
    assert message.role == "user"
    assert message.content == "Hello"

def test_chat_message_validation():
    with pytest.raises(ValueError):
        ChatMessage(role="invalid", content="")
```

### Integration Tests

**Coverage目標**: 主要フロー100%

**対象**:
- Use Case + Infrastructure（DBなし、Mock使用）
- Router + Use Case（FastAPI TestClient）
- Provider + LangChain（実LLM呼び出しはMock）

**Example**:
```python
# tests/integration/test_chat_flow.py
@pytest.mark.integration
def test_chat_endpoint_with_use_case(client, mock_provider):
    response = client.post("/api/chat", json={
        "message": "Hello",
        "provider": "gemini"
    })
    assert response.status_code == 200
    assert "response" in response.json()
```

### E2E Tests

**Coverage目標**: Critical path 100%

**対象**:
- Chat flow（user → API → LLM → response）
- RAG flow（upload → search → response）
- Summarization flow

**Environment**: Staging環境使用

**Tools**:
- `pytest`
- Real LLM API（test account）
- Real Vector Store

### Performance Tests

**Baseline**: 既存システムのパフォーマンスを計測

**Metrics**:
- Response time（p50, p95, p99）
- Throughput（req/sec）
- Memory usage
- Token counting accuracy

**Tools**:
- `locust`（load testing）
- `pytest-benchmark`

**Acceptance Criteria**:
- Response time劣化: 10%以内
- Throughput劣化: 5%以内
- Memory usage増加: 20%以内

### Test Automation

**CI/CD Pipeline**:
```yaml
# .github/workflows/llm-migration-tests.yml
name: LLM Migration Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Unit Tests
        run: pytest tests/unit/ -v --cov=llm_clean

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Integration Tests
        run: pytest tests/integration/ -v

  performance-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Performance Tests
        run: pytest tests/performance/ --benchmark-only
```

---

## 成功指標（Success Metrics）

### Phase 1 完了基準

- [ ] Domain層のUnit test coverage 95%以上
- [ ] 全既存テストがパス
- [ ] Code review完了
- [ ] Documentation完成

### Phase 2 完了基準

- [ ] Use casesのUnit test coverage 90%以上
- [ ] Integration test coverage 80%以上
- [ ] Routerが薄くなっている（ビジネスロジックなし）
- [ ] DI動作確認完了
- [ ] Performance劣化なし

### Phase 3 完了基準

- [ ] 全レイヤーのTest coverage 80%以上
- [ ] E2E testがパス
- [ ] Performance baseline達成
- [ ] Legacy code削除完了
- [ ] Documentation完成
- [ ] Production deploy成功

### Clean Architecture達成指標

- [ ] **Dependency Rule遵守**: 依存の方向が正しい（outer → inner）
- [ ] **Test Independence**: Infrastructure mockで全Testが実行可能
- [ ] **Interface Segregation**: 各レイヤーのInterfaceが明確
- [ ] **Single Responsibility**: 各クラスの責務が単一
- [ ] **Open/Closed Principle**: 拡張容易、修正不要

---

## タイムライン概算

| Phase | 期間 | 主要マイルストーン |
|-------|------|-------------------|
| **Phase 1** | 1-2週間 | Domain層確立、Global state除去 |
| **Phase 2** | 1-2週間 | Use cases実装、DI導入 |
| **Phase 3** | 2-3週間 | Infrastructure分離、Legacy削除 |
| **バッファ** | 1週間 | 予期せぬ問題対応 |
| **合計** | **5-8週間** | Production ready |

### 週次マイルストーン

**Week 1**: Phase 1 - Entities/Value Objects抽出
**Week 2**: Phase 1 - Interfaces定義、Context Manager refactoring
**Week 3**: Phase 2 - DTOs抽出、Use cases実装開始
**Week 4**: Phase 2 - DI導入、Router refactoring
**Week 5**: Phase 3 - Provider/RAG migration
**Week 6**: Phase 3 - Tools migration
**Week 7**: Phase 3 - Presentation finalization、Legacy cleanup
**Week 8**: Final testing、Documentation、Production deploy

---

## 参考資料

### Clean Architecture

- **Book**: "Clean Architecture" by Robert C. Martin
- **Blog**: [The Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

### Python Clean Architecture

- **GitHub**: [cosmic-python/code](https://github.com/cosmicpython/code) - Architecture Patterns with Python
- **Article**: [Clean Architecture in Python](https://www.thedigitalcatonline.com/blog/2016/11/14/clean-architectures-in-python-a-step-by-step-example/)

### Dependency Injection

- **Library**: [python-dependency-injector](https://python-dependency-injector.ets-labs.org/)
- **Article**: [Dependency Injection in Python](https://fastapi.tiangolo.com/tutorial/dependencies/)

---

## チーム体制と役割分担

### 推奨チーム構成

- **Tech Lead** (1名): Architecture design、Code review
- **Backend Engineer** (2-3名): Implementation、Testing
- **QA Engineer** (1名): Test strategy、E2E testing
- **DevOps Engineer** (0.5名): CI/CD setup、Monitoring

### Phase別推奨担当

| Phase | 主担当 | 副担当 | QA |
|-------|--------|--------|-----|
| Phase 1 | BE #1 | BE #2 | QA (Unit test review) |
| Phase 2 | BE #2 | BE #3 | QA (Integration test) |
| Phase 3 | BE #1, #3 | BE #2 | QA (E2E test) |

---

## よくある質問（FAQ）

### Q1: 既存APIの互換性は保たれますか？

**A**: はい、API endpointとrequest/response formatは変更されません。内部実装のみをリファクタリングします。

### Q2: パフォーマンスは悪化しませんか？

**A**: 各Phase後にPerformance testを実施します。抽象化レイヤーが増えますが、適切な設計により劣化は最小限（10%以内）に抑えます。

### Q3: 移行中に新機能開発は可能ですか？

**A**: はい、Feature flagを使用することで、旧コードで新機能を開発し、移行完了後に新構造へ移植できます。

### Q4: Rollbackは簡単ですか？

**A**: 各Phaseで並行開発を行うため、いつでも旧コードに戻せます。Feature flagで瞬時に切り替え可能です。

### Q5: Clean Architectureは過剰設計ではありませんか？

**A**: LLMモジュールは複雑で、複数のProviderやRAG機能を持つため、Clean Architectureの恩恵を受けやすいです。テスト容易性、拡張性、保守性が大幅に向上します。

---

## 変更履歴

| 日付 | バージョン | 変更内容 | 変更者 |
|------|-----------|----------|--------|
| 2025-11-20 | 1.0.0 | 初版作成 | Claude Code |

---

## 承認

| 役割 | 氏名 | 承認日 | 署名 |
|------|------|--------|------|
| Tech Lead | | | |
| Project Manager | | | |
| QA Lead | | | |

---

**このドキュメントは生きたドキュメントです。移行の進行に伴い、適宜更新してください。**
