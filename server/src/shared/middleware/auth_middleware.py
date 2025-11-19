"""
@file auth_middleware.py
@summary 認証ミドルウェア
@responsibility JWTトークンの検証とユーザー情報の抽出

Note:
    このミドルウェアは将来的に実装されます。
    現在はFastAPI Dependsを使用した認証が主流です。
    フェーズ3（Authドメイン移行）で詳細実装を行います。
"""

from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


class AuthMiddleware(BaseHTTPMiddleware):
    """認証ミドルウェア（プレースホルダー）

    フェーズ3で実装予定。
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Args:
            request: FastAPIリクエスト
            call_next: 次のミドルウェアまたはルートハンドラー

        Returns:
            レスポンス
        """
        # TODO: フェーズ3で実装
        # - Authorizationヘッダーからトークン抽出
        # - JWTトークンの検証
        # - ユーザー情報をrequest.stateに設定

        return await call_next(request)
