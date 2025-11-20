"""
Shared Utilities - Token Counter

トークンカウント機能（Gemini専用）

責務:
- 会話履歴のトークン数を計算
- 要約の必要性を判断
- LangChain ChatGoogleGenerativeAIのget_num_tokens()メソッドを使用
"""

from typing import Any

from langchain_google_genai import ChatGoogleGenerativeAI

from src.infrastructure.config.settings import get_settings
from src.infrastructure.logging.logger import get_logger

logger = get_logger("token_counter")
settings = get_settings()


def count_tokens(text: str) -> int:
    """テキストのトークン数をカウントする（Gemini専用）

    Args:
        text: カウント対象のテキスト

    Returns:
        トークン数
    """
    try:
        # Gemini APIキーを設定
        if not settings.gemini_api_key:
            logger.warning("Gemini API key not configured, using character-based estimation")
            return len(text) // 4

        # デフォルトモデルを取得
        model_name = settings.llm_gemini_default_model
        llm = ChatGoogleGenerativeAI(
            api_key=settings.gemini_api_key,
            model=model_name
        )

        # トークン数をカウント
        return llm.get_num_tokens(text)

    except Exception as e:
        logger.error({"event": "token_count_error", "error": str(e)})
        # フォールバック: 文字数を4で割った概算値
        return len(text) // 4


def count_message_tokens(
    messages: list[dict[str, Any]],
    provider: str | None = None,
    model: str | None = None
) -> int:
    """メッセージリストの総トークン数をカウントする（Gemini専用）

    LangChain ChatGoogleGenerativeAIのget_num_tokens()メソッドを使用。
    メッセージリストを会話形式のテキストに変換してカウントします。

    Args:
        messages: カウント対象のメッセージリスト
            例: [{"role": "user", "content": "Hello"}, {"role": "ai", "content": "Hi!"}]
        provider: LLMプロバイダー（Gemini専用のため使用されない）
        model: モデル名（Noneの場合はデフォルト）

    Returns:
        総トークン数
    """
    try:
        # Gemini APIキーを設定
        if not settings.gemini_api_key:
            logger.warning("Gemini API key not configured, using character-based estimation")
            total_chars = sum(len(str(m.get("content", ""))) for m in messages)
            return total_chars // 4

        # モデル名を取得
        if model is None:
            model = settings.llm_gemini_default_model

        llm = ChatGoogleGenerativeAI(
            api_key=settings.gemini_api_key,
            model=model
        )

        # 会話履歴が空の場合
        if not messages:
            return 0

        # メッセージを連結したテキストとしてトークン数を計算
        # 各メッセージを "role: content" 形式で結合
        message_texts = []
        for message in messages:
            role = message.get("role", "")
            content = message.get("content", "")
            message_texts.append(f"{role}: {content}")

        combined_text = "\n".join(message_texts)

        # トークン数をカウント
        return llm.get_num_tokens(combined_text)

    except Exception as e:
        logger.error({"event": "message_token_count_error", "error": str(e)})
        # フォールバック: 全メッセージの文字数を4で割った概算値
        total_chars = sum(len(str(m.get("content", ""))) for m in messages)
        return total_chars // 4


def estimate_compression_needed(
    messages: list[dict[str, Any]],
    max_tokens: int = 4000,
    provider: str | None = None,
    model: str | None = None
) -> tuple[bool, int, float]:
    """会話履歴の圧縮が必要かどうかを判断する（Gemini専用）

    Args:
        messages: 会話履歴
        max_tokens: 最大許容トークン数
        provider: LLMプロバイダー（Gemini専用のため使用されない）
        model: モデル名（Noneの場合はデフォルト）

    Returns:
        (圧縮が必要か, 現在のトークン数, トークン使用率)
    """
    current_tokens = count_message_tokens(messages, provider, model)
    usage_ratio = current_tokens / max_tokens if max_tokens > 0 else 0.0
    needs_compression = current_tokens > max_tokens

    logger.info({
        "event": "token_estimate",
        "current_tokens": current_tokens,
        "max_tokens": max_tokens,
        "usage_ratio": f"{usage_ratio:.1%}",
        "needs_compression": needs_compression,
    })

    return needs_compression, current_tokens, usage_ratio
