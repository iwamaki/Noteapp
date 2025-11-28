# @file router.py
# @summary エラーログAPIエンドポイント
# @responsibility フロントエンドからのエラーログ受信、保存

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.auth import verify_token_auth_optional
from src.billing.infrastructure import get_db
from src.core.logger import logger
from src.data.models import ErrorLog
from src.error_log.presentation.schemas import (
    ErrorLogBatchRequest,
    ErrorLogBatchResponse,
    ErrorLogRequest,
    ErrorLogResponse,
)

router = APIRouter(prefix="/api/error-logs", tags=["error-logs"])


@router.post("", response_model=ErrorLogResponse)
async def create_error_log(
    request: ErrorLogRequest,
    user_id: str | None = Depends(verify_token_auth_optional),
    db: Session = Depends(get_db)
):
    """エラーログ送信（認証オプショナル）

    フロントエンドで発生したエラーを保存。
    認証がある場合はuser_idを紐付け、ない場合は匿名で保存。

    Args:
        request: ErrorLogRequest

    Returns:
        ErrorLogResponse: {"success": True, "log_id": int}
    """
    try:
        error_log = ErrorLog(
            user_id=user_id,  # 認証がない場合はNone
            device_id=request.device_id,
            level=request.level,
            category=request.category,
            message=request.message,
            stack_trace=request.stack_trace,
            additional_data=request.additional_data,
            app_version=request.app_version,
            platform=request.platform,
            created_at=datetime.now()
        )
        db.add(error_log)
        db.commit()
        db.refresh(error_log)

        log_id = error_log.id
        if log_id is None:
            raise ValueError("Failed to get log_id after insert")

        logger.info(
            f"Client error logged: [{request.level}] {request.category}",
            extra={
                "category": "error_log",
                "user_id": user_id or "anonymous",
                "log_id": log_id
            }
        )

        return ErrorLogResponse(success=True, log_id=log_id)

    except Exception as e:
        logger.error(f"Failed to save error log: {e}", extra={"category": "error_log"})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="エラーログの保存に失敗しました"
        ) from e


@router.post("/batch", response_model=ErrorLogBatchResponse)
async def create_error_logs_batch(
    request: ErrorLogBatchRequest,
    user_id: str | None = Depends(verify_token_auth_optional),
    db: Session = Depends(get_db)
):
    """エラーログ一括送信（認証オプショナル）

    オフライン時に蓄積されたエラーを一括で送信。
    認証がある場合はuser_idを紐付け、ない場合は匿名で保存。

    Args:
        request: ErrorLogBatchRequest

    Returns:
        ErrorLogBatchResponse: {"success": True, "count": int}
    """
    try:
        now = datetime.now()
        error_logs = [
            ErrorLog(
                user_id=user_id,  # 認証がない場合はNone
                device_id=log.device_id,
                level=log.level,
                category=log.category,
                message=log.message,
                stack_trace=log.stack_trace,
                additional_data=log.additional_data,
                app_version=log.app_version,
                platform=log.platform,
                created_at=now
            )
            for log in request.logs
        ]

        db.add_all(error_logs)
        db.commit()

        logger.info(
            f"Batch error logs saved: {len(error_logs)} logs",
            extra={
                "category": "error_log",
                "user_id": user_id or "anonymous",
                "count": len(error_logs)
            }
        )

        return ErrorLogBatchResponse(success=True, count=len(error_logs))

    except Exception as e:
        logger.error(f"Failed to save batch error logs: {e}", extra={"category": "error_log"})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="エラーログの一括保存に失敗しました"
        ) from e


@router.get("/health")
async def health_check():
    """ヘルスチェック"""
    return {"status": "ok", "service": "error-logs"}
