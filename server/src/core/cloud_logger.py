# @file cloud_logger.py
# @summary GCP Cloud Loggingとの統合を提供します。
# @responsibility 本番環境でCloud Loggingにログを送信し、ログの集約と検索を可能にします。
import logging
import os
from typing import Optional

try:
    from google.cloud import logging as cloud_logging
    from google.cloud.logging.handlers import CloudLoggingHandler
    CLOUD_LOGGING_AVAILABLE = True
except ImportError:
    CLOUD_LOGGING_AVAILABLE = False
    logging.warning("google-cloud-logging is not installed. Cloud Logging will be disabled.")


def setup_cloud_logging() -> Optional[CloudLoggingHandler]:
    """GCP Cloud Loggingのセットアップ

    本番環境でのみCloud Loggingを有効化します。
    開発環境では標準出力ロギングのみを使用します。

    Returns:
        CloudLoggingHandler: Cloud Loggingハンドラー（有効時）、None（無効時）
    """
    # 本番環境のみCloud Loggingを有効化
    environment = os.getenv("ENVIRONMENT", "development")
    if environment != "production":
        logging.info(f"Cloud Logging disabled (environment={environment})")
        return None

    # google-cloud-loggingがインストールされていない場合
    if not CLOUD_LOGGING_AVAILABLE:
        logging.warning("Cloud Logging is not available. Install google-cloud-logging package.")
        return None

    try:
        # Cloud Logging クライアント
        client = cloud_logging.Client()

        # Cloud Logging ハンドラー
        handler = CloudLoggingHandler(
            client,
            name="noteapp-backend",
            labels={
                'service': 'noteapp-backend',
                'environment': environment,
            }
        )

        # ルートロガーに追加
        root_logger = logging.getLogger()
        root_logger.addHandler(handler)

        logging.info("Cloud Logging enabled successfully", extra={
            "event_type": "system",
            "component": "cloud_logger",
            "environment": environment
        })

        return handler

    except Exception as e:
        logging.error(f"Failed to setup Cloud Logging: {e}", exc_info=True)
        # フォールバック: 標準出力ロギング継続
        return None


def log_auth_event(
    user_id: str,
    device_id: str,
    method: str,
    status: str,
    error_message: Optional[str] = None
):
    """認証イベントをログ記録

    Args:
        user_id: ユーザーID
        device_id: デバイスID
        method: 認証方法（google_oauth, etc）
        status: 認証ステータス（success, failed）
        error_message: エラーメッセージ（オプション）
    """
    logger = logging.getLogger(__name__)
    log_data = {
        "event_type": "auth",
        "user_id": user_id,
        "device_id": device_id[:8] + "..." if len(device_id) > 8 else device_id,
        "method": method,
        "status": status
    }
    if error_message:
        log_data["error"] = error_message

    if status == "success":
        logger.info("User authenticated", extra=log_data)
    else:
        logger.warning("Authentication failed", extra=log_data)


def log_billing_event(
    user_id: str,
    transaction_type: str,
    amount: int,
    status: str,
    transaction_id: Optional[str] = None,
    error_message: Optional[str] = None
):
    """課金イベントをログ記録

    Args:
        user_id: ユーザーID
        transaction_type: トランザクションタイプ（purchase, consume, etc）
        amount: 金額またはトークン数
        status: ステータス（success, failed）
        transaction_id: トランザクションID（オプション）
        error_message: エラーメッセージ（オプション）
    """
    logger = logging.getLogger(__name__)
    log_data = {
        "event_type": "billing",
        "user_id": user_id,
        "transaction_type": transaction_type,
        "amount": amount,
        "status": status
    }
    if transaction_id:
        log_data["transaction_id"] = transaction_id
    if error_message:
        log_data["error"] = error_message

    if status == "success":
        logger.info("Billing transaction completed", extra=log_data)
    else:
        logger.error("Billing transaction failed", extra=log_data)


def log_api_request(
    endpoint: str,
    method: str,
    status_code: int,
    duration_ms: float,
    user_id: Optional[str] = None
):
    """APIリクエストをログ記録

    Args:
        endpoint: APIエンドポイント
        method: HTTPメソッド
        status_code: HTTPステータスコード
        duration_ms: リクエスト処理時間（ミリ秒）
        user_id: ユーザーID（オプション）
    """
    logger = logging.getLogger(__name__)
    log_data = {
        "event_type": "api_request",
        "endpoint": endpoint,
        "method": method,
        "status_code": status_code,
        "duration_ms": duration_ms
    }
    if user_id:
        log_data["user_id"] = user_id

    if status_code >= 500:
        logger.error("API request failed with server error", extra=log_data)
    elif status_code >= 400:
        logger.warning("API request failed with client error", extra=log_data)
    else:
        logger.info("API request completed", extra=log_data)
