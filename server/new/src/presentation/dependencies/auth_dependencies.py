"""
@file auth_dependencies.py
@summary Auth関連の依存性注入ヘルパー
@responsibility Commands/Queriesのインスタンス化と依存関係の解決
"""

from fastapi import Depends
from sqlalchemy.orm import Session

# Application Commands
from src.application.auth.commands import (
    LoginWithGoogleCommand,
    LogoutCommand,
    RefreshTokenCommand,
    RegisterDeviceCommand,
)

# Application Queries
from src.application.auth.queries import GetUserProfileQuery, VerifyTokenQuery

# Domain Services
from src.domain.auth.services import (
    AuthService,
    DeviceService,
    OAuthService,
    TokenService,
)
from src.infrastructure.database.connection import get_db

# Repository Implementations
from src.persistence.repositories import DeviceRepositoryImpl, UserRepositoryImpl

# ========================================
# Adapters for Protocol-based Dependencies
# ========================================

# We need to create adapters for:
# 1. JWTEncoder (for TokenService)
# 2. TokenBlacklistManager (for TokenService)
# 3. GoogleOAuthProvider (for OAuthService)
# 4. CreditCreator (for AuthService & OAuthService)


class JWTEncoderAdapter:
    """JWTEncoder Protocol実装アダプター"""

    def create_access_token(self, user_id: str, device_id: str) -> str:
        """アクセストークン生成"""
        from src.auth.jwt_utils import create_access_token

        return create_access_token(user_id, device_id)

    def create_refresh_token(self, user_id: str, device_id: str) -> str:
        """リフレッシュトークン生成"""
        from src.auth.jwt_utils import create_refresh_token

        return create_refresh_token(user_id, device_id)

    def verify_token(self, token: str, expected_type: str):
        """トークン検証"""
        from src.auth.jwt_utils import TokenType, verify_token

        token_type = TokenType.ACCESS if expected_type == "access" else TokenType.REFRESH
        return verify_token(token, token_type)

    def get_access_token_expire_minutes(self) -> int:
        """アクセストークン有効期限（分）を取得"""
        from src.auth.jwt_utils import ACCESS_TOKEN_EXPIRE_MINUTES

        return ACCESS_TOKEN_EXPIRE_MINUTES

    def get_refresh_token_expire_days(self) -> int:
        """リフレッシュトークン有効期限（日）を取得"""
        from src.auth.jwt_utils import REFRESH_TOKEN_EXPIRE_DAYS

        return REFRESH_TOKEN_EXPIRE_DAYS


class TokenBlacklistManagerAdapter:
    """TokenBlacklistManager Protocol実装アダプター"""

    def add_to_blacklist(self, token: str, expires_in_seconds: int) -> None:
        """トークンをブラックリストに追加"""
        from src.auth.token_blacklist_manager import get_blacklist_manager

        manager = get_blacklist_manager()
        manager.add_to_blacklist(token, expires_in_seconds)

    def is_blacklisted(self, token: str) -> bool:
        """トークンがブラックリストに登録されているか確認"""
        from src.auth.token_blacklist_manager import get_blacklist_manager

        manager = get_blacklist_manager()
        return manager.is_blacklisted(token)


class GoogleOAuthProviderAdapter:
    """GoogleOAuthProvider Protocol実装アダプター"""

    def generate_auth_url(self, state: str) -> str:
        """Google認証URL生成"""
        from src.auth.google_oauth_flow import generate_auth_url

        return generate_auth_url(state)

    def exchange_code_for_tokens(self, code: str):
        """認可コードをトークンに交換"""
        from src.auth.google_oauth_flow import exchange_code_for_tokens

        return exchange_code_for_tokens(code)

    def get_user_info_from_access_token(self, access_token: str):
        """ユーザー情報取得（Protocolに準拠したメソッド名）"""
        from src.auth.google_oauth_flow import get_user_info_from_access_token

        return get_user_info_from_access_token(access_token)


class CreditCreatorAdapter:
    """CreditCreator Protocol実装アダプター"""

    def __init__(self, db: Session):
        self.db = db

    async def create_initial_credits(self, user_id: str) -> None:
        """初期クレジット作成"""
        from src.billing.models import Credit

        credit = Credit(user_id=user_id, credits=0)
        self.db.add(credit)
        self.db.commit()


# ========================================
# Repository Factory
# ========================================


