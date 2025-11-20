"""
Auth application queries
"""

from .get_user_profile_query import GetUserProfileQuery
from .verify_token_query import VerifyTokenQuery

__all__ = [
    "GetUserProfileQuery",
    "VerifyTokenQuery",
]
