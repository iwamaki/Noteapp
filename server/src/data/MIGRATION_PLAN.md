# データ基盤移行計画

**作成日**: 2025-11-22
**優先度**: CRITICAL
**推定作業期間**: 2-3日

---

## 📊 現状分析

### 現在のデータ管理状況

```
server/
├── billing.db                                    # SQLite (本番環境非推奨)
├── src/
│   ├── billing/
│   │   └── infrastructure/
│   │       └── persistence/
│   │           └── database.py                   # SQLite接続
│   └── data/
│       └── vector_stores/                        # ベクトルストア（後回し）
└── new/
    └── alembic/                                  # 準備済みだが未使用
```

### 現在のテーブル構成

**Billingデータベース** (`billing.db`):
- `users` - ユーザー情報（DeviceID/Google OAuth）
- `device_auth` - デバイス認証
- `credits` - 未配分クレジット
- `token_balances` - モデル別トークン残高
- `token_pricing` - 価格マスター
- `transactions` - 取引履歴

### 問題点

1. **SQLiteの制約**
   - 同時書き込み制限（単一ライターロック）
   - 水平スケーリング不可
   - 本番環境非推奨

2. **データ層の分散**
   - `billing.db` がルートディレクトリに配置
   - データ管理ロジックがbillingモジュールに偏在
   - 他モジュール（auth等）でのDB利用が困難

3. **マイグレーション管理の欠如**
   - Alembicが準備されているが未使用
   - スキーマ変更が `Base.metadata.create_all()` のみ
   - バージョン管理・ロールバック不可

---

## 🎯 移行の目的

1. **PostgreSQLへの移行**
   - 本番環境対応
   - 同時書き込み対応
   - スケーラビリティ確保

2. **データ基盤の一元化**
   - `src/data/` 配下に統合
   - 全モジュールからの共通利用
   - 保守性・拡張性の向上

3. **マイグレーション管理の導入**
   - Alembicによるスキーマバージョン管理
   - ロールバック機能
   - 段階的なデータ構造変更

---

## 🏗️ 新しいデータ基盤構造

### ディレクトリ構成

```
server/src/data/
├── __init__.py                        # データ層のエクスポート
├── database.py                        # DB接続・セッション管理
├── config.py                          # データベース設定
├── models/                            # SQLAlchemyモデル
│   ├── __init__.py                   # モデルのエクスポート
│   ├── base.py                       # declarative_base
│   ├── user.py                       # User, DeviceAuth
│   ├── billing.py                    # Credit, TokenBalance, TokenPricing, Transaction
│   └── README.md                     # モデル設計ドキュメント
├── repositories/                      # リポジトリパターン（将来的に）
│   ├── __init__.py
│   └── base_repository.py
└── MIGRATION_PLAN.md                 # 本ドキュメント
```

### 移行後のAlembic配置

```
server/
├── alembic/                          # server/new/alembic から移動
│   ├── env.py                       # 環境設定（更新必要）
│   ├── script.py.mako
│   └── versions/                    # マイグレーションファイル
│       └── 001_initial_migration.py
├── alembic.ini                      # Alembic設定
└── docker-compose.yml               # PostgreSQL開発環境
```

---

## 📋 段階的作業計画

### Phase 1: PostgreSQL環境構築

#### 1.1 Docker Compose設定作成

**ファイル**: `server/docker-compose.yml` (新規作成)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: noteapp-postgres-dev
    environment:
      POSTGRES_USER: noteapp_user
      POSTGRES_PASSWORD: noteapp_dev_password
      POSTGRES_DB: noteapp_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U noteapp_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: noteapp-redis-dev
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

#### 1.2 環境変数設定

**ファイル**: `server/.env.development` (更新)

```bash
# Database (PostgreSQL)
DATABASE_URL=postgresql://noteapp_user:noteapp_dev_password@localhost:5432/noteapp_dev
DATABASE_ECHO=false
DATABASE_POOL_SIZE=10
DATABASE_MAX_OVERFLOW=20
DATABASE_POOL_TIMEOUT=30
DATABASE_POOL_RECYCLE=3600

# Redis
REDIS_URL=redis://localhost:6379/0
```