def get_user_repository(db: Session = Depends(get_db)) -> UserRepositoryImpl:
    """UserRepositoryのインスタンスを取得"""
    return UserRepositoryImpl(db)


def get_device_repository(db: Session = Depends(get_db)) -> DeviceRepositoryImpl:
    """DeviceRepositoryのインスタンスを取得"""
    return DeviceRepositoryImpl(db)


# ========================================
# Adapter Factory
# ========================================


def get_jwt_encoder() -> JWTEncoderAdapter:
    """JWTEncoderのインスタンスを取得"""
    return JWTEncoderAdapter()


def get_token_blacklist_manager() -> TokenBlacklistManagerAdapter:
    """TokenBlacklistManagerのインスタンスを取得"""
    return TokenBlacklistManagerAdapter()


def get_google_oauth_provider() -> GoogleOAuthProviderAdapter:
    """GoogleOAuthProviderのインスタンスを取得"""
    return GoogleOAuthProviderAdapter()


def get_credit_creator(db: Session = Depends(get_db)) -> CreditCreatorAdapter:
    """CreditCreatorのインスタンスを取得"""
    return CreditCreatorAdapter(db)


# ========================================
# Domain Service Factory
# ========================================


def get_token_service(
    jwt_encoder: JWTEncoderAdapter = Depends(get_jwt_encoder),
    blacklist_manager: TokenBlacklistManagerAdapter = Depends(
        get_token_blacklist_manager
    ),
) -> TokenService:
    """TokenServiceのインスタンスを取得"""
    return TokenService(jwt_encoder, blacklist_manager)


def get_device_service(
    device_repo: DeviceRepositoryImpl = Depends(get_device_repository),
    user_repo: UserRepositoryImpl = Depends(get_user_repository),
) -> DeviceService:
    """DeviceServiceのインスタンスを取得"""
    return DeviceService(device_repo, user_repo)


def get_auth_service(
    user_repo: UserRepositoryImpl = Depends(get_user_repository),
    device_repo: DeviceRepositoryImpl = Depends(get_device_repository),
    credit_creator: CreditCreatorAdapter = Depends(get_credit_creator),
) -> AuthService:
    """AuthServiceのインスタンスを取得"""
    return AuthService(user_repo, device_repo, credit_creator)


def get_oauth_service(
    user_repo: UserRepositoryImpl = Depends(get_user_repository),
    device_repo: DeviceRepositoryImpl = Depends(get_device_repository),
    google_provider: GoogleOAuthProviderAdapter = Depends(get_google_oauth_provider),
    credit_creator: CreditCreatorAdapter = Depends(get_credit_creator),
) -> OAuthService:
    """OAuthServiceのインスタンスを取得"""
    return OAuthService(user_repo, device_repo, google_provider, credit_creator)


# ========================================
# Command Factory
# ========================================


def get_register_device_command(
    auth_service: AuthService = Depends(get_auth_service),
    token_service: TokenService = Depends(get_token_service),
) -> RegisterDeviceCommand:
    """RegisterDeviceCommandのインスタンスを取得"""
    return RegisterDeviceCommand(auth_service, token_service)


def get_login_with_google_command(
    oauth_service: OAuthService = Depends(get_oauth_service),
    token_service: TokenService = Depends(get_token_service),
) -> LoginWithGoogleCommand:
    """LoginWithGoogleCommandのインスタンスを取得"""
    return LoginWithGoogleCommand(oauth_service, token_service)


def get_refresh_token_command(
    token_service: TokenService = Depends(get_token_service),
) -> RefreshTokenCommand:
    """RefreshTokenCommandのインスタンスを取得"""
    return RefreshTokenCommand(token_service)


def get_logout_command(
    token_service: TokenService = Depends(get_token_service),
) -> LogoutCommand:
    """LogoutCommandのインスタンスを取得"""
    return LogoutCommand(token_service)


# ========================================
# Query Factory
# ========================================


def get_user_profile_query(
    auth_service: AuthService = Depends(get_auth_service),
) -> GetUserProfileQuery:
    """GetUserProfileQueryのインスタンスを取得"""
    return GetUserProfileQuery(auth_service)


def get_verify_token_query(
    token_service: TokenService = Depends(get_token_service),
) -> VerifyTokenQuery:
    """VerifyTokenQueryのインスタンスを取得"""
    return VerifyTokenQuery(token_service)
