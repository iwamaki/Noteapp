"""
Presentation Layer - LLM API Package

LLM関連のAPIエンドポイントを集約します。
"""

from src.presentation.api.v1.llm.router import router

__all__ = ["router"]
