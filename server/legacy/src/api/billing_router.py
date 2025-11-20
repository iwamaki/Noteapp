# @file billing_router.py
# @summary Billing API エンドポイント
# @responsibility トークン管理APIの公開、リクエスト処理、エラーハンドリング

import os
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from src.billing.database import get_db
from src.billing.service import BillingService
from src.auth.dependencies import verify_token_auth
from src.billing.schemas import (
    TokenBalanceResponse,
    AddCreditsRequest,
    AllocateCreditsRequest,
    ConsumeTokensRequest,
    ConsumeTokensResponse,
    TransactionResponse,
    PricingInfoResponse,
    PricingInfoItem,
    CategoryBalanceResponse,
    OperationSuccessResponse,
)
from typing import List
from src.core.logger import logger
from src.billing.iap_verification import verify_purchase, acknowledge_purchase
from src.billing.models import Transaction

router = APIRouter(prefix="/api/billing", tags=["billing"])


# =====================================
# トークン残高取得
# =====================================

@router.get("/balance", response_model=TokenBalanceResponse)
async def get_balance(
    user_id: str = Depends(verify_token_auth),
    db: Session = Depends(get_db)
):
    """トークン残高取得

    未配分クレジットと各モデルの配分済みトークン数を取得。

    Returns:
        TokenBalanceResponse: {
            "credits": 未配分クレジット,
            "allocated_tokens": {"model_id": tokens, ...}
        }
    """
    try:
        service = BillingService(db, user_id)
        balance = service.get_balance()
        return TokenBalanceResponse(**balance)
    except Exception as e:
        logger.error(f"[billing_router] Error in get_balance: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"残高取得に失敗しました: {str(e)}"
        )


@router.get("/balance/category/{category}", response_model=CategoryBalanceResponse)
async def get_category_balance(
    category: str,
    user_id: str = Depends(verify_token_auth),
    db: Session = Depends(get_db)
):
    """カテゴリー別トークン合計取得

    指定されたカテゴリー（quick/think）の全トークン合計を取得。

    Args:
        category: カテゴリー名（'quick' または 'think'）

    Returns:
        CategoryBalanceResponse: {
            "category": カテゴリー名,
            "total_tokens": 合計トークン数
        }
    """
    if category not in ["quick", "think"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="カテゴリーは 'quick' または 'think' である必要があります"
        )

    try:
        service = BillingService(db, user_id)
        total = service.get_category_balance(category)
        return CategoryBalanceResponse(category=category, total_tokens=total)
    except Exception as e:
        logger.error(f"[billing_router] Error in get_category_balance: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"カテゴリー別残高取得に失敗しました: {str(e)}"
        )


# =====================================
# クレジット管理
# =====================================

@router.post("/credits/add", response_model=OperationSuccessResponse)
async def add_credits(
    request: AddCreditsRequest,
    user_id: str = Depends(verify_token_auth),
    db: Session = Depends(get_db)
):
    """クレジット追加（購入時）

    アプリ内課金完了後に呼び出される。
    Google Play Developer APIでレシート検証を行い、
    検証成功時のみ未配分クレジットに追加し、取引履歴に記録。

    Args:
        request: AddCreditsRequest

    Returns:
        OperationSuccessResponse: {
            "success": True,
            "new_balance": 新しいクレジット残高
        }

    Raises:
        HTTPException(400): レシート検証失敗時
        HTTPException(409): 二重購入検出時
    """
    # レシート検証
    try:
        product_id = request.purchase_record.get("productId")
        purchase_token = request.purchase_record.get("purchaseToken")
        transaction_id = request.purchase_record.get("transactionId")

        if not product_id or not purchase_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing productId or purchaseToken in purchase_record"
            )

        # Google Play Developer APIで検証
        verify_purchase(product_id, purchase_token)

    except ValueError as e:
        # 検証失敗
        logger.warning(
            "Invalid purchase attempt",
            extra={
                "user_id": user_id,
                "product_id": product_id,
                "error": str(e)
            }
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid purchase receipt: {str(e)}"
        )

    # 二重購入防止
    if transaction_id:
        existing = db.query(Transaction).filter_by(
            transaction_id=transaction_id
        ).first()

        if existing:
            logger.warning(
                "Duplicate purchase attempt detected",
                extra={
                    "user_id": user_id,
                    "transaction_id": transaction_id
                }
            )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Purchase already processed"
            )

    # クレジット追加
    try:
        service = BillingService(db, user_id)
        result = service.add_credits(request.credits, request.purchase_record)

        # Google側で購入を確認済みにマーク
        acknowledge_purchase(product_id, purchase_token)

        return OperationSuccessResponse(**result)
    except ValueError as e:
        logger.warning(f"[billing_router] Validation error in add_credits: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"[billing_router] Error in add_credits: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"クレジット追加に失敗しました: {str(e)}"
        )


