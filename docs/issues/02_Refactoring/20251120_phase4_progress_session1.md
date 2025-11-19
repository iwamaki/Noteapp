# Phase 4 進捗記録 - Session 1

**日付**: 2025-11-20
**セッション**: #1
**全体進捗**: 30% 完了

---

## 📊 完了項目

### ✅ Domain層 - Entities（完了）

**場所**: `server/src/domain/llm/entities/`

1. **message.py** ✅
   - `Message` エンティティ（frozen dataclass、不変）
   - `MessageRole` Enum（USER, AI, SYSTEM, TOOL）
   - `LLMCommand` エンティティ（ファイル操作コマンド）
   - ファクトリーメソッド: `create_user_message()`, `create_ai_message()`, etc.
   - バリデーション: 空メッセージ、文字数制限（100万文字）
   - シリアライゼーション: `to_dict()`, `from_dict()`

2. **conversation.py** ✅
   - `Conversation` エンティティ（mutable、会話管理）
   - メッセージコレクション管理
   - メソッド:
     - `add_message()`, `add_user_message()`, `add_ai_message()`
     - `get_recent_messages()`, `get_messages_after()`
     - `remove_oldest_messages()`, `clear_messages()`
   - クエリ: `get_last_message()`, `get_user_messages()`, etc.

3. **tool_execution.py** ✅
   - `ToolExecution` エンティティ（ツール実行記録）
   - `ToolExecutionStatus` Enum（PENDING, RUNNING, COMPLETED, FAILED）
   - ライフサイクル管理:
     - `start_execution()` → RUNNING
     - `complete_execution()` → COMPLETED
     - `fail_execution()` → FAILED
   - 実行時間計算（ミリ秒単位）

4. **__init__.py** ✅
   - 全エンティティのエクスポート

---

### ✅ Domain層 - Value Objects（完了）

**場所**: `server/src/domain/llm/value_objects/`

1. **model_config.py** ✅
   - `ModelConfig` 値オブジェクト（frozen、不変）
   - フィールド:
     - `provider`, `model`, `temperature`, `max_tokens`, `top_p`
   - ファクトリーメソッド:
     - `create_default()` - 標準設定（temperature=0.7）
     - `create_deterministic()` - 決定的出力（temperature=0）
     - `create_creative()` - 創造的出力（temperature=1.0）
   - Immutable更新: `with_temperature()`, `with_max_tokens()`
   - バリデーション: temperature範囲（0-2）, top_p範囲（0-1）

2. **token_usage.py** ✅
   - `TokenUsage` 値オブジェクト（frozen、不変）
   - フィールド:
     - `current_tokens`, `max_tokens` - 会話履歴のトークン数
     - `input_tokens`, `output_tokens`, `total_tokens` - 実際の使用量（課金対象）
   - メソッド:
     - `get_usage_ratio()` - 使用率（0.0-1.0）
     - `needs_summary(threshold=0.8)` - 要約必要性判定
     - `is_near_limit(threshold=0.9)` - 制限接近判定
     - `get_cost_multiplier()` - 料金計算用（百万単位）
   - ファクトリー:
     - `create_empty()` - 空の使用量
     - `create_with_actual_usage()` - 実際の使用量付き

3. **__init__.py** ✅
   - 全値オブジェクトのエクスポート

---

### ✅ Domain層 - Repository Interfaces（完了）

**場所**: `server/src/domain/llm/repositories/`

1. **conversation_repository.py** ✅
   - `ConversationRepository` 抽象インターフェース（ABC）
   - CRUD操作:
     - `save()` - 保存
     - `find_by_id()` - ID検索
     - `find_by_user_id()` - ユーザーID検索
     - `find_recent_by_user_id()` - 最近の会話検索
     - `delete()`, `delete_by_user_id()` - 削除
   - ユーティリティ:
     - `exists()` - 存在確認
     - `count_by_user_id()` - カウント
   - 全メソッド非同期（async）

2. **__init__.py** ✅
   - リポジトリインターフェースのエクスポート

---

### ✅ Domain層 - Providers（コピー完了）

**場所**: `server/src/domain/llm/providers/`

**コピー済みファイル**:
1. `base.py` - `BaseLLMProvider`, `BaseAgentLLMProvider`
2. `registry.py` - プロバイダーレジストリ（SSOT）
3. `factory.py` - `LLMClientFactory`
4. `gemini_provider.py` - Gemini実装
5. `openai_provider.py` - OpenAI実装
6. `context_builder.py` - `ChatContextBuilder`
7. `command_extractor.py` - `AgentCommandExtractor`
8. `config.py` - プロバイダー設定
9. `__init__.py` - エクスポート設定 ✅

