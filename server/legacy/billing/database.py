# @file database.py
# @summary データベース接続とセットアップ
# @responsibility SQLiteデータベースの初期化、セッション管理、初期データ投入

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.core.logger import logger

from .config import DEFAULT_USER_ID, INITIAL_PRICING_DATA
from .models import Base, Credit, TokenPricing, User

# データベースURL（SQLite）
DATABASE_URL = "sqlite:///./billing.db"

# エンジン作成
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # SQLite用設定
    echo=False  # SQLクエリのログ出力（デバッグ時はTrue）
)

# セッションファクトリー
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """データベースとテーブルを初期化

    アプリケーション起動時に一度だけ呼び出される。
    - テーブルが存在しない場合は作成
    - デフォルトユーザーと価格マスターデータを投入
    """
    logger.info("Initializing billing database...")

    # テーブル作成
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created")

    # 初期データ投入
    _insert_initial_data()


def _insert_initial_data():
    """初期データを投入

    - デフォルトユーザー（default_user）
    - 未配分クレジット（0円）
    - トークン価格マスターデータ
    """
    db = SessionLocal()
    try:
        # デフォルトユーザーが存在しない場合は作成
        existing_user = db.query(User).filter_by(user_id=DEFAULT_USER_ID).first()
        if not existing_user:
            default_user = User(user_id=DEFAULT_USER_ID)
            db.add(default_user)
            logger.info(f"Created default user: {DEFAULT_USER_ID}")

            # デフォルトユーザーのクレジットレコード作成
            default_credit = Credit(user_id=DEFAULT_USER_ID, credits=0)
            db.add(default_credit)
            logger.info(f"Created credit record for {DEFAULT_USER_ID}")

        # 価格マスターデータを投入（存在しない場合のみ）
        for pricing_data in INITIAL_PRICING_DATA:
            existing_pricing = db.query(TokenPricing).filter_by(
                model_id=pricing_data["model_id"]
            ).first()

            if not existing_pricing:
                pricing = TokenPricing(**pricing_data)
                db.add(pricing)
                logger.info(f"Created pricing for {pricing_data['model_id']}")

        db.commit()
        logger.info("Initial data inserted successfully")

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to insert initial data: {e}")
        raise
    finally:
        db.close()


def get_db():
    """DBセッションを取得（FastAPI Depends用）

    FastAPIのDependencyとして使用される。
    リクエストごとに新しいセッションを作成し、
    リクエスト終了時に自動的にクローズする。

    Yields:
        Session: SQLAlchemyセッション
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
