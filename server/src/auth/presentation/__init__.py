# @file __init__.py
# @summary Presentation layer module
# @responsibility プレゼンテーション層の公開

from .router import router
from .schemas import (
    DeleteDeviceResponse,
    DeviceInfo,
    DeviceListResponse,
    DeviceRegisterRequest,
    DeviceRegisterResponse,
    ErrorResponse,
    GoogleAuthStartRequest,
    GoogleAuthStartResponse,
    LogoutRequest,
    LogoutResponse,
    RefreshTokenRequest,
    RefreshTokenResponse,
    VerifyDeviceRequest,
    VerifyDeviceResponse,
)

__all__ = [
    "router",
    # Request schemas
    "DeviceRegisterRequest",
    "VerifyDeviceRequest",
    "RefreshTokenRequest",
    "GoogleAuthStartRequest",
    "LogoutRequest",
    # Response schemas
    "DeviceRegisterResponse",
    "VerifyDeviceResponse",
    "RefreshTokenResponse",
    "ErrorResponse",
    "GoogleAuthStartResponse",
    "LogoutResponse",
    "DeviceInfo",
    "DeviceListResponse",
    "DeleteDeviceResponse",
]
