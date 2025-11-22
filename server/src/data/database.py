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
