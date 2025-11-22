# データベース移行計画

**優先度**: 🔴 CRITICAL
**推定作業期間**: 1週間
**対象**: SQLite → PostgreSQL + Alembic導入

## 📊 現状の問題

### 現在のDB構成

**データベース**: SQLite 3
**ファイル**: `server/src/billing/infrastructure/persistence/database.py:16`

```python
DATABASE_URL = "sqlite:///./billing.db"

# 開発用の初期化方法
Base.metadata.create_all(bind=engine)
```

### 🚨 SQLiteの問題点

#### 1. 同時書き込み制限

**問題**:
- SQLiteは単一ライターロック
- 同時に1つの書き込みトランザクションのみ
- 他の書き込みは待機（ロック待ち）

**影響**:
```python
# ユーザーAがトークン購入中
# → データベースがロック

# ユーザーBもトークン購入しようとする
# → "database is locked" エラー
```

#### 2. スケーラビリティの欠如

**問題**:
- 水平スケーリング不可能
- 複数サーバーインスタンス非対応
- ファイルベースの制約

#### 3. データ損失リスク

**問題**:
- ファイルシステムの障害 = データ全損失
- バックアップが手動
- PITR（Point-in-Time Recovery）不可

#### 4. 本番環境での推奨なし

**公式ドキュメント**:
> "SQLite is not recommended for production use in web applications with concurrent writes."

---

## 🎯 移行目標

### Phase 1: PostgreSQL移行
- SQLite → PostgreSQL
- 接続プーリング設定
- 環境別DB設定

### Phase 2: Alembic導入
- マイグレーションフレームワーク
- スキーマバージョン管理
- ロールバック機能

### Phase 3: データ移行
- 既存データの移行（必要に応じて）
- 整合性チェック

---

## 🐘 PostgreSQL環境構築

### 1. ローカル開発環境

#### Docker Composeによる構築

**ファイル**: `server/docker-compose.yml`（新規作成）

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
      - ./init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
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

#### 初期化スクリプト

**ファイル**: `server/init-db.sql`（新規作成）

```sql
-- Extension for UUID support
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set timezone
SET timezone = 'UTC';

-- Create default user (will be managed by Alembic later)
-- Tables will be created by Alembic migrations
```

#### 起動・停止

```bash
# 起動
cd server
docker-compose up -d

# 停止
docker-compose down

# ログ確認
docker-compose logs -f postgres

# コンテナ再構築
docker-compose down -v  # データも削除
docker-compose up -d
```

---

### 2. 本番環境（GCP Cloud SQL）

#### Cloud SQL インスタンス作成

```bash
# GCP プロジェクト設定
gcloud config set project YOUR_PROJECT_ID

# PostgreSQL インスタンス作成
gcloud sql instances create noteapp-prod \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \  # 本番は db-custom-2-7680 等に変更
  --region=asia-northeast1 \
  --storage-type=SSD \
  --storage-size=10GB \
  --storage-auto-increase \
  --backup-start-time=03:00 \
  --enable-bin-log \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=4

# データベース作成
gcloud sql databases create noteapp_prod \
  --instance=noteapp-prod

# ユーザー作成
gcloud sql users create noteapp_user \
  --instance=noteapp-prod \
  --password=SECURE_PASSWORD_HERE

# 接続情報確認
gcloud sql instances describe noteapp-prod
```

#### Cloud SQL Proxy設定

```bash
# Cloud SQL Proxyのダウンロード
wget https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64 -O cloud_sql_proxy
chmod +x cloud_sql_proxy

# 接続（ローカル開発時）
./cloud_sql_proxy -instances=PROJECT_ID:REGION:noteapp-prod=tcp:5432
```

---

## 🔧 Alembic導入

### 1. インストール

```bash
cd server
pip install alembic psycopg2-binary
```

**requirements.txt に追加**:
```
alembic==1.13.1
psycopg2-binary==2.9.9
```

---

### 2. Alembic初期化

```bash
cd server
alembic init alembic
```

**生成されるファイル**:
```
server/
├── alembic/
│   ├── env.py               # Alembic環境設定
│   ├── script.py.mako       # マイグレーションテンプレート
│   └── versions/            # マイグレーションファイル
└── alembic.ini              # Alembic設定ファイル
```

---

### 3. Alembic設定

#### alembic.ini 編集

**ファイル**: `server/alembic.ini`

```ini
[alembic]
script_location = alembic
prepend_sys_path = .

# ⚠️ コメントアウト（環境変数から読み込む）
# sqlalchemy.url = driver://user:pass@localhost/dbname

file_template = %%(year)d%%(month).2d%%(day).2d_%%(hour).2d%%(minute).2d_%%(rev)s_%%(slug)s

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = INFO
handlers = console

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
```

