# @file config.py
# @summary Billing モジュールの設定・定数定義
# @responsibility 価格設定パラメータ、容量制限、デフォルト値などの管理

"""
価格設定パラメータ

pricing_config.py の計算ロジックを使用して、DBの初期価格を生成。
価格はすべて自動計算され、ハードコーディングは一切行わない。
"""

from src.core.pricing_config import MODEL_PRICING

# カテゴリー別トークン容量制限
# ユーザー体験の一貫性とコスト管理のため、カテゴリーごとに上限を設定
TOKEN_CAPACITY_LIMITS = {
    "quick": 5_000_000,  # Quick カテゴリー: 5M tokens
    "think": 1_000_000,  # Think カテゴリー: 1M tokens
}

# デフォルトユーザーID（認証システム未実装時）
DEFAULT_USER_ID = "default_user"

# モデルカテゴリー定義
MODEL_CATEGORIES = {
    "gemini-2.5-flash": "quick",
    "gemini-2.5-pro": "think",
    "gemini-2.0-flash": "quick",
    "gemini-2.0-pro": "quick",
    "gpt-5-mini": "quick",
}

def _generate_initial_pricing_data():
    """
    pricing_config.py の計算結果からDBの初期価格データを生成

    Returns:
        初期価格データのリスト
    """
    pricing_data = []

    for model_id, pricing in MODEL_PRICING.items():
        category = MODEL_CATEGORIES.get(model_id, "quick")

        pricing_data.append({
            "model_id": model_id,
            "price_per_m_token": int(pricing.selling_price_jpy),
            "category": category,
            "exchange_rate": 150,  # pricing_config.py の PRICING_CONFIG から
            "margin_percent": 20,  # pricing_config.py の PRICING_CONFIG から
        })

    return pricing_data

# 初期価格データ（データベース初期化時に使用）
# pricing_config.py の計算ロジックから自動生成
INITIAL_PRICING_DATA = _generate_initial_pricing_data()
