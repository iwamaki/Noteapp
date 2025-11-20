"""
Presentation Middleware

エラーハンドリング等のミドルウェアを提供します。
"""

from .error_handler import handle_route_errors

__all__ = [
    "handle_route_errors",
]
