# @file __init__.py
# @summary Presentation schemas module
# @responsibility スキーマの公開

from .request_schemas import (
    DeviceRegisterRequest,
    GoogleAuthStartRequest,
    LogoutRequest,
    RefreshTokenRequest,
    VerifyDeviceRequest,
)
from .response_schemas import (
    DeleteDeviceResponse,
    DeviceInfo,
    DeviceListResponse,
    DeviceRegisterResponse,
    ErrorResponse,
    GoogleAuthStartResponse,
    LogoutResponse,
    RefreshTokenResponse,
    VerifyDeviceResponse,
)

__all__ = [
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
