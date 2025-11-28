# @file __init__.py
# @summary Auth module - Clean Architecture
# @responsibility 認証モジュールの公開API

# Domain layer
# Application layer
from .application import (
    AuthenticationError,
    AuthService,
    DeviceAccessDeniedError,
    DeviceNotFoundError,
    OAuthService,
    OAuthServiceError,
    TokenType,
    create_access_token,
    create_refresh_token,
    get_device_id_from_token,
    get_user_id_from_token,
    verify_token,
)
from .domain import Credit, DeviceAuth, User

# Infrastructure layer
from .infrastructure import (
    get_jwt_secret,
    validate_jwt_secret,
)

# Presentation layer
from .presentation import router
from .presentation.dependencies import verify_token_auth, verify_token_auth_optional, verify_user

__all__ = [
    # Domain
    "User",
    "DeviceAuth",
    "Credit",
    # Application
    "AuthService",
    "AuthenticationError",
    "DeviceNotFoundError",
    "DeviceAccessDeniedError",
    "create_access_token",
    "create_refresh_token",
    "verify_token",
    "get_user_id_from_token",
    "get_device_id_from_token",
    "TokenType",
    "OAuthService",
    "OAuthServiceError",
    # Infrastructure
    "validate_jwt_secret",
    "get_jwt_secret",
    # Presentation
    "router",
    "verify_token_auth",
    "verify_token_auth_optional",
    "verify_user",
]
