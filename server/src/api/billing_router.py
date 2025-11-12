# @file billing_router.py
# @summary Billing API エンドポイント
# @responsibility トークン管理APIの公開、リクエスト処理、エラーハンドリング

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from src.billing.database import get_db
from src.billing.service import BillingService
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

router = APIRouter(prefix="/api/billing", tags=["billing"])


# =====================================
# トークン残高取得
# =====================================

@router.get("/balance", response_model=TokenBalanceResponse)
async def get_balance(db: Session = Depends(get_db)):
    """トークン残高取得

    未配分クレジットと各モデルの配分済みトークン数を取得。

    Returns:
        TokenBalanceResponse: {
            "credits": 未配分クレジット,
            "allocated_tokens": {"model_id": tokens, ...}
        }
    """
    try:
        service = BillingService(db)
        balance = service.get_balance()
        return TokenBalanceResponse(**balance)
    except Exception as e:
        logger.error(f"[billing_router] Error in get_balance: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"残高取得に失敗しました: {str(e)}"
        )


@router.get("/balance/category/{category}", response_model=CategoryBalanceResponse)
async def get_category_balance(category: str, db: Session = Depends(get_db)):
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
        service = BillingService(db)
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
async def add_credits(request: AddCreditsRequest, db: Session = Depends(get_db)):
    """クレジット追加（購入時）

    アプリ内課金完了後に呼び出される。
    未配分クレジットに追加し、取引履歴に記録。

    Args:
        request: AddCreditsRequest

    Returns:
        OperationSuccessResponse: {
            "success": True,
            "new_balance": 新しいクレジット残高
        }
    """
    try:
        service = BillingService(db)
        result = service.add_credits(request.credits, request.purchase_record)
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
async def allocate_credits(request: AllocateCreditsRequest, db: Session = Depends(get_db)):
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
        service = BillingService(db)
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
async def consume_tokens(request: ConsumeTokensRequest, db: Session = Depends(get_db)):
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
        service = BillingService(db)
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
async def get_transactions(limit: int = 100, db: Session = Depends(get_db)):
    """取引履歴取得

    最新の取引履歴を取得。

    Args:
        limit: 取得する履歴の最大件数（デフォルト100）

    Returns:
        List[TransactionResponse]: 取引履歴のリスト
    """
    try:
        service = BillingService(db)
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

    Returns:
        PricingInfoResponse: {
            "pricing": {
                "model_id": {"price_per_m_token": int, "category": str},
                ...
            }
        }
    """
    try:
        service = BillingService(db)
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
async def reset_all_data(db: Session = Depends(get_db)):
    """全データリセット（デバッグ用）

    クレジット残高、トークン残高、取引履歴をすべてリセット。
    開発・テスト環境でのみ使用を想定。

    Returns:
        OperationSuccessResponse: {
            "success": True,
            "message": "All data reset successfully"
        }
    """
    try:
        service = BillingService(db)
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
