"""
Billing Module - クリーンアーキテクチャ構造

トークン管理・課金機能を提供するモジュール

アーキテクチャ:
- domain: エンティティとビジネスルール
- application: ユースケースとアプリケーションサービス
- infrastructure: 外部サービスとデータベース実装
- presentation: API スキーマとインターフェース

依存関係の方向:
presentation -> application -> domain
infrastructure -> domain
"""

# Domain layer (moved to src.data.models)
from src.data.models import (
    Base,
    Credit,
    DeviceAuth,
    TokenBalance,
    TokenPricing,
    Transaction,
    User,
)

# Application layer
from .application import (
    BillingService,
    TokenBalanceValidator,
)

# Infrastructure layer
from .infrastructure import (
    DEFAULT_USER_ID,
    INITIAL_PRICING_DATA,
    MODEL_CATEGORIES,
    TOKEN_CAPACITY_LIMITS,
    TOKEN_ESTIMATION,
    SessionLocal,
    acknowledge_purchase,
    estimate_output_tokens,
    get_db,
    init_db,
    verify_purchase,
)

# Presentation layer
# Note: router is not imported here to avoid circular imports
# Import router directly from src.billing.presentation.router in main.py
from .presentation import (
    # Request schemas
    AddCreditsRequest,
    AllocateCreditsRequest,
    AllocationItem,
    CategoryBalanceResponse,
    ConsumeTokensRequest,
    ConsumeTokensResponse,
    OperationSuccessResponse,
    PricingInfoItem,
    PricingInfoResponse,
    # Response schemas
    TokenBalanceResponse,
    TransactionResponse,
)

__all__ = [
    # Domain
    'Base',
    'User',
    'TokenBalance',
    'Credit',
    'Transaction',
    'TokenPricing',
    'DeviceAuth',

    # Application
    'BillingService',
    'TokenBalanceValidator',

    # Infrastructure
    'init_db',
    'get_db',
    'SessionLocal',
    'verify_purchase',
    'acknowledge_purchase',
    'TOKEN_CAPACITY_LIMITS',
    'DEFAULT_USER_ID',
    'MODEL_CATEGORIES',
    'INITIAL_PRICING_DATA',
    'TOKEN_ESTIMATION',
    'estimate_output_tokens',

    # Presentation
    # 'router',  # Not exported to avoid circular imports
    'AddCreditsRequest',
    'AllocationItem',
    'AllocateCreditsRequest',
    'ConsumeTokensRequest',
    'TokenBalanceResponse',
    'ConsumeTokensResponse',
    'TransactionResponse',
    'PricingInfoItem',
    'PricingInfoResponse',
    'CategoryBalanceResponse',
    'OperationSuccessResponse',
]
