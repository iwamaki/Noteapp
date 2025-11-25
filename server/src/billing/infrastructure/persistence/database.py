# @file database.py
# @summary データベース接続とセットアップ
# @responsibility データベースの初期化、初期データ投入

from src.core.logger import logger
from src.data import SessionLocal
from src.data.models import Credit, TokenPricing, User

from ..config.constants import DEFAULT_USER_ID, INITIAL_PRICING_DATA


def init_db():
    """データベース初期データを投入

    アプリケーション起動時に一度だけ呼び出される。
    - デフォルトユーザーと価格マスターデータを投入

    Note: テーブル作成はAlembicマイグレーションで管理
    """
    logger.info("Initializing billing database...", extra={"category": "billing"})

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
            db.commit()  # ユーザーを先にコミット
            logger.info(f"Created default user: {DEFAULT_USER_ID}", extra={"category": "billing"})

            # デフォルトユーザーのクレジットレコード作成
            default_credit = Credit(user_id=DEFAULT_USER_ID, credits=0)
            db.add(default_credit)
            db.commit()  # クレジットをコミット
            logger.info(f"Created credit record for {DEFAULT_USER_ID}", extra={"category": "billing"})

        # 価格マスターデータを投入（存在しない場合のみ）
        for pricing_data in INITIAL_PRICING_DATA:
            existing_pricing = db.query(TokenPricing).filter_by(
                model_id=pricing_data["model_id"]
            ).first()

            if not existing_pricing:
                pricing = TokenPricing(**pricing_data)
                db.add(pricing)
                logger.info(f"Created pricing for {pricing_data['model_id']}", extra={"category": "billing"})

        db.commit()  # 価格データをコミット
        logger.info("Initial data inserted successfully", extra={"category": "billing"})

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to insert initial data: {e}", extra={"category": "billing"})
        raise
    finally:
        db.close()