#### env.py 編集

**ファイル**: `server/alembic/env.py`

```python
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
import os
import sys

# パス設定
sys.path.insert(0, os.path.realpath(os.path.join(os.path.dirname(__file__), '..')))

# Alembic Config
config = context.config

# ロギング設定
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# メタデータのインポート
from src.billing.infrastructure.persistence.database import Base
from src.billing.domain.entities.user import User
from src.billing.domain.entities.device_auth import DeviceAuth
from src.billing.domain.entities.credit import Credit
from src.billing.domain.entities.token_balance import TokenBalance
from src.billing.domain.entities.token_pricing import TokenPricing
from src.billing.domain.entities.transaction import Transaction

target_metadata = Base.metadata

# 環境変数からDATABASE_URLを取得
def get_url():
    from src.core.config import get_settings
    settings = get_settings()
    return settings.database_url

# DATABASE_URLを動的に設定
config.set_main_option("sqlalchemy.url", get_url())

def run_migrations_offline() -> None:
    """Offline mode: SQLファイル生成"""
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
    """Online mode: データベースに直接適用"""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,  # カラムタイプ変更検出
            compare_server_default=True,  # デフォルト値変更検出
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

---

### 4. 初期マイグレーション作成

```bash
cd server

# 現在のスキーマから初期マイグレーション生成
alembic revision --autogenerate -m "Initial migration"
```

**生成されるファイル**: `server/alembic/versions/20251121_1430_abc123_initial_migration.py`

**内容例**:
```python
"""Initial migration

Revision ID: abc123def456
Revises:
Create Date: 2025-11-21 14:30:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'abc123def456'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Users table
    op.create_table(
        'users',
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('google_id', sa.String(), nullable=True),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('display_name', sa.String(), nullable=True),
        sa.Column('profile_picture_url', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('user_id'),
        sa.UniqueConstraint('google_id')
    )
    op.create_index('ix_users_email', 'users', ['email'])

    # Device Auth table
    op.create_table(
        'device_auth',
        sa.Column('device_id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('device_name', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('last_used_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('device_id')
    )

    # Credits table
    op.create_table(
        'credits',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('credits', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )

    # Token Balances table
    op.create_table(
        'token_balances',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('model_id', sa.String(), nullable=False),
        sa.Column('allocated_tokens', sa.BigInteger(), nullable=False),
        sa.Column('consumed_tokens', sa.BigInteger(), nullable=False, default=0),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'model_id')
    )

    # Token Pricing table
    op.create_table(
        'token_pricing',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('model_id', sa.String(), nullable=False),
        sa.Column('model_name', sa.String(), nullable=False),
        sa.Column('credit_per_token', sa.Float(), nullable=False),
        sa.Column('capacity_limit', sa.BigInteger(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('model_id')
    )

    # Transactions table
    op.create_table(
        'transactions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('transaction_id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('amount', sa.Integer(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('metadata', postgresql.JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('transaction_id')
    )
    op.create_index('ix_transactions_user_id', 'transactions', ['user_id'])
    op.create_index('ix_transactions_created_at', 'transactions', ['created_at'])

def downgrade() -> None:
    op.drop_index('ix_transactions_created_at', 'transactions')
    op.drop_index('ix_transactions_user_id', 'transactions')
    op.drop_table('transactions')
    op.drop_table('token_pricing')
    op.drop_table('token_balances')
    op.drop_table('credits')
    op.drop_table('device_auth')
    op.drop_index('ix_users_email', 'users')
    op.drop_table('users')
```

---

### 5. マイグレーション適用

```bash
# 現在のバージョン確認
alembic current

# 保留中のマイグレーション確認
alembic show

# マイグレーション適用
alembic upgrade head

# 履歴確認
alembic history

# ロールバック（1つ前）
alembic downgrade -1

# 特定バージョンへロールバック
alembic downgrade abc123def456
```

---

## 🔄 データベース設定の更新

### 1. 環境変数の更新

**ファイル**: `server/.env.development`

```bash
# Before (SQLite)
# DATABASE_URL=sqlite:///./billing.db

# After (PostgreSQL)
DATABASE_URL=postgresql://noteapp_user:noteapp_dev_password@localhost:5432/noteapp_dev
DATABASE_ECHO=false
DATABASE_POOL_SIZE=10
DATABASE_MAX_OVERFLOW=20
DATABASE_POOL_TIMEOUT=30
DATABASE_POOL_RECYCLE=3600
```

**ファイル**: `server/.env.production`（新規作成）

```bash
# Production PostgreSQL (Cloud SQL)
DATABASE_URL=postgresql://noteapp_user:${DB_PASSWORD}@/noteapp_prod?host=/cloudsql/PROJECT_ID:REGION:noteapp-prod
DATABASE_ECHO=false
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=40
DATABASE_POOL_TIMEOUT=30
DATABASE_POOL_RECYCLE=1800
```

---

### 2. database.py の更新

**ファイル**: `server/src/billing/infrastructure/persistence/database.py`

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from src.core.config import get_settings

settings = get_settings()

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
Base = declarative_base()

def get_db():
    """データベースセッション取得（依存性注入用）"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ⚠️ 削除：Alembicが管理するため不要
