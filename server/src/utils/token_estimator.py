"""トークン推定ユーティリティ

LLM実行前にトークン使用量を推定し、残高チェックを行うためのユーティリティ。
プロバイダー非依存の汎用的な推定ロジックを提供します。
"""
from typing import Dict, Any, List, Optional
from src.core.logger import logger


# トークン推定の定数
CHARS_PER_TOKEN = 4  # 1トークン ≈ 4文字（英語基準、日本語は約2文字）
OUTPUT_TOKEN_RATIO = 0.5  # 出力トークンは入力の50%と推定
MIN_OUTPUT_TOKENS = 500  # 最小出力トークン数
MAX_OUTPUT_TOKENS = 4000  # 最大出力トークン数（安全マージン）


def estimate_text_tokens(text: str) -> int:
    """テキストのトークン数を推定する

    Args:
        text: 推定対象のテキスト

    Returns:
        推定トークン数
    """
    if not text:
        return 0

    # 文字数ベースの簡易推定
    # 日本語が混在する場合は1文字=0.5トークンとして計算
    char_count = len(text)
    return max(1, char_count // CHARS_PER_TOKEN)


def estimate_message_tokens(messages: List[Dict[str, Any]]) -> int:
    """メッセージリストの総トークン数を推定する

    Args:
        messages: メッセージリスト
            例: [{"role": "user", "content": "Hello"}, {"role": "ai", "content": "Hi!"}]

    Returns:
        総トークン数
    """
    if not messages:
        return 0

    total_tokens = 0
    for message in messages:
        content = message.get("content", "")
        # role名も含めてカウント（"role: content" 形式）
        role = message.get("role", "")
        combined_text = f"{role}: {content}"
        total_tokens += estimate_text_tokens(combined_text)

    return total_tokens


def estimate_chat_request_tokens(
    message: str,
    conversation_history: Optional[List[Dict[str, Any]]] = None,
    file_context: Optional[str] = None
) -> Dict[str, int]:
    """チャットリクエストの推定トークン数を計算する

    Args:
        message: ユーザーメッセージ
        conversation_history: 会話履歴
        file_context: ファイルコンテキスト（オプション）

    Returns:
        Dict: {
            "input_tokens": 推定入力トークン数,
            "output_tokens": 推定出力トークン数,
            "total_tokens": 推定合計トークン数
        }
    """
    # 入力トークンの計算
    input_tokens = 0

    # 1. ユーザーメッセージ
    input_tokens += estimate_text_tokens(message)

    # 2. 会話履歴
    if conversation_history:
        input_tokens += estimate_message_tokens(conversation_history)

    # 3. ファイルコンテキスト
    if file_context:
        input_tokens += estimate_text_tokens(file_context)

    # システムプロンプトの分も加算（約200トークン）
    input_tokens += 200

    # 出力トークンの推定
    # 入力の50%を出力すると仮定、ただし最小500、最大4000トークン
    estimated_output = int(input_tokens * OUTPUT_TOKEN_RATIO)
    output_tokens = max(MIN_OUTPUT_TOKENS, min(estimated_output, MAX_OUTPUT_TOKENS))

    total_tokens = input_tokens + output_tokens

    logger.debug(
        f"Token estimation: input={input_tokens}, output={output_tokens}, total={total_tokens}"
    )

    return {
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": total_tokens
    }


def check_token_balance_sufficient(
    required_tokens: int,
    available_tokens: int,
    safety_margin: float = 1.2
) -> tuple[bool, int]:
    """トークン残高が十分かチェックする

    Args:
        required_tokens: 必要なトークン数
        available_tokens: 利用可能なトークン数
        safety_margin: 安全マージン（デフォルト1.2 = 20%余裕を持たせる）

    Returns:
        (残高が十分か, 不足トークン数)
    """
    required_with_margin = int(required_tokens * safety_margin)

    if available_tokens >= required_with_margin:
        return True, 0
    else:
        shortage = required_with_margin - available_tokens
        logger.warning(
            f"Insufficient token balance: required={required_with_margin}, "
            f"available={available_tokens}, shortage={shortage}"
        )
        return False, shortage
