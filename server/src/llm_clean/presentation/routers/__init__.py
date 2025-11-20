"""
Presentation Routers

FastAPI routersを提供します。
"""

from .chat_router import router as chat_router_clean
from .knowledge_base_router import router as knowledge_base_router_clean
from .provider_router import router as provider_router_clean
from .tools_router import router as tools_router_clean

__all__ = [
    "chat_router_clean",
    "provider_router_clean",
    "tools_router_clean",
    "knowledge_base_router_clean",
]