@router.post("/credits/allocate", response_model=OperationSuccessResponse)
async def allocate_credits(
    request: AllocateCreditsRequest,
    user_id: str = Depends(verify_token_auth),
    db: Session = Depends(get_db)
):
    """クレジット配分

    未配分クレジットを各モデルにトークンとして配分。
    容量制限チェックとクレジット残高チェックを実施。

    Args:
        request: AllocateCreditsRequest

    Returns:
        OperationSuccessResponse: {"success": True}

    Raises:
        HTTPException(400): クレジット不足、容量制限超過の場合
    """
    try:
        service = BillingService(db, user_id)
        allocations = [
            {"model_id": a.model_id, "credits": a.credits}
            for a in request.allocations
        ]
        result = service.allocate_credits(allocations)
        return OperationSuccessResponse(**result)
    except ValueError as e:
        logger.warning(f"[billing_router] Validation error in allocate_credits: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"[billing_router] Error in allocate_credits: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"クレジット配分に失敗しました: {str(e)}"
        )


# =====================================
# トークン消費
# =====================================

@router.post("/tokens/consume", response_model=ConsumeTokensResponse)
async def consume_tokens(
    request: ConsumeTokensRequest,
    user_id: str = Depends(verify_token_auth),
    db: Session = Depends(get_db)
):
    """トークン消費

    LLM使用時に呼び出される。
    指定されたモデルのトークン残高から消費し、取引履歴に記録。

    Args:
        request: ConsumeTokensRequest

    Returns:
        ConsumeTokensResponse: {
            "success": True,
            "remaining_tokens": 残トークン数
        }

    Raises:
        HTTPException(400): トークン残高不足の場合
    """
    try:
        service = BillingService(db, user_id)
        result = service.consume_tokens(
            request.model_id,
            request.input_tokens,
            request.output_tokens
        )
        return ConsumeTokensResponse(**result)
    except ValueError as e:
        logger.warning(f"[billing_router] Validation error in consume_tokens: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"[billing_router] Error in consume_tokens: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"トークン消費に失敗しました: {str(e)}"
        )


# =====================================
# 取引履歴・価格情報
# =====================================

@router.get("/transactions", response_model=List[TransactionResponse])
async def get_transactions(
    limit: int = 100,
    user_id: str = Depends(verify_token_auth),
    db: Session = Depends(get_db)
):
    """取引履歴取得

    最新の取引履歴を取得。

    Args:
        limit: 取得する履歴の最大件数（デフォルト100）

    Returns:
        List[TransactionResponse]: 取引履歴のリスト
    """
    try:
        service = BillingService(db, user_id)
        transactions = service.get_transactions(limit=limit)
        return [TransactionResponse(**t) for t in transactions]
    except Exception as e:
        logger.error(f"[billing_router] Error in get_transactions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"取引履歴取得に失敗しました: {str(e)}"
        )


@router.get("/pricing", response_model=PricingInfoResponse)
async def get_pricing(db: Session = Depends(get_db)):
    """価格情報取得

    全モデルの価格情報を取得。
    認証不要（公開情報）。

    Returns:
        PricingInfoResponse: {
            "pricing": {
                "model_id": {"price_per_m_token": int, "category": str},
                ...
            }
        }
    """
    try:
        # 価格情報は公開情報なので、DEFAULT_USER_IDを使用
        from src.billing.config import DEFAULT_USER_ID
        service = BillingService(db, DEFAULT_USER_ID)
        pricing_data = service.get_pricing()

        # PricingInfoItemに変換
        pricing = {
            model_id: PricingInfoItem(**info)
            for model_id, info in pricing_data.items()
        }

        return PricingInfoResponse(pricing=pricing)
    except Exception as e:
        logger.error(f"[billing_router] Error in get_pricing: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"価格情報取得に失敗しました: {str(e)}"
        )


# =====================================
# デバッグ・リセット機能
# =====================================

@router.post("/reset", response_model=OperationSuccessResponse)
async def reset_all_data(
    user_id: str = Depends(verify_token_auth),
    db: Session = Depends(get_db)
):
    """全データリセット（デバッグ用）

    クレジット残高、トークン残高、取引履歴をすべてリセット。
    開発・テスト環境でのみ使用を想定。

    Returns:
        OperationSuccessResponse: {
            "success": True,
            "message": "All data reset successfully"
        }
    """
    # 本番環境では無効化
    env = os.getenv("ENV", "development")
    if env == "production":
        logger.warning(f"Reset endpoint accessed in production by user: {user_id}")
        raise HTTPException(
            status_code=403,
            detail="This endpoint is not available in production environment"
        )

    try:
        service = BillingService(db, user_id)
        result = service.reset_all_data()
        return OperationSuccessResponse(**result)
    except ValueError as e:
        logger.warning(f"[billing_router] Validation error in reset_all_data: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"[billing_router] Error in reset_all_data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"データリセットに失敗しました: {str(e)}"
        )


# =====================================
# ヘルスチェック
# =====================================

@router.get("/health")
async def health_check():
    """ヘルスチェック

    Billing APIが正常に動作しているか確認。

    Returns:
        dict: {"status": "ok"}
    """
    return {"status": "ok", "service": "billing"}
