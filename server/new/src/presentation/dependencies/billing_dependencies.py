"""
@file billing_dependencies.py
@summary Billing関連の依存性注入ヘルパー
@responsibility Commands/Queriesのインスタンス化と依存関係の解決
"""

from fastapi import Depends
from sqlalchemy.orm import Session

# Application Commands
from src.application.billing.commands import (
    AddCreditsCommand,
    AllocateCreditsCommand,
    ConsumeTokensCommand,
)

# Application Queries
from src.application.billing.queries import (
    GetBalanceQuery,
    GetPricingQuery,
    GetTransactionsQuery,
)

# Domain Services
from src.domain.billing.services import (
    CreditService,
    PricingService,
    TokenService,
    TransactionService,
)
from src.infrastructure.database.connection import get_db

# Repository Implementations
from src.persistence.repositories import (
    BalanceRepositoryImpl,
    CreditRepositoryImpl,
    PricingRepositoryImpl,
    TransactionRepositoryImpl,
)

# ========================================
# Repository Factory
# ========================================


def get_balance_repository(db: Session = Depends(get_db)) -> BalanceRepositoryImpl:
    """BalanceRepositoryのインスタンスを取得"""
    return BalanceRepositoryImpl(db)


def get_credit_repository(db: Session = Depends(get_db)) -> CreditRepositoryImpl:
    """CreditRepositoryのインスタンスを取得"""
    return CreditRepositoryImpl(db)


def get_transaction_repository(
    db: Session = Depends(get_db),
) -> TransactionRepositoryImpl:
    """TransactionRepositoryのインスタンスを取得"""
    return TransactionRepositoryImpl(db)


def get_pricing_repository(db: Session = Depends(get_db)) -> PricingRepositoryImpl:
    """PricingRepositoryのインスタンスを取得"""
    return PricingRepositoryImpl(db)


# ========================================
# Domain Service Factory
# ========================================


def get_credit_service(
    credit_repo: CreditRepositoryImpl = Depends(get_credit_repository),
) -> CreditService:
    """CreditServiceのインスタンスを取得"""
    return CreditService(credit_repo)


def get_token_service(
    balance_repo: BalanceRepositoryImpl = Depends(get_balance_repository),
    pricing_repo: PricingRepositoryImpl = Depends(get_pricing_repository),
) -> TokenService:
    """TokenServiceのインスタンスを取得"""
    return TokenService(balance_repo, pricing_repo)


def get_transaction_service(
    transaction_repo: TransactionRepositoryImpl = Depends(get_transaction_repository),
) -> TransactionService:
    """TransactionServiceのインスタンスを取得"""
    return TransactionService(transaction_repo)


def get_pricing_service(
    pricing_repo: PricingRepositoryImpl = Depends(get_pricing_repository),
) -> PricingService:
    """PricingServiceのインスタンスを取得"""
    return PricingService(pricing_repo)


# ========================================
# Command Factory
# ========================================


def get_add_credits_command(
    credit_service: CreditService = Depends(get_credit_service),
    transaction_service: TransactionService = Depends(get_transaction_service),
) -> AddCreditsCommand:
    """AddCreditsCommandのインスタンスを取得"""
    return AddCreditsCommand(credit_service, transaction_service)


def get_allocate_credits_command(
    credit_service: CreditService = Depends(get_credit_service),
    token_service: TokenService = Depends(get_token_service),
    transaction_service: TransactionService = Depends(get_transaction_service),
    pricing_service: PricingService = Depends(get_pricing_service),
) -> AllocateCreditsCommand:
    """AllocateCreditsCommandのインスタンスを取得"""
    return AllocateCreditsCommand(
        credit_service, token_service, transaction_service, pricing_service
    )


def get_consume_tokens_command(
    token_service: TokenService = Depends(get_token_service),
    transaction_service: TransactionService = Depends(get_transaction_service),
) -> ConsumeTokensCommand:
    """ConsumeTokensCommandのインスタンスを取得"""
    return ConsumeTokensCommand(token_service, transaction_service)


# ========================================
# Query Factory
# ========================================


def get_balance_query(
    credit_service: CreditService = Depends(get_credit_service),
    token_service: TokenService = Depends(get_token_service),
) -> GetBalanceQuery:
    """GetBalanceQueryのインスタンスを取得"""
    return GetBalanceQuery(credit_service, token_service)


def get_transactions_query(
    transaction_service: TransactionService = Depends(get_transaction_service),
) -> GetTransactionsQuery:
    """GetTransactionsQueryのインスタンスを取得"""
    return GetTransactionsQuery(transaction_service)


def get_pricing_query(
    pricing_service: PricingService = Depends(get_pricing_service),
) -> GetPricingQuery:
    """GetPricingQueryのインスタンスを取得"""
    return GetPricingQuery(pricing_service)
