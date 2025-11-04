"""トークンカウント機能

会話履歴のトークン数を計算し、要約の必要性を判断するためのユーティリティ。
tiktokenライブラリを使用してOpenAI互換のトークンカウントを実現。
"""
from typing import List, Dict, Any, Optional
import tiktoken
from src.core.config import settings
from src.core.logger import logger


def count_tokens(text: str, provider: Optional[str] = None, model: Optional[str] = None) -> int:
    """テキストのトークン数をカウントする

    Args:
        text: カウント対象のテキスト
        provider: LLMプロバイダー（"openai" or "gemini"）（Noneの場合はデフォルト）
        model: モデル名（エンコーディング選択に使用）（Noneの場合はデフォルト）

    Returns:
        トークン数
    """
    # デフォルト値を設定
    if provider is None:
        provider = settings.get_default_provider()
    if model is None:
        model = settings.get_default_model(provider)

    try:
        encoding = _get_encoding_for_model(provider, model)
        return len(encoding.encode(text))
    except Exception as e:
        logger.error(f"Error counting tokens: {e}")
        # フォールバック: 文字数を4で割った概算値
        return len(text) // 4


def count_message_tokens(
    messages: List[Dict[str, Any]],
    provider: Optional[str] = None,
    model: Optional[str] = None
) -> int:
    """メッセージリストの総トークン数をカウントする

    OpenAIのトークンカウント方式に従い、各メッセージのオーバーヘッドを含めて計算。
    参考: https://github.com/openai/openai-cookbook/blob/main/examples/How_to_count_tokens_with_tiktoken.ipynb

    Args:
        messages: カウント対象のメッセージリスト
            例: [{"role": "user", "content": "Hello"}, {"role": "ai", "content": "Hi!"}]
        provider: LLMプロバイダー（"openai" or "gemini"）（Noneの場合はデフォルト）
        model: モデル名（Noneの場合はデフォルト）

    Returns:
        総トークン数（メッセージオーバーヘッド含む）
    """
    # デフォルト値を設定
    if provider is None:
        provider = settings.get_default_provider()
    if model is None:
        model = settings.get_default_model(provider)

    try:
        encoding = _get_encoding_for_model(provider, model)

        # モデルごとのトークン計算パラメータ
        if model in ["gpt-3.5-turbo", "gpt-3.5-turbo-0613", "gpt-3.5-turbo-16k"]:
            tokens_per_message = 4  # メッセージごとのオーバーヘッド
            tokens_per_name = -1    # role="name"の場合の調整
        elif model in ["gpt-4", "gpt-4-0613", "gpt-4-32k", "gpt-4-turbo", "gpt-4o"]:
            tokens_per_message = 3
            tokens_per_name = 1
        else:
            # デフォルト（GPT-3.5-turbo相当）
            tokens_per_message = 4
            tokens_per_name = -1
            logger.warning(f"Unknown model {model}, using default token counting")

        num_tokens = 0

        for message in messages:
            num_tokens += tokens_per_message

            # roleとcontentのトークン数を加算
            role = message.get("role", "")
            content = message.get("content", "")

            num_tokens += len(encoding.encode(role))
            num_tokens += len(encoding.encode(str(content)))

            # nameフィールドがある場合
            if "name" in message:
                num_tokens += len(encoding.encode(message["name"]))
                num_tokens += tokens_per_name

        # 最後に追加のプライミングトークン
        num_tokens += 3

        return num_tokens

    except Exception as e:
        logger.error(f"Error counting message tokens: {e}")
        # フォールバック: 全メッセージの文字数を4で割った概算値
        total_chars = sum(len(str(m.get("content", ""))) for m in messages)
        return total_chars // 4


def _get_encoding_for_model(provider: str, model: str) -> tiktoken.Encoding:
    """プロバイダーとモデルに応じたエンコーディングを取得する

    Args:
        provider: LLMプロバイダー（"openai" or "gemini"）
        model: モデル名

    Returns:
        tiktoken.Encoding オブジェクト
    """
    try:
        if provider == "openai":
            # OpenAIの場合、モデルごとのエンコーディングを取得
            try:
                return tiktoken.encoding_for_model(model)
            except KeyError:
                logger.warning(f"Model {model} not found, using cl100k_base encoding")
                return tiktoken.get_encoding("cl100k_base")

        elif provider == "gemini":
            # Geminiの場合、OpenAIのcl100k_baseを概算として使用
            # 注: 実際のGeminiトークナイザーとは異なるが、概算として十分
            return tiktoken.get_encoding("cl100k_base")

        else:
            logger.warning(f"Unknown provider {provider}, using cl100k_base encoding")
            return tiktoken.get_encoding("cl100k_base")

    except Exception as e:
        logger.error(f"Error getting encoding: {e}, falling back to cl100k_base")
        return tiktoken.get_encoding("cl100k_base")


def estimate_compression_needed(
    messages: List[Dict[str, Any]],
    max_tokens: int = 4000,
    provider: Optional[str] = None,
    model: Optional[str] = None
) -> tuple[bool, int, float]:
    """会話履歴の圧縮が必要かどうかを判断する

    Args:
        messages: 会話履歴
        max_tokens: 最大許容トークン数
        provider: LLMプロバイダー（Noneの場合はデフォルト）
        model: モデル名（Noneの場合はデフォルト）

    Returns:
        (圧縮が必要か, 現在のトークン数, トークン使用率)
    """
    # デフォルト値を設定
    if provider is None:
        provider = settings.get_default_provider()
    if model is None:
        model = settings.get_default_model(provider)

    current_tokens = count_message_tokens(messages, provider, model)
    usage_ratio = current_tokens / max_tokens
    needs_compression = current_tokens > max_tokens

    logger.info(
        f"Token estimate: {current_tokens}/{max_tokens} "
        f"({usage_ratio:.1%}) - Compression needed: {needs_compression}"
    )

    return needs_compression, current_tokens, usage_ratio