#### 1.3 依存関係追加

**ファイル**: `server/requirements.txt` (更新)

```txt
# 追加
sqlalchemy==2.0.23
alembic==1.13.1
psycopg2-binary==2.9.9
```

**実行**:
```bash
cd server
pip install sqlalchemy alembic psycopg2-binary
```

---

### Phase 2: データ基盤構築 (`src/data/`)

#### 2.1 基本ファイル作成

**2.1.1** `src/data/config.py` (新規作成)

```python
"""データベース設定"""
from pydantic_settings import BaseSettings
from functools import lru_cache

class DatabaseSettings(BaseSettings):
    """データベース設定"""
    database_url: str
    database_echo: bool = False
    database_pool_size: int = 10
    database_max_overflow: int = 20
    database_pool_timeout: int = 30
    database_pool_recycle: int = 3600

    class Config:
        env_file = ".env"
        case_sensitive = False

@lru_cache()
def get_database_settings() -> DatabaseSettings:
    return DatabaseSettings()
```

**2.1.2** `src/data/database.py` (新規作成)

```python
"""データベース接続とセッション管理"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .config import get_database_settings

settings = get_database_settings()

# PostgreSQL用エンジン設定
engine = create_engine(
    settings.database_url,
    echo=settings.database_echo,
    pool_size=settings.database_pool_size,
    max_overflow=settings.database_max_overflow,
    pool_timeout=settings.database_pool_timeout,
    pool_recycle=settings.database_pool_recycle,
    pool_pre_ping=True,  # 接続確認
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """DBセッション取得（FastAPI Depends用）"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**2.1.3** `src/data/models/base.py` (新規作成)

```python
"""SQLAlchemy Base定義"""
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()
```

#### 2.2 モデル移行

既存の `src/billing/domain/entities/` から移行:

- `user.py` → `src/data/models/user.py`
- `device_auth.py` → `src/data/models/user.py` (同一ファイルに統合)
- `credit.py` → `src/data/models/billing.py`
- `token_balance.py` → `src/data/models/billing.py`
- `token_pricing.py` → `src/data/models/billing.py`
- `transaction.py` → `src/data/models/billing.py`

**注意**: インポートパスを更新

#### 2.3 `src/data/__init__.py` (新規作成)

```python
"""データ層エクスポート"""
from .database import engine, SessionLocal, get_db
from .models.base import Base
from .models.user import User, DeviceAuth
from .models.billing import Credit, TokenBalance, TokenPricing, Transaction

__all__ = [
    'engine',
    'SessionLocal',
    'get_db',
    'Base',
    'User',
    'DeviceAuth',
    'Credit',
    'TokenBalance',
    'TokenPricing',
    'Transaction',
]
```

---

### Phase 3: Alembic設定

#### 3.1 Alembicディレクトリ移動

```bash
cd server
mv new/alembic ./alembic
mv new/alembic.ini ./alembic.ini
```

#### 3.2 `alembic/env.py` 更新

```python
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
import os
import sys

# パス設定
sys.path.insert(0, os.path.realpath(os.path.join(os.path.dirname(__file__), '..')))

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# メタデータのインポート
from src.data import Base
from src.data.models import user, billing  # モデルを明示的にインポート

target_metadata = Base.metadata

# DATABASE_URLを動的に設定
from src.data.config import get_database_settings
settings = get_database_settings()
config.set_main_option("sqlalchemy.url", settings.database_url)

def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

#### 3.3 初期マイグレーション生成

```bash
cd server
alembic revision --autogenerate -m "Initial migration - PostgreSQL"
```

#### 3.4 マイグレーション適用

```bash
# PostgreSQL起動
docker-compose up -d postgres

# マイグレーション適用
alembic upgrade head
```

---

### Phase 4: 既存コードの更新

#### 4.1 `src/billing/` モジュール更新

**変更箇所**:
- `src/billing/application/services/billing_service.py`
- `src/billing/presentation/router.py`
- その他、エンティティをインポートしている全ファイル

