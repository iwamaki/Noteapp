"""
@file billing_exceptions.py
@summary 課金関連例外
@responsibility 課金・トークン管理に関する例外を定義
"""

from typing import Any

from . import codes
from .base import AppException


class InsufficientBalanceError(AppException):
    """残高不足エラー"""

    def __init__(self, user_id: str, required: int, available: int):
        super().__init__(
            message=f"Insufficient balance for user {user_id}",
            code=codes.BILLING_INSUFFICIENT_BALANCE,
            status_code=400,
            details={
                "user_id": user_id,
                "required": required,
                "available": available,
            },
        )


class InvalidProductIdError(AppException):
    """無効な商品ID"""

    def __init__(self, product_id: str):
        super().__init__(
            message=f"Invalid product ID: {product_id}",
            code=codes.BILLING_INVALID_PRODUCT_ID,
            status_code=400,
            details={"product_id": product_id},
        )


class InvalidPurchaseError(AppException):
    """無効な購入"""

    def __init__(self, message: str, details: dict[str, Any] | None = None):
        super().__init__(
            message=message,
            code=codes.BILLING_INVALID_PURCHASE,
            status_code=400,
            details=details,
        )


class DuplicateTransactionError(AppException):
    """重複トランザクション"""

    def __init__(self, transaction_id: str):
        super().__init__(
            message=f"Transaction already processed: {transaction_id}",
            code=codes.BILLING_DUPLICATE_TRANSACTION,
            status_code=409,
            details={"transaction_id": transaction_id},
        )


class TransactionNotFoundError(AppException):
    """トランザクションが見つからない"""

    def __init__(self, transaction_id: str):
        super().__init__(
            message=f"Transaction not found: {transaction_id}",
            code=codes.BILLING_TRANSACTION_NOT_FOUND,
            status_code=404,
            details={"transaction_id": transaction_id},
        )


class CreditNotFoundError(AppException):
    """クレジットが見つからない"""

    def __init__(self, user_id: str):
        super().__init__(
            message=f"Credit record not found for user: {user_id}",
            code=codes.BILLING_CREDIT_NOT_FOUND,
            status_code=404,
            details={"user_id": user_id},
        )


class InvalidAmountError(AppException):
    """無効な金額"""

    def __init__(self, amount: int, message: str = "Invalid amount"):
        super().__init__(
            message=message,
            code=codes.BILLING_INVALID_AMOUNT,
            status_code=400,
            details={"amount": amount},
        )
