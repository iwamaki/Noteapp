# サーバーアーキテクチャリファクタリング計画

**作成日**: 2025-11-19
**ステータス**: 計画中
**優先度**: 高
**推定期間**: 12-16週間

---

## 📋 目次

1. [エグゼクティブサマリー](#エグゼクティブサマリー)
2. [現状分析](#現状分析)
3. [新アーキテクチャ概要](#新アーキテクチャ概要)
4. [詳細ディレクトリ構造](#詳細ディレクトリ構造)
5. [移行戦略](#移行戦略)
6. [✅ シンプルチェックリスト](#シンプルチェックリスト)
7. [技術的詳細](#技術的詳細)
8. [リスクと対策](#リスクと対策)
9. [成功指標](#成功指標)
10. [参考資料](#参考資料)

---

## エグゼクティブサマリー

### 背景
現在のserverフォルダは機能的には動作しているものの、以下の課題により長期的な保守性に懸念がある：
- ディレクトリ構造の一貫性欠如
- ビジネスロジックのコントローラー層への混入
- グローバルシングルトンの多用
- 設定管理の分散

### 目標
クリーンアーキテクチャとドメイン駆動設計（DDD）の原則に基づいた、保守性・拡張性・テスト容易性の高いモジュラーモノリス構造への移行。

### 期待される成果
- **保守性**: 明確な責務分離により、変更の影響範囲が予測可能
- **テスト容易性**: レイヤーごとの独立したテストが可能
- **拡張性**: 新機能追加時の既存コードへの影響を最小化
- **スケーラビリティ**: 将来的なマイクロサービス分割への準備
- **開発効率**: チームでのモジュール単位での並行開発が可能

---

## 現状分析

### アーキテクチャ成熟度: 6.5/10

#### 強み ✅
1. **適切なモジュール構造**
   - Billingモジュール: サービス層パターンが適切に実装
   - LLMモジュール: プロバイダーパターン、レジストリパターンの活用
   - 認証モジュール: サブルーター構造による責務分離

2. **技術選定**
   - FastAPI による型安全性
   - Pydantic v2 による強力なバリデーション
   - SQLAlchemy ORM による安全なDB操作
   - 依存性注入パターンの活用

3. **セキュリティ**
   - JWT認証の適切な実装
   - トークンブラックリストによるログアウト
   - Secret Manager統合
   - レート制限の実装

#### 課題 ⚠️

1. **構造の一貫性欠如**
   - `api/billing_router.py` が `billing/` 以外の場所に配置
   - モジュールごとにルーター配置規則が異なる

2. **Fatコントローラー**
   - `oauth_router.py` のコールバック処理に95行のビジネスロジック
   - コントローラー層での直接的なDB操作（Line 166-261）

3. **グローバルシングルトンの乱用**
   - WebSocketマネージャー
   - 設定オブジェクト
   - トークンブラックリストマネージャー
   - テスタビリティとスケーラビリティの阻害要因

4. **巨大サービスクラス**
   - `BillingService`: 400行以上、複数の責務を担当
   - 単一責任原則（SRP）違反

5. **設定管理の分散**
   - `core/config.py`: アプリ全体設定
   - `core/pricing_config.py`: 価格計算ロジック
   - `billing/config.py`: Billing定数
   - `llm/providers/config.py`: プロバイダー設定
   - 循環依存の発生

6. **スケーラビリティ制約**
   - SQLite使用（本番環境で並行性の問題）
   - インメモリWebSocket状態（複数インスタンス展開不可）
   - 分散キャッシュの欠如

7. **バリデーション重複**
   - ルーター、サービス、スキーマで同じバリデーションが繰り返し実装

---

## 新アーキテクチャ概要

### 設計原則

#### 1. クリーンアーキテクチャ
```
┌─────────────────────────────────────────┐
│   Presentation Layer (API/WebSocket)    │  ← 外部インターフェース
├─────────────────────────────────────────┤
│     Application Layer (Use Cases)       │  ← ビジネスフロー制御
├─────────────────────────────────────────┤
│       Domain Layer (Business Logic)     │  ← コアビジネスロジック
├─────────────────────────────────────────┤
│    Persistence Layer (Repositories)     │  ← データアクセス実装
├─────────────────────────────────────────┤
│   Infrastructure Layer (External)       │  ← 外部依存・技術詳細
└─────────────────────────────────────────┘

依存方向: 外側 → 内側（内側は外側を知らない）
```

#### 2. 依存性の逆転原則（DIP）
```python
# ❌ 従来: 具体実装への依存
class BillingRouter:
    def __init__(self):
        self.db = SessionLocal()  # 具体的なDB実装に依存

# ✅ 新: インターフェースへの依存
class GetBalanceQuery:
    def __init__(self, balance_repo: BalanceRepository):  # 抽象に依存
        self.balance_repo = balance_repo
```

#### 3. CQRS軽量版（Command/Query分離）
- **Command**: データを変更する操作（`purchase_credits.py`）
- **Query**: データを読み取る操作（`get_balance.py`）
- 責務の明確化と最適化の容易性

#### 4. モジュラーモノリス
各ドメイン（Auth、Billing、LLM）を独立したモジュールとして設計：
- 明確な境界定義
- モジュール間の疎結合
- 独立したテスト可能性
- 将来的なマイクロサービス分割の基盤

### レイヤー説明

#### Infrastructure層
- **責務**: データベース接続、外部API、設定管理、ログ、キャッシュ
- **特徴**: 技術的詳細の集約、環境依存性の分離
- **例**: PostgreSQL接続、Redis、Secret Manager、Google OAuth

#### Domain層
- **責務**: ビジネスルールとドメインロジックの実装
- **特徴**: 外部依存ゼロ、純粋なビジネスロジック
- **構成**: Entities（エンティティ）、Value Objects（値オブジェクト）、Domain Services、Repository Interfaces

#### Application層
- **責務**: ユースケースの実行とビジネスフローの制御
- **特徴**: ドメインサービスのオーケストレーション
- **構成**: Commands、Queries、DTOs（Data Transfer Objects）

#### Presentation層
- **責務**: HTTPリクエスト/レスポンス処理、WebSocket通信
- **特徴**: 外部とのインターフェース、リクエストバリデーション
- **構成**: FastAPIルーター、Pydanticスキーマ、Dependencies

#### Persistence層
- **責務**: データの永続化実装
- **特徴**: SQLAlchemyモデル、リポジトリパターン実装
- **構成**: ORM Models、Repository Implementations

---

## 詳細ディレクトリ構造

```
server/
├── src/
│   ├── main.py                          # アプリケーションエントリーポイント
│   │
│   ├── infrastructure/                  # ━━━ インフラストラクチャ層 ━━━
│   │   ├── __init__.py
│   │   ├── database/                    # データベース関連
│   │   │   ├── __init__.py
│   │   │   ├── connection.py           # DB接続・セッション管理
│   │   │   ├── base.py                 # SQLAlchemy Base
│   │   │   └── migrations/             # Alembicマイグレーション
│   │   ├── config/                      # 設定管理（統合）
│   │   │   ├── __init__.py
│   │   │   ├── settings.py             # 環境変数ベース設定（Pydantic Settings）
│   │   │   ├── secrets.py              # Secret Manager統合
│   │   │   └── constants.py            # アプリケーション定数
│   │   ├── logging/                     # ロギング
│   │   │   ├── __init__.py
│   │   │   └── logger.py               # 構造化ログ設定
│   │   ├── cache/                       # キャッシュ（Redis）
│   │   │   ├── __init__.py
│   │   │   ├── redis_client.py
│   │   │   └── cache_decorator.py
│   │   └── external/                    # 外部API統合
│   │       ├── __init__.py
│   │       ├── google_oauth/
│   │       │   ├── __init__.py
│   │       │   ├── client.py
│   │       │   └── flow.py
│   │       ├── google_play/
│   │       │   ├── __init__.py
│   │       │   └── iap_verifier.py
│   │       └── secret_manager/
│   │           ├── __init__.py
│   │           └── client.py
│   │
│   ├── shared/                          # ━━━ 共通コンポーネント ━━━
│   │   ├── __init__.py
│   │   ├── exceptions/                  # 統一例外処理
│   │   │   ├── __init__.py
│   │   │   ├── base.py                 # 基底例外クラス
│   │   │   ├── auth_exceptions.py      # 認証例外
│   │   │   ├── billing_exceptions.py   # 課金例外
│   │   │   ├── handlers.py             # グローバルエラーハンドラー
│   │   │   └── codes.py                # エラーコード定数
│   │   ├── middleware/                  # ミドルウェア
│   │   │   ├── __init__.py
│   │   │   ├── auth_middleware.py
│   │   │   ├── logging_middleware.py
│   │   │   ├── error_middleware.py
│   │   │   └── rate_limit_middleware.py
│   │   ├── validators/                  # 共通バリデーター
│   │   │   ├── __init__.py
│   │   │   └── common.py
│   │   └── utils/                       # ユーティリティ
│   │       ├── __init__.py
│   │       ├── datetime.py
│   │       ├── crypto.py
│   │       └── id_generator.py
│   │
│   ├── domain/                          # ━━━ ドメイン層 ━━━
│   │   ├── __init__.py
│   │   │
│   │   ├── auth/                        # 認証ドメイン
│   │   │   ├── __init__.py
│   │   │   ├── entities/               # エンティティ
│   │   │   │   ├── __init__.py
│   │   │   │   ├── user.py             # ユーザーエンティティ
│   │   │   │   └── device.py           # デバイスエンティティ
│   │   │   ├── repositories/           # リポジトリインターフェース
│   │   │   │   ├── __init__.py
│   │   │   │   ├── user_repository.py
│   │   │   │   └── device_repository.py
│   │   │   ├── services/               # ドメインサービス
│   │   │   │   ├── __init__.py
│   │   │   │   ├── auth_service.py     # 認証ビジネスロジック
│   │   │   │   ├── device_service.py   # デバイス管理
│   │   │   │   ├── oauth_service.py    # OAuth処理
│   │   │   │   └── token_service.py    # トークン管理
│   │   │   └── value_objects/          # 値オブジェクト
│   │   │       ├── __init__.py
│   │   │       ├── jwt_token.py        # JWTトークン
│   │   │       ├── device_id.py        # デバイスID
│   │   │       └── email.py            # メールアドレス
│   │   │
│   │   ├── billing/                     # 課金ドメイン
│   │   │   ├── __init__.py
│   │   │   ├── entities/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── user_balance.py     # ユーザー残高
│   │   │   │   ├── credit.py           # クレジット
│   │   │   │   ├── transaction.py      # トランザクション
│   │   │   │   └── pricing.py          # 価格設定
│   │   │   ├── repositories/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── balance_repository.py
│   │   │   │   ├── credit_repository.py
│   │   │   │   ├── transaction_repository.py
│   │   │   │   └── pricing_repository.py
│   │   │   ├── services/               # 巨大BillingServiceを分割
│   │   │   │   ├── __init__.py
│   │   │   │   ├── credit_service.py   # クレジット購入・管理
│   │   │   │   ├── token_service.py    # トークン割当・消費
│   │   │   │   ├── transaction_service.py # トランザクション記録
│   │   │   │   └── pricing_service.py  # 価格計算
│   │   │   └── value_objects/
│   │   │       ├── __init__.py
│   │   │       ├── token_amount.py     # トークン量
│   │   │       ├── credit_amount.py    # クレジット量
│   │   │       └── price.py            # 価格
│   │   │
│   │   └── llm/                         # LLMドメイン
│   │       ├── __init__.py
│   │       ├── entities/
│   │       │   ├── __init__.py
│   │       │   ├── conversation.py     # 会話
│   │       │   ├── message.py          # メッセージ
│   │       │   └── tool_execution.py   # ツール実行
│   │       ├── repositories/
│   │       │   ├── __init__.py
│   │       │   └── conversation_repository.py
│   │       ├── services/
│   │       │   ├── __init__.py
│   │       │   ├── chat_orchestration_service.py  # チャット制御
│   │       │   ├── provider_service.py            # プロバイダー管理
│   │       │   ├── tool_execution_service.py      # ツール実行
│   │       │   └── summarization_service.py       # 要約
│   │       └── providers/              # プロバイダー実装
│   │           ├── __init__.py
│   │           ├── base.py             # 抽象基底クラス
│   │           ├── registry.py         # プロバイダーレジストリ
│   │           ├── factory.py          # ファクトリー
│   │           ├── gemini_provider.py
│   │           ├── openai_provider.py
│   │           ├── context_builder.py
│   │           └── command_extractor.py
│   │
│   ├── application/                     # ━━━ アプリケーション層 ━━━
│   │   ├── __init__.py
│   │   │
│   │   ├── auth/                        # 認証ユースケース
│   │   │   ├── __init__.py
│   │   │   ├── commands/               # コマンド（書き込み操作）
│   │   │   │   ├── __init__.py
│   │   │   │   ├── register_device.py  # デバイス登録
│   │   │   │   ├── login_with_google.py # Google OAuth ログイン
│   │   │   │   ├── refresh_token.py    # トークンリフレッシュ
│   │   │   │   └── logout.py           # ログアウト
│   │   │   ├── queries/                # クエリ（読み込み操作）
│   │   │   │   ├── __init__.py
│   │   │   │   ├── get_user_profile.py
│   │   │   │   └── verify_token.py
│   │   │   └── dto/                    # データ転送オブジェクト
│   │   │       ├── __init__.py
│   │   │       └── auth_dto.py
│   │   │
│   │   ├── billing/                     # 課金ユースケース
│   │   │   ├── __init__.py
│   │   │   ├── commands/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── purchase_credits.py # クレジット購入
│   │   │   │   ├── allocate_tokens.py  # トークン割当
│   │   │   │   ├── consume_tokens.py   # トークン消費
│   │   │   │   └── verify_purchase.py  # 購入検証（IAP）
│   │   │   ├── queries/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── get_balance.py      # 残高照会
│   │   │   │   ├── get_transactions.py # トランザクション履歴
│   │   │   │   └── get_pricing.py      # 価格表取得
│   │   │   └── dto/
│   │   │       ├── __init__.py
│   │   │       └── billing_dto.py
│   │   │
│   │   └── llm/                         # LLMユースケース
│   │       ├── __init__.py
│   │       ├── commands/
│   │       │   ├── __init__.py
│   │       │   ├── send_chat_message.py    # チャットメッセージ送信
│   │       │   ├── execute_tool.py         # ツール実行
│   │       │   └── create_conversation.py  # 会話作成
│   │       ├── queries/
│   │       │   ├── __init__.py
│   │       │   ├── get_providers.py        # プロバイダー一覧
│   │       │   ├── get_models.py           # モデル一覧
│   │       │   └── get_conversation_history.py
│   │       └── dto/
│   │           ├── __init__.py
│   │           └── llm_dto.py
│   │
│   ├── presentation/                    # ━━━ プレゼンテーション層 ━━━
│   │   ├── __init__.py
│   │   ├── api/                         # REST API
│   │   │   ├── __init__.py
│   │   │   ├── dependencies.py         # 共通dependencies
│   │   │   │
│   │   │   └── v1/                     # APIバージョニング
│   │   │       ├── __init__.py
│   │   │       ├── router.py           # v1ルーター集約
│   │   │       │
│   │   │       ├── auth/               # 認証エンドポイント
│   │   │       │   ├── __init__.py
│   │   │       │   ├── router.py       # ルーター集約
│   │   │       │   ├── device_router.py
│   │   │       │   ├── oauth_router.py
│   │   │       │   ├── token_router.py
│   │   │       │   ├── schemas.py      # Pydanticスキーマ
│   │   │       │   └── dependencies.py
│   │   │       │
│   │   │       ├── billing/            # 課金エンドポイント
│   │   │       │   ├── __init__.py
│   │   │       │   ├── router.py       # 統合ルーター
│   │   │       │   ├── credit_router.py
│   │   │       │   ├── token_router.py
│   │   │       │   ├── transaction_router.py
│   │   │       │   └── schemas.py
│   │   │       │
│   │   │       └── llm/                # LLMエンドポイント
│   │   │           ├── __init__.py
│   │   │           ├── router.py       # 統合ルーター
│   │   │           ├── chat_router.py
│   │   │           ├── provider_router.py
│   │   │           ├── tool_router.py
│   │   │           ├── knowledge_base_router.py
│   │   │           └── schemas.py
│   │   │
│   │   └── websocket/                   # WebSocket
│   │       ├── __init__.py
│   │       ├── connection_manager.py   # 接続管理（依存注入対応）
│   │       ├── message_handlers.py     # メッセージハンドラー
│   │       └── router.py               # WebSocketルーター
│   │
│   ├── persistence/                     # ━━━ 永続化層 ━━━
│   │   ├── __init__.py
│   │   ├── models/                     # SQLAlchemyモデル
│   │   │   ├── __init__.py
│   │   │   ├── user.py                 # ユーザーテーブル
│   │   │   ├── device_auth.py          # デバイス認証テーブル
│   │   │   ├── credit.py               # クレジットテーブル
│   │   │   ├── token_balance.py        # トークン残高テーブル
│   │   │   ├── token_pricing.py        # 価格設定テーブル
│   │   │   └── transaction.py          # トランザクションテーブル
│   │   └── repositories/               # リポジトリ実装
│   │       ├── __init__.py
│   │       ├── user_repository_impl.py
│   │       ├── device_repository_impl.py
│   │       ├── balance_repository_impl.py
│   │       ├── credit_repository_impl.py
│   │       └── transaction_repository_impl.py
│   │
│   └── features/                        # ━━━ 機能固有コンポーネント ━━━
│       ├── __init__.py
│       ├── rag/                        # RAG機能
│       │   ├── __init__.py
│       │   ├── vector_store.py
│       │   ├── document_processor.py
│       │   ├── collection_manager.py
│       │   ├── cleanup_job.py
│       │   └── instances.py
│       └── tools/                      # LLMツール実装
│           ├── __init__.py
│           ├── base_tool.py
│           ├── file_operations/
│           │   ├── __init__.py
│           │   ├── read_file.py
│           │   ├── create_file.py
│           │   ├── edit_file.py
│           │   ├── delete_file.py
│           │   └── rename_file.py
│           ├── search/
│           │   ├── __init__.py
│           │   ├── search_files.py
│           │   └── search_knowledge_base.py
│           └── web/
│               ├── __init__.py
│               ├── web_search.py
│               └── web_search_with_rag.py
│
├── tests/                              # ━━━ テスト ━━━
│   ├── __init__.py
│   ├── conftest.py                     # pytest設定・フィクスチャ
│   ├── unit/                           # ユニットテスト
│   │   ├── __init__.py
│   │   ├── domain/
│   │   │   ├── auth/
│   │   │   ├── billing/
│   │   │   └── llm/
│   │   ├── application/
│   │   │   ├── auth/
│   │   │   ├── billing/
│   │   │   └── llm/
│   │   └── infrastructure/
│   ├── integration/                    # 統合テスト
│   │   ├── __init__.py
│   │   ├── api/
│   │   │   ├── test_auth_api.py
│   │   │   ├── test_billing_api.py
│   │   │   └── test_llm_api.py
│   │   └── database/
│   │       └── test_repositories.py
│   └── e2e/                           # E2Eテスト
│       ├── __init__.py
│       └── test_user_flows.py
│
├── alembic/                            # DBマイグレーション
│   ├── versions/
│   │   └── 001_initial_schema.py
│   ├── env.py
│   └── script.py.mako
│
├── docs/                               # ドキュメント
│   ├── architecture/
│   │   ├── overview.md                 # アーキテクチャ概要
│   │   ├── domain_model.md             # ドメインモデル図
│   │   ├── layers.md                   # レイヤー説明
│   │   └── decisions/                 # ADR（Architecture Decision Records）
│   │       ├── 001-clean-architecture.md
│   │       ├── 002-cqrs-pattern.md
│   │       └── 003-repository-pattern.md
│   ├── api/
│   │   ├── openapi.yaml                # OpenAPI仕様
│   │   └── endpoints.md                # エンドポイント一覧
│   └── deployment/
│       ├── setup.md                    # セットアップガイド
│       └── migration.md                # マイグレーションガイド
│
├── scripts/                            # ユーティリティスクリプト
│   ├── seed_data.py                    # 初期データ投入
│   ├── migrate.py                      # マイグレーション実行
│   └── check_health.py                 # ヘルスチェック
│
├── requirements/                       # 依存関係管理
│   ├── base.txt                        # 基本依存
│   ├── dev.txt                         # 開発用
│   └── prod.txt                        # 本番用
│
├── alembic.ini                         # Alembic設定
├── pyproject.toml                      # プロジェクト設定
├── docker-compose.yml
├── Dockerfile
└── README.md
```

---

## 移行戦略

### 全体方針

1. **段階的移行**: ビッグバン移行ではなく、モジュール単位で段階的に実施
2. **並行稼働**: 旧構造と新構造を一時的に共存させる
3. **テストファースト**: 移行前に既存機能のテストを整備
4. **継続的デプロイ**: 各フェーズ完了後にデプロイ可能な状態を維持

### フェーズ別計画

#### 📦 フェーズ1: 基盤整備（2-3週間）

**目標**: 新アーキテクチャの基盤を構築

**タスク**:
1. 新ディレクトリ構造の作成
2. Infrastructure層の実装
   - データベース接続管理（PostgreSQL対応）
   - 統一設定管理（Pydantic Settings）
   - ロギング設定
   - Redisキャッシュクライアント
3. Shared層の実装
   - 基底例外クラス
   - エラーコード定数
   - グローバルエラーハンドラー
   - 共通ミドルウェア
4. Alembicセットアップとマイグレーション初期化

**成果物**:
- `infrastructure/` ディレクトリ完成
- `shared/` ディレクトリ完成
- Alembic設定完了
- 初期マイグレーションファイル

**リスク**: なし（既存コードに影響しない）

---

#### 📦 フェーズ2: Billingドメイン移行（3-4週間）

**目標**: 最も整理されているBillingモジュールを新構造に移行

**理由**: Billingは既にサービス層が適切に実装されており、移行の難易度が低い

**タスク**:
1. Domain層の実装
   - エンティティ作成（Credit、TokenBalance、Transaction）
   - 値オブジェクト作成（TokenAmount、CreditAmount、Price）
   - リポジトリインターフェース定義
   - ドメインサービス実装（4つに分割）
     - CreditService
     - TokenService
     - TransactionService
     - PricingService

2. Persistence層の実装
   - SQLAlchemyモデルの移行
   - リポジトリ実装クラス

3. Application層の実装
   - Commands（購入、割当、消費）
   - Queries（残高照会、履歴取得）
   - DTOs

4. Presentation層の実装
   - ルーターの再構築（v1/billing/）
   - スキーマの整理

5. テストの実装
   - ユニットテスト（各層）
   - 統合テスト（API）

6. 旧コードの削除
   - `api/billing_router.py` 削除
   - `billing/` の旧ファイル削除

**成果物**:
- Billingドメインの完全移行
- テストカバレッジ80%以上
- APIの後方互換性維持

**リスク**: 中（既存APIとの互換性確保が必要）

---

#### 📦 フェーズ3: Authドメイン移行（3-4週間）

**目標**: 認証モジュールの移行とFatコントローラーの解消

**課題**: OAuth callbackの95行ビジネスロジックを適切に分離

**タスク**:
1. Domain層の実装
   - エンティティ（User、Device）
   - 値オブジェクト（JWTToken、DeviceId、Email）
   - リポジトリインターフェース
   - ドメインサービス
     - AuthService（既存の整理）
     - DeviceService（新規分離）
     - OAuthService（コールバック処理を移行）
     - TokenService（JWT、ブラックリスト管理）

2. Application層の実装
   - Commands
     - RegisterDevice
     - LoginWithGoogle（Fatコントローラーから移行）
     - RefreshToken
     - Logout
   - Queries
     - GetUserProfile
     - VerifyToken

3. Presentation層の実装
   - ルーター再構築（v1/auth/）
   - OAuthコールバックの薄型化（10行以下に削減）

4. グローバルシングルトンの排除
   - TokenBlacklistManagerを依存注入対応に変更
   - Redis経由でのブラックリスト管理

5. テスト実装

**成果物**:
- Authドメインの完全移行
- OAuth callbackロジックの90%削減
- グローバルシングルトン排除

**リスク**: 高（認証は全機能に影響、慎重なテストが必要）

---

#### 📦 フェーズ4: LLMドメイン移行（3-4週間）

**目標**: LLMモジュールの移行とプロバイダーパターンの改善

**タスク**:
1. Domain層の実装
   - エンティティ（Conversation、Message、ToolExecution）
   - リポジトリインターフェース
   - ドメインサービス
     - ChatOrchestrationService（ChatServiceから強化）
     - ProviderService
     - ToolExecutionService

2. Application層の実装
   - Commands（SendChatMessage、ExecuteTool）
   - Queries（GetProviders、GetModels）

3. Presentation層の実装
   - ルーター再構築（v1/llm/）
   - WebSocketマネージャーの依存注入化

4. Features層の整理
   - RAG機能の統合
   - Toolsの整理

**成果物**:
- LLMドメインの完全移行
- WebSocketのステートレス化（Redis経由）

**リスク**: 中（WebSocket状態管理の変更がリスク）

---

#### 📦 フェーズ5: データベース移行（1-2週間）

**目標**: SQLiteからPostgreSQLへの移行

**タスク**:
1. PostgreSQL環境構築（Docker Compose）
2. 接続プール設定
3. データマイグレーション
4. 性能テスト

**成果物**:
- PostgreSQL稼働
- データ移行完了

**リスク**: 中（データ損失リスク）

---

#### 📦 フェーズ6: テスト・ドキュメント・最適化（継続的）

**目標**: 品質保証とドキュメント整備

**タスク**:
1. テストカバレッジ向上（目標90%）
2. E2Eテストの実装
3. アーキテクチャドキュメント作成
   - ADR（Architecture Decision Records）
   - ドメインモデル図
   - シーケンス図
4. OpenAPI仕様の整備
5. パフォーマンスチューニング

**成果物**:
- 包括的なテストスイート
- 完全なドキュメント
- パフォーマンスベンチマーク

---

## ✅ シンプルチェックリスト

### フェーズ1: 基盤整備
- [ ] 新ディレクトリ構造作成
- [ ] `infrastructure/database/` 実装（PostgreSQL対応）
- [ ] `infrastructure/config/` 実装（統一設定管理）
- [ ] `infrastructure/logging/` 実装
- [ ] `infrastructure/cache/` 実装（Redis）
- [ ] `shared/exceptions/` 実装（基底例外・ハンドラー）
- [ ] `shared/middleware/` 実装
- [ ] Alembicセットアップ
- [ ] 初期マイグレーション作成

### フェーズ2: Billingドメイン移行
- [ ] `domain/billing/entities/` 実装
- [ ] `domain/billing/value_objects/` 実装
- [ ] `domain/billing/repositories/` インターフェース定義
- [ ] `domain/billing/services/` 実装（4サービス分割）
- [ ] `persistence/models/` Billing関連モデル移行
- [ ] `persistence/repositories/` Billing実装
- [ ] `application/billing/commands/` 実装
- [ ] `application/billing/queries/` 実装
- [ ] `presentation/api/v1/billing/` ルーター実装
- [ ] Billingユニットテスト実装
- [ ] Billing統合テスト実装
- [ ] 旧`api/billing_router.py` 削除
- [ ] 旧`billing/` ファイル削除

### フェーズ3: Authドメイン移行
- [ ] `domain/auth/entities/` 実装
- [ ] `domain/auth/value_objects/` 実装
- [ ] `domain/auth/repositories/` インターフェース定義
- [ ] `domain/auth/services/` 実装（4サービス）
- [ ] OAuth callbackロジックをOAuthServiceに移行
- [ ] `persistence/models/` Auth関連モデル移行
- [ ] `persistence/repositories/` Auth実装
- [ ] `application/auth/commands/` 実装（LoginWithGoogle含む）
- [ ] `application/auth/queries/` 実装
- [ ] `presentation/api/v1/auth/` ルーター実装
- [ ] TokenBlacklistManager依存注入化
- [ ] Authユニットテスト実装
- [ ] Auth統合テスト実装（OAuth含む）
- [ ] 旧`auth/` ファイル削除

### フェーズ4: LLMドメイン移行
- [ ] `domain/llm/entities/` 実装
- [ ] `domain/llm/repositories/` インターフェース定義
- [ ] `domain/llm/services/` 実装
- [ ] `domain/llm/providers/` 移行
- [ ] `application/llm/commands/` 実装
- [ ] `application/llm/queries/` 実装
- [ ] `presentation/api/v1/llm/` ルーター実装
- [ ] `presentation/websocket/` 依存注入化
- [ ] WebSocket状態管理Redis移行
- [ ] `features/rag/` 統合
- [ ] `features/tools/` 整理
- [ ] LLMユニットテスト実装
- [ ] LLM統合テスト実装
- [ ] 旧`llm/` ファイル削除

### フェーズ5: データベース移行
- [ ] PostgreSQL環境構築（Docker Compose）
- [ ] 接続プール設定
- [ ] データマイグレーションスクリプト作成
- [ ] ステージング環境でマイグレーション実施
- [ ] データ整合性検証
- [ ] 性能テスト実施
- [ ] 本番マイグレーション実施
- [ ] SQLite関連コード削除

### フェーズ6: テスト・ドキュメント
- [ ] ユニットテストカバレッジ90%達成
- [ ] E2Eテスト実装
- [ ] ADR（Architecture Decision Records）作成
- [ ] ドメインモデル図作成
- [ ] シーケンス図作成
- [ ] OpenAPI仕様更新
- [ ] README更新
- [ ] セットアップガイド作成
- [ ] マイグレーションガイド作成
- [ ] パフォーマンスベンチマーク実施

### 最終確認
- [ ] 全APIエンドポイント動作確認
- [ ] WebSocket動作確認
- [ ] 認証フロー動作確認
- [ ] 課金フロー動作確認
- [ ] LLMチャット動作確認
- [ ] 負荷テスト実施
- [ ] セキュリティ監査
- [ ] 本番デプロイ

---

## 技術的詳細

### 依存性注入の実装例

#### リポジトリパターン

```python
# domain/billing/repositories/balance_repository.py
from abc import ABC, abstractmethod
from typing import Optional
from domain.billing.entities.user_balance import UserBalance

class BalanceRepository(ABC):
    """残高リポジトリインターフェース"""

    @abstractmethod
    async def get_by_user_id(self, user_id: str) -> Optional[UserBalance]:
        """ユーザーIDで残高を取得"""
        pass

    @abstractmethod
    async def save(self, balance: UserBalance) -> UserBalance:
        """残高を保存"""
        pass

    @abstractmethod
    async def update(self, balance: UserBalance) -> UserBalance:
        """残高を更新"""
        pass
```

```python
# persistence/repositories/balance_repository_impl.py
from sqlalchemy.ext.asyncio import AsyncSession
from domain.billing.repositories.balance_repository import BalanceRepository
from domain.billing.entities.user_balance import UserBalance
from persistence.models.token_balance import TokenBalance as TokenBalanceModel

class BalanceRepositoryImpl(BalanceRepository):
    """残高リポジトリ実装"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_user_id(self, user_id: str) -> Optional[UserBalance]:
        # SQLAlchemyでの実装
        result = await self.session.execute(
            select(TokenBalanceModel).where(TokenBalanceModel.user_id == user_id)
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    def _to_entity(self, model: TokenBalanceModel) -> UserBalance:
        """ORMモデルをエンティティに変換"""
        return UserBalance(
            user_id=model.user_id,
            model_id=model.model_id,
            tokens=model.tokens,
            # ...
        )
```

#### ユースケース実装

```python
# application/billing/queries/get_balance.py
from dataclasses import dataclass
from typing import Optional
from domain.billing.repositories.balance_repository import BalanceRepository
from application.billing.dto.billing_dto import BalanceDTO

@dataclass
class GetBalanceQuery:
    """残高照会クエリ"""

    balance_repo: BalanceRepository  # インターフェースに依存

    async def execute(self, user_id: str) -> Optional[BalanceDTO]:
        """クエリ実行"""
        balance = await self.balance_repo.get_by_user_id(user_id)

        if not balance:
            return None

        return BalanceDTO(
            user_id=balance.user_id,
            model_id=balance.model_id,
            tokens=balance.tokens,
            # ...
        )
```

#### FastAPI依存注入

```python
# presentation/api/dependencies.py
from sqlalchemy.ext.asyncio import AsyncSession
from infrastructure.database.connection import get_session
from persistence.repositories.balance_repository_impl import BalanceRepositoryImpl
from application.billing.queries.get_balance import GetBalanceQuery

async def get_balance_query(
    session: AsyncSession = Depends(get_session)
) -> GetBalanceQuery:
    """GetBalanceQueryの依存注入"""
    balance_repo = BalanceRepositoryImpl(session)
    return GetBalanceQuery(balance_repo=balance_repo)
```

```python
# presentation/api/v1/billing/router.py
from fastapi import APIRouter, Depends
from application.billing.queries.get_balance import GetBalanceQuery
from presentation.api.dependencies import get_balance_query
from presentation.api.v1.billing.schemas import BalanceResponse

router = APIRouter()

@router.get("/balance/{user_id}", response_model=BalanceResponse)
async def get_balance(
    user_id: str,
    query: GetBalanceQuery = Depends(get_balance_query)  # 依存注入
):
    """残高取得エンドポイント"""
    result = await query.execute(user_id)

    if not result:
        raise HTTPException(status_code=404, detail="Balance not found")

    return BalanceResponse.from_dto(result)
```

### 設定管理の統一

```python
# infrastructure/config/settings.py
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    """アプリケーション設定（環境変数ベース）"""

    # アプリケーション
    app_name: str = "NoteApp Server"
    debug: bool = False

    # データベース
    database_url: str
    database_pool_size: int = 10
    database_max_overflow: int = 20

    # Redis
    redis_url: str

    # JWT
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60

    # Google OAuth
    google_client_id: str
    google_client_secret: str
    google_redirect_uri: str

    # LLM Providers
    gemini_api_key: str
    openai_api_key: str

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

@lru_cache()
def get_settings() -> Settings:
    """設定シングルトン取得"""
    return Settings()
```

### エラー処理の統一

```python
# shared/exceptions/base.py
from typing import Optional, Dict, Any

class AppException(Exception):
    """アプリケーション基底例外"""

    def __init__(
        self,
        message: str,
        code: str,
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)
```

```python
# shared/exceptions/billing_exceptions.py
from shared.exceptions.base import AppException

class InsufficientBalanceError(AppException):
    """残高不足エラー"""

    def __init__(self, user_id: str, required: int, available: int):
        super().__init__(
            message=f"Insufficient balance for user {user_id}",
            code="BILLING_INSUFFICIENT_BALANCE",
            status_code=400,
            details={
                "user_id": user_id,
                "required": required,
                "available": available
            }
        )
```

```python
# shared/exceptions/handlers.py
from fastapi import Request, status
from fastapi.responses import JSONResponse
from shared.exceptions.base import AppException

async def app_exception_handler(request: Request, exc: AppException):
    """アプリケーション例外ハンドラー"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details
            }
        }
    )

# main.py での登録
app.add_exception_handler(AppException, app_exception_handler)
```

---

## リスクと対策

### リスク1: APIの後方互換性破壊

**影響度**: 高
**発生確率**: 中

**リスク内容**:
- 既存のモバイルアプリがAPIエンドポイントに依存
- レスポンス形式の変更でクライアント側エラー

**対策**:
1. APIバージョニング（`/api/v1/`）の導入
2. 旧エンドポイントのプロキシ実装（一時的）
3. レスポンススキーマの互換性テスト
4. 段階的な廃止（deprecation警告 → 6ヶ月後削除）

---

### リスク2: データマイグレーション失敗

**影響度**: 致命的
**発生確率**: 低

**リスク内容**:
- SQLite → PostgreSQL移行時のデータ損失
- データ型の非互換性

**対策**:
1. 本番前にステージング環境で完全テスト
2. バックアップの複数世代保持
3. ロールバック手順の文書化
4. ダウンタイム最小化（Blue-Greenデプロイ）
5. データ整合性検証スクリプト

---

### リスク3: 認証システムの障害

**影響度**: 致命的
**発生確率**: 中

**リスク内容**:
- OAuth処理の移行ミスでログイン不可
- 既存トークンの無効化

**対策**:
1. 認証フローの包括的テスト
2. 旧システムとの並行稼働期間設定
3. 緊急ロールバック手順
4. カナリアリリース（一部ユーザーのみ新システム）

---

### リスク4: パフォーマンス劣化

**影響度**: 中
**発生確率**: 中

**リスク内容**:
- レイヤー追加によるオーバーヘッド
- N+1クエリ問題の発生

**対策**:
1. 移行前のベンチマーク取得
2. 各フェーズでのパフォーマンステスト
3. SQLクエリの最適化
4. Redisキャッシュの活用
5. データベースインデックスの最適化

---

### リスク5: 開発期間の超過

**影響度**: 中
**発生確率**: 高

**リスク内容**:
- 想定外の複雑性の発見
- チームメンバーのスキル不足

**対策**:
1. 各フェーズの完了基準を明確化
2. 週次での進捗レビュー
3. 困難なタスクの早期特定
4. 必要に応じたスコープ調整
5. ペアプログラミング・コードレビュー

---

## 成功指標

### 技術指標

| 指標 | 現状 | 目標 | 測定方法 |
|------|------|------|----------|
| テストカバレッジ | 30% | 90% | pytest-cov |
| API応答時間（P95） | 300ms | 200ms | 負荷テスト |
| エラー率 | 2% | <0.5% | ログ分析 |
| 循環的複雑度 | 15 | <10 | radon |
| コード重複率 | 20% | <5% | pylint |

### ビジネス指標

| 指標 | 現状 | 目標 |
|------|------|------|
| 新機能開発速度 | 2週間/機能 | 1週間/機能 |
| バグ修正時間 | 3日 | 1日 |
| 本番障害件数 | 2件/月 | <0.5件/月 |
| デプロイ頻度 | 週1回 | 日1回 |

### 保守性指標

- [ ] 新規開発者のオンボーディング時間: 3日 → 1日
- [ ] コードレビュー時間: 2時間 → 30分
- [ ] ドキュメント整備率: 100%（全モジュール）

---

## 参考資料

### アーキテクチャパターン

1. **Clean Architecture**
   - [The Clean Architecture (Robert C. Martin)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

2. **Domain-Driven Design (DDD)**
   - Eric Evans "Domain-Driven Design"

3. **CQRS Pattern**
   - [CQRS (Martin Fowler)](https://martinfowler.com/bliki/CQRS.html)

4. **Repository Pattern**
   - [Repository Pattern (Martin Fowler)](https://martinfowler.com/eaaCatalog/repository.html)

### ツール・ライブラリ

- **FastAPI**: https://fastapi.tiangolo.com/
- **SQLAlchemy**: https://www.sqlalchemy.org/
- **Alembic**: https://alembic.sqlalchemy.org/
- **Pydantic**: https://docs.pydantic.dev/
- **pytest**: https://docs.pytest.org/

### 内部ドキュメント

- 現状分析レポート（本文書の調査結果）
- 既存API仕様書
- データベーススキーマ図

---

## 変更履歴

| 日付 | バージョン | 変更内容 | 作成者 |
|------|-----------|---------|--------|
| 2025-11-19 | 1.0 | 初版作成 | - |

---

## 承認

| 役割 | 氏名 | 承認日 | 署名 |
|------|------|--------|------|
| プロジェクトマネージャー | | | |
| テックリード | | | |
| アーキテクト | | | |

---

**次のアクション**: フェーズ1の開始承認を得る
