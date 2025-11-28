# @file router.py
# @summary フィードバックAPIエンドポイント
# @responsibility フロントエンドからのフィードバック受信、保存

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.auth import verify_token_auth
from src.billing.infrastructure import get_db
from src.core.logger import logger
from src.data.models import AnonymousFeedback, Feedback
from src.feedback.presentation.schemas import (
    AnonymousFeedbackRequest,
    FeedbackRequest,
    FeedbackResponse,
)

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


@router.post("", response_model=FeedbackResponse)
async def create_feedback(
    request: FeedbackRequest,
    user_id: str = Depends(verify_token_auth),
    db: Session = Depends(get_db)
):
    """フィードバック送信

    ユーザーからのフィードバック（バグ報告、機能要望等）を保存。

    Args:
        request: FeedbackRequest

    Returns:
        FeedbackResponse: {"success": True, "feedback_id": int}
    """
    # カテゴリのバリデーション
    valid_categories = {'bug', 'feature', 'improvement', 'other'}
    if request.category not in valid_categories:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid category. Must be one of: {', '.join(valid_categories)}"
        )

    try:
        feedback = Feedback(
            user_id=user_id,
            category=request.category,
            content=request.content,
            rating=request.rating,
            app_version=request.app_version,
            platform=request.platform,
            device_id=request.device_id,
            created_at=datetime.now()
        )
        db.add(feedback)
        db.commit()
        db.refresh(feedback)

        feedback_id = feedback.id
        if feedback_id is None:
            raise ValueError("Failed to get feedback_id after insert")

        logger.info(
            f"Feedback received: [{request.category}]",
            extra={
                "category": "feedback",
                "user_id": user_id,
                "feedback_id": feedback_id,
                "feedback_category": request.category,
                "rating": request.rating
            }
        )

        return FeedbackResponse(success=True, feedback_id=feedback_id)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to save feedback: {e}", extra={"category": "feedback"})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="フィードバックの保存に失敗しました"
        ) from e


@router.post("/anonymous", response_model=FeedbackResponse)
async def create_anonymous_feedback(
    request: AnonymousFeedbackRequest,
    db: Session = Depends(get_db)
):
    """匿名フィードバック送信（認証不要）

    ログインなしでフィードバック（バグ報告、機能要望等）を送信。
    LLM機能オフ時のストア審査用ビルドでも利用可能。

    Args:
        request: AnonymousFeedbackRequest

    Returns:
        FeedbackResponse: {"success": True, "feedback_id": int}
    """
    # カテゴリのバリデーション
    valid_categories = {'bug', 'feature', 'improvement', 'other'}
    if request.category not in valid_categories:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid category. Must be one of: {', '.join(valid_categories)}"
        )

    try:
        feedback = AnonymousFeedback(
            category=request.category,
            content=request.content,
            rating=request.rating,
            app_version=request.app_version,
            platform=request.platform,
            device_id=request.device_id,
            created_at=datetime.now()
        )
        db.add(feedback)
        db.commit()
        db.refresh(feedback)

        feedback_id = feedback.id
        if feedback_id is None:
            raise ValueError("Failed to get feedback_id after insert")

        logger.info(
            f"Anonymous feedback received: [{request.category}]",
            extra={
                "category": "feedback",
                "feedback_id": feedback_id,
                "feedback_category": request.category,
                "rating": request.rating
            }
        )

        return FeedbackResponse(success=True, feedback_id=feedback_id)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to save anonymous feedback: {e}", extra={"category": "feedback"})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="フィードバックの保存に失敗しました"
        ) from e


@router.get("/health")
async def health_check():
    """ヘルスチェック"""
    return {"status": "ok", "service": "feedback"}