**⚠️ 未完了**:
- インポートパスの修正（`src.llm.*` → `src.domain.llm.*`）
- これは後のステップで一括修正予定

---

### ✅ Application層 - DTOs（完了）

**場所**: `server/src/application/llm/dto/`

1. **chat_dto.py** ✅
   - `ChatMessageDTO` - メッセージDTO
   - `ChatContextDTO` - コンテキストDTO
   - `LLMCommandDTO` - コマンドDTO
   - `TokenUsageDTO` - トークン使用量DTO
   - `ChatRequestDTO` - リクエストDTO
   - `ChatResponseDTO` - レスポンスDTO

2. **provider_dto.py** ✅
   - `ModelMetadataDTO` - モデルメタデータ
   - `ProviderDTO` - プロバイダー情報

3. **__init__.py** ✅
   - 全DTOのエクスポート

---

## 📋 次回実装予定（優先順位順）

### 🔴 Priority 1: Application層 - Commands & Queries

**Commands** (`application/llm/commands/`):
1. `send_chat_message.py` - チャットメッセージ送信
   - `SendChatMessageCommand` クラス
   - `execute()` メソッド
   - Domain ServicesとProvidersの統合

2. `summarize_conversation.py` - 会話要約
   - `SummarizeConversationCommand` クラス
   - 要約ロジックの実装

**Queries** (`application/llm/queries/`):
1. `get_providers.py` - プロバイダー一覧取得
   - `GetProvidersQuery` クラス
   - レジストリからの情報取得

2. `get_models.py` - モデル一覧取得
   - `GetModelsQuery` クラス
   - プロバイダー別モデル情報

---

### 🟡 Priority 2: Presentation層 - API

**Schemas** (`presentation/api/v1/llm/`):
1. `schemas.py` - Pydanticスキーマ
   - 既存 `llm/models.py` から移行
   - Request/Responseスキーマ

**Routers** (`presentation/api/v1/llm/`):
1. `chat_router.py` - チャットエンドポイント
   - `/api/chat` POST/GET
   - `/api/chat/summarize` POST
   - `/api/document/summarize` POST

2. `provider_router.py` - プロバイダーエンドポイント
   - `/api/llm/providers` GET
   - `/api/llm/models` GET

3. `router.py` - ルーター統合
   - 全ルーターの集約

**Dependencies** (`presentation/api/v1/llm/`):
1. `dependencies.py` - DI設定
   - Command/Queryの依存注入

---

### 🟢 Priority 3: WebSocket DI化（最重要・技術的チャレンジ）

**WebSocket** (`presentation/websocket/`):
1. `connection_manager.py` - DI対応
   - グローバルシングルトン排除
   - インターフェース定義
   - 依存注入可能な設計

2. `router.py` - WebSocketルーター
   - DI対応エンドポイント

**Redis統合** (`infrastructure/cache/`):
1. `websocket_cache.py` - Redis統合
   - 接続状態の永続化
   - リクエスト管理の分散化
   - 複数インスタンス対応

---

### 🔵 Priority 4: Import Paths修正

**対象ファイル**:
- `domain/llm/providers/*.py` - 全8ファイル
- インポートパス: `src.llm.*` → `src.domain.llm.*`
- 相対インポートの調整

**ツール**:
```bash
# 一括置換例
find server/src/domain/llm/providers -name "*.py" -exec sed -i 's/from src\.llm\./from src.domain.llm./g' {} \;
```

---

### 🟣 Priority 5: 統合・テスト・クリーンアップ

1. **Features統合**:
   - `features/rag/` - 既存のまま使用
   - `features/tools/` - context_manager.py のDI化

2. **テスト**:
   - Unit tests（Domain層、Application層）
   - Integration tests（API、WebSocket）

3. **クリーンアップ**:
   - `llm/` ディレクトリ削除
   - `api/websocket.py` 削除

---

## 🎯 設計原則の遵守状況

### ✅ クリーンアーキテクチャ
- **依存方向**: 外側 → 内側（Domain層は外部依存ゼロ）
- **Entities**: 純粋なビジネスロジック、不変性保証
- **Value Objects**: frozen dataclass、バリデーション実装
- **Repository**: インターフェース定義のみ、実装は分離

### ✅ DDD（ドメイン駆動設計）
- **エンティティ**: 固有のID、ライフサイクル管理
- **値オブジェクト**: 不変、等価性比較
- **リポジトリ**: 永続化の抽象化