# Base.metadata.create_all(bind=engine)
```

---

### 3. config.py の更新

**ファイル**: `server/src/core/config.py`

```python
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # ... (既存の設定)

    # Database Settings
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
def get_settings() -> Settings:
    return Settings()
```

---

## 📦 データ移行（必要に応じて）

### SQLiteからPostgreSQLへのデータ移行

#### 方法1: SQLAlchemyスクリプト

**ファイル**: `server/scripts/migrate_data.py`（新規作成）

```python
"""SQLite → PostgreSQL データ移行スクリプト"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# SQLite接続
sqlite_url = "sqlite:///./billing.db"
sqlite_engine = create_engine(sqlite_url)
SQLiteSession = sessionmaker(bind=sqlite_engine)

# PostgreSQL接続
postgres_url = os.getenv("DATABASE_URL")
postgres_engine = create_engine(postgres_url)
PostgresSession = sessionmaker(bind=postgres_engine)

def migrate_data():
    """データ移行実行"""
    sqlite_session = SQLiteSession()
    postgres_session = PostgresSession()

    try:
        # Usersテーブル移行
        from src.billing.domain.entities.user import User
        users = sqlite_session.query(User).all()
        for user in users:
            postgres_session.merge(user)

        # Device Authテーブル移行
        from src.billing.domain.entities.device_auth import DeviceAuth
        devices = sqlite_session.query(DeviceAuth).all()
        for device in devices:
            postgres_session.merge(device)

        # Creditsテーブル移行
        from src.billing.domain.entities.credit import Credit
        credits = sqlite_session.query(Credit).all()
        for credit in credits:
            postgres_session.merge(credit)

        # Token Balancesテーブル移行
        from src.billing.domain.entities.token_balance import TokenBalance
        balances = sqlite_session.query(TokenBalance).all()
        for balance in balances:
            postgres_session.merge(balance)

        # Transactionsテーブル移行
        from src.billing.domain.entities.transaction import Transaction
        transactions = sqlite_session.query(Transaction).all()
        for transaction in transactions:
            postgres_session.merge(transaction)

        postgres_session.commit()
        print("✅ Data migration completed successfully")

    except Exception as e:
        postgres_session.rollback()
        print(f"❌ Migration failed: {e}")
        raise
    finally:
        sqlite_session.close()
        postgres_session.close()

if __name__ == "__main__":
    migrate_data()
```

**実行**:
```bash
cd server
python scripts/migrate_data.py
```

#### 方法2: pgloader（高速）

**インストール**:
```bash
# Ubuntu/Debian
sudo apt-get install pgloader

# macOS
brew install pgloader
```

**設定ファイル**: `server/migration.load`（新規作成）

```
LOAD DATABASE
     FROM sqlite:///./billing.db
     INTO postgresql://noteapp_user:password@localhost:5432/noteapp_dev

WITH include drop, create tables, create indexes, reset sequences

SET work_mem to '16MB', maintenance_work_mem to '512 MB';
```

**実行**:
```bash
pgloader migration.load
```

---

## 🔍 マイグレーション後の検証

### 1. データ整合性チェック

**ファイル**: `server/scripts/verify_migration.py`（新規作成）

```python
"""マイグレーション検証スクリプト"""
from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker
from src.billing.domain.entities.user import User
from src.billing.domain.entities.credit import Credit
import os

def verify_migration():
    """データ整合性検証"""
    engine = create_engine(os.getenv("DATABASE_URL"))
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        # レコード数確認
        user_count = session.query(func.count(User.user_id)).scalar()
        credit_count = session.query(func.count(Credit.id)).scalar()

        print(f"✅ Users: {user_count}")
        print(f"✅ Credits: {credit_count}")

        # 外部キー整合性
        orphaned_credits = session.query(Credit).outerjoin(User).filter(
            User.user_id == None
        ).count()

        if orphaned_credits > 0:
            print(f"⚠️ Orphaned credits found: {orphaned_credits}")
        else:
            print("✅ Foreign key integrity: OK")

        # NULL値チェック
        null_users = session.query(User).filter(User.user_id == None).count()
        if null_users > 0:
            print(f"⚠️ NULL user_ids found: {null_users}")
        else:
            print("✅ No NULL user_ids")

        print("\n✅ Migration verification completed")

    finally:
        session.close()

if __name__ == "__main__":
    verify_migration()
```

---

### 2. パフォーマンステスト

```python
"""パフォーマンステスト"""
import time
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

def performance_test():
    engine = create_engine(os.getenv("DATABASE_URL"))
    Session = sessionmaker(bind=engine)

    # 同時書き込みテスト
    import concurrent.futures

    def write_test(i):
        session = Session()
        try:
            from src.billing.domain.entities.transaction import Transaction
            from datetime import datetime

            tx = Transaction(
                transaction_id=f"test-{i}",
                user_id="test-user",
                type="test",
                amount=100,
                created_at=datetime.utcnow()
            )
            session.add(tx)
            session.commit()
            return True
        except Exception as e:
            session.rollback()
            return False
        finally:
            session.close()

    start_time = time.time()

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        results = list(executor.map(write_test, range(100)))

    elapsed = time.time() - start_time

    success_count = sum(results)
    print(f"✅ Completed: {success_count}/100 in {elapsed:.2f}s")
    print(f"✅ Throughput: {success_count/elapsed:.2f} writes/sec")

if __name__ == "__main__":
    performance_test()
```

---

## 🚀 デプロイフロー

### 開発環境

```bash
# 1. Docker Compose起動
docker-compose up -d

# 2. マイグレーション適用
alembic upgrade head

# 3. 初期データ投入（必要に応じて）
python scripts/seed_data.py

# 4. アプリケーション起動
uvicorn src.main:app --reload
```

### 本番環境

```bash
# 1. Cloud SQLへ接続確認
gcloud sql connect noteapp-prod --user=noteapp_user

# 2. マイグレーション適用（バックアップ後）
alembic upgrade head

# 3. 検証
python scripts/verify_migration.py

# 4. アプリケーションデプロイ
# (Cloud Run等)
```

---

## 📋 チェックリスト

### Phase 1: PostgreSQL環境構築

- [ ] Docker Compose設定作成
- [ ] PostgreSQLコンテナ起動確認
- [ ] 接続テスト成功
- [ ] Cloud SQLインスタンス作成（本番）
- [ ] Cloud SQL Proxyセットアップ

### Phase 2: Alembic導入

- [ ] Alembicインストール
- [ ] Alembic初期化
- [ ] env.py設定
- [ ] 初期マイグレーション生成
- [ ] マイグレーション適用テスト

### Phase 3: コード更新

- [ ] database.py更新
- [ ] config.py更新
- [ ] 環境変数更新
- [ ] create_all削除確認

### Phase 4: データ移行（必要時）

- [ ] 移行スクリプト作成
- [ ] テスト環境で移行実行
- [ ] データ整合性検証
- [ ] 本番データ移行

### Phase 5: 検証

- [ ] ユニットテスト合格
- [ ] 統合テスト合格
- [ ] パフォーマンステスト合格
- [ ] 同時書き込みテスト合格

---

## 🛠️ トラブルシューティング

### 問題1: マイグレーションの競合

**エラー**:
```
alembic.util.exc.CommandError: Multiple head revisions are present
```

**解決**:
```bash
# マージマイグレーション作成
alembic merge heads -m "Merge multiple heads"
alembic upgrade head
```

### 問題2: 接続プールエラー

**エラー**:
```
TimeoutError: QueuePool limit of size 10 overflow 20 reached
```

**解決**:
```bash
# 環境変数で調整
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=40
```

### 問題3: Cloud SQL接続エラー

**エラー**:
```
FATAL: sorry, too many clients already
```

**解決**:
- Cloud SQLインスタンスのmax_connectionsを増やす
- 接続プールサイズを調整
- Connection leakの確認

---

## 📊 移行完了の成功指標

- ✅ 全マイグレーション適用完了
- ✅ データ整合性100%
- ✅ 全テスト合格
- ✅ パフォーマンステスト合格（SQLiteより高速）
- ✅ 同時書き込み100件成功
- ✅ 本番環境デプロイ成功

---

**作成日**: 2025-11-21
**推定完了**: Phase 1-3で5日、Phase 4-5で2日
