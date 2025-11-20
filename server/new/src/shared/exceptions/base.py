"""
@file base.py
@summary 基底例外クラス
@responsibility アプリケーション全体で使用する例外の基底クラスを定義
"""

from typing import Any, Dict, Optional


class AppException(Exception):
    """アプリケーション基底例外

    すべてのカスタム例外はこのクラスを継承する。
    """

    def __init__(
        self,
        message: str,
        code: str,
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None,
    ):
        """
        Args:
            message: エラーメッセージ
            code: エラーコード（codes.pyで定義）
            status_code: HTTPステータスコード
            details: 追加の詳細情報
        """
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)

    def to_dict(self) -> Dict[str, Any]:
        """例外情報を辞書形式で返す

        Returns:
            例外情報の辞書
        """
        return {
            "error": {
                "code": self.code,
                "message": self.message,
                "details": self.details,
            }
        }


class ValidationError(AppException):
    """バリデーションエラー"""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        from .codes import VALIDATION_ERROR
        super().__init__(
            message=message,
            code=VALIDATION_ERROR,
            status_code=400,
            details=details,
        )


class NotFoundError(AppException):
    """リソースが見つからない"""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        from .codes import NOT_FOUND
        super().__init__(
            message=message,
            code=NOT_FOUND,
            status_code=404,
            details=details,
        )


class ForbiddenError(AppException):
    """アクセス権限なし"""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        from .codes import FORBIDDEN
        super().__init__(
            message=message,
            code=FORBIDDEN,
            status_code=403,
            details=details,
        )


class UnauthorizedError(AppException):
    """認証エラー"""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        from .codes import UNAUTHORIZED
        super().__init__(
            message=message,
            code=UNAUTHORIZED,
            status_code=401,
            details=details,
        )


class ConflictError(AppException):
    """リソースの競合"""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        from .codes import CONFLICT
        super().__init__(
            message=message,
            code=CONFLICT,
            status_code=409,
            details=details,
        )


class ExternalServiceError(AppException):
    """外部サービスエラー"""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        from .codes import EXTERNAL_SERVICE_ERROR
        super().__init__(
            message=message,
            code=EXTERNAL_SERVICE_ERROR,
            status_code=502,
            details=details,
        )