### ✅ CQRS（軽量版）
- **Commands**: データ変更操作（SendChatMessage等）
- **Queries**: データ読み取り操作（GetProviders等）
- **分離**: 責務の明確化

---

## 📂 ディレクトリ構造（現状）

```
server/src/
├── domain/
│   └── llm/
│       ├── entities/          ✅ 完了
│       │   ├── message.py
│       │   ├── conversation.py
│       │   ├── tool_execution.py
│       │   └── __init__.py
│       ├── value_objects/     ✅ 完了
│       │   ├── model_config.py
│       │   ├── token_usage.py
│       │   └── __init__.py
│       ├── repositories/      ✅ 完了
│       │   ├── conversation_repository.py
│       │   └── __init__.py
│       ├── providers/         ✅ コピー完了（要修正）
│       │   ├── base.py
│       │   ├── registry.py
│       │   ├── factory.py
│       │   ├── gemini_provider.py
│       │   ├── openai_provider.py
│       │   ├── context_builder.py
│       │   ├── command_extractor.py
│       │   ├── config.py
│       │   └── __init__.py
│       └── services/          ⏳ 未着手
│
├── application/
│   └── llm/
│       ├── dto/               ✅ 完了
│       │   ├── chat_dto.py
│       │   ├── provider_dto.py
│       │   └── __init__.py
│       ├── commands/          ⏳ 未着手
│       │   └── __init__.py
│       └── queries/           ⏳ 未着手
│           └── __init__.py
│
├── presentation/
│   └── api/
│       └── v1/
│           └── llm/           ⏳ 未着手
│               └── __init__.py
│
└── features/                  ✅ 既存（統合待ち）
    ├── rag/
    └── tools/
```

---

## 🔧 技術的メモ

### Immutability（不変性）の実装
```python
# frozen dataclass（完全不変）
@dataclass(frozen=True)
class Message:
    role: MessageRole
    content: str
    # 変更不可
```

### Repository Pattern
```python
# Domain層: インターフェース定義のみ
class ConversationRepository(ABC):
    @abstractmethod
    async def save(self, conversation: Conversation) -> Conversation:
        pass

# Persistence層（未実装）: 実装クラス
class ConversationRepositoryImpl(ConversationRepository):
    async def save(self, conversation: Conversation) -> Conversation:
        # SQLAlchemy実装
        pass
```

### Factory Pattern
```python
# ファクトリーメソッド
message = Message.create_user_message("Hello")
config = ModelConfig.create_deterministic("gemini", "gemini-2.5-flash")
```

---

## ⚠️ 既知の課題

1. **Import Paths**: Providersのインポートパスが旧構造のまま
   - 影響: `domain/llm/providers/*.py` の8ファイル
   - 修正: 一括置換で対応予定

2. **WebSocket Singleton**: グローバルシングルトンが残存
   - 場所: `api/websocket.py` Line 312
   - 修正: Priority 3で対応

3. **Services未実装**: Domain Servicesが未実装
   - 必要: ChatOrchestrationService, ProviderService等
   - 修正: 次回セッションで実装

---

## 📊 統計情報

- **作成ファイル数**: 15ファイル
- **コード行数（概算）**: 約1,200行
- **Domain層完成度**: 70%
- **Application層完成度**: 30%
- **全体完成度**: 30%

---

## 🚀 次回セッションの開始手順

1. **この記録を読み込む**:
   ```bash
   cat docs/issues/02_Refactoring/20251120_phase4_progress_session1.md
   ```

2. **現状確認**:
   ```bash
   tree server/src/domain/llm -L 2
   tree server/src/application/llm -L 2
   ```

3. **TODOリスト確認**:
   - Priority 1から順次実装

4. **Application/Commands実装**:
   ```bash
   # 最初のタスク
   vim server/src/application/llm/commands/send_chat_message.py
   ```

---

## 💡 設計の学び

### 良かった点
1. **Entities設計**: frozen dataclassで不変性保証、バリデーション充実
2. **Value Objects**: ファクトリーメソッド、ビジネスロジック内包
3. **Repository**: 完全な抽象化、非同期対応

### 改善点
1. **段階的実装**: 大規模リファクタリングは複数セッションに分割
2. **Import管理**: コピー時に即座に修正すべきだった
3. **テスト**: TDD的にテストを先行すべきだった

---

**次回継続**: Application/Commands実装 → Presentation/Routers → WebSocket DI化

**推定残り作業時間**: 2-3セッション（各2-3時間）

**最終ゴール**: Phase 4完全完了 → 旧コード削除 → 統合テスト → 本番デプロイ