**変更内容**:
```python
# Before
from src.billing.domain.entities import User, Credit, TokenBalance

# After
from src.data.models import User, Credit, TokenBalance
```

#### 4.2 `src/main.py` 更新

```python
# Before
from src.billing import init_db

# After
# init_db削除（Alembicが管理するため）
# 必要に応じてstartupイベントでDB接続確認のみ
```

#### 4.3 依存性注入の更新

```python
# Before
from src.billing.infrastructure.persistence.database import get_db

# After
from src.data import get_db
```

---

### Phase 5: 旧コードの削除

以下を削除:

```
server/
├── billing.db                                    # 削除
├── src/billing/
│   ├── domain/entities/                          # 削除（src/data/modelsに移行済み）
│   └── infrastructure/
│       └── persistence/
│           ├── database.py                       # 削除
│           └── __init__.py                       # 更新（get_dbインポート先変更）
└── new/                                          # 削除（alembicを移動済み）
```

---

## ✅ チェックリスト

### Phase 1: PostgreSQL環境構築
- [ ] `docker-compose.yml` 作成
- [ ] `.env.development` 更新
- [ ] `requirements.txt` 更新
- [ ] PostgreSQLコンテナ起動確認
- [ ] 接続テスト成功

### Phase 2: データ基盤構築
- [ ] `src/data/config.py` 作成
- [ ] `src/data/database.py` 作成
- [ ] `src/data/models/base.py` 作成
- [ ] `src/data/models/user.py` 作成
- [ ] `src/data/models/billing.py` 作成
- [ ] `src/data/__init__.py` 作成

### Phase 3: Alembic設定
- [ ] Alembicディレクトリ移動
- [ ] `alembic/env.py` 更新
- [ ] 初期マイグレーション生成
- [ ] マイグレーション適用確認

### Phase 4: 既存コード更新
- [ ] `billing_service.py` インポート更新
- [ ] `router.py` インポート更新
- [ ] `main.py` 更新
- [ ] その他の関連ファイル更新

### Phase 5: 旧コード削除
- [ ] `billing.db` 削除
- [ ] `src/billing/domain/entities/` 削除
- [ ] `src/billing/infrastructure/persistence/database.py` 削除
- [ ] `server/new/` 削除

### Phase 6: テスト
- [ ] ユニットテスト実行
- [ ] API動作確認
- [ ] マイグレーション往復テスト（upgrade/downgrade）

---

## 🔧 コマンドリファレンス

### Docker Compose

```bash
# 起動
docker-compose up -d

# 停止
docker-compose down

# ログ確認
docker-compose logs -f postgres

# データ削除して再起動
docker-compose down -v
docker-compose up -d
```

### Alembic

```bash
# 現在のバージョン確認
alembic current

# マイグレーション生成
alembic revision --autogenerate -m "Description"

# マイグレーション適用
alembic upgrade head

# ロールバック（1つ前）
alembic downgrade -1

# 履歴確認
alembic history
```

### PostgreSQL直接操作

```bash
# psqlで接続
docker exec -it noteapp-postgres-dev psql -U noteapp_user -d noteapp_dev

# テーブル一覧
\dt

# スキーマ確認
\d users
```

---

## 📝 注意事項

1. **データ移行不要**
   - まだ本番ユーザーがいないため、既存の `billing.db` データは破棄可能
   - 必要に応じて初期データのみ再投入

2. **段階的な作業**
   - Phase 1-3を先に完了させる
   - Phase 4-5は動作確認しながら慎重に

3. **コミットのタイミング**
   - 各Phaseごとにコミット推奨
   - Phase 3完了時点で一度動作確認

4. **ロールバック対策**
   - 作業前にブランチ作成
   - 各Phase完了時点でコミット

---

## 🚀 次のアクション

1. Phase 1から順番に実施
2. 各Phaseごとに動作確認
3. 問題があれば本ドキュメントを更新

**開始コマンド**:
```bash
cd server
# Phase 1開始
touch docker-compose.yml
```

---

**最終更新**: 2025-11-22
**ステータス**: 計画策定完了 → 実装待ち
