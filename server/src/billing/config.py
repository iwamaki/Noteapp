# @file config.py
# @summary Billing モジュールの設定・定数定義
# @responsibility 価格設定パラメータ、容量制限、デフォルト値などの管理

"""
価格設定パラメータ

現在のフロントエンド (app/billing/constants/tokenPricing.ts) から移植。
バックエンドで一元管理することで、価格変更時にアプリ再ビルド不要。
"""

# 価格設定パラメータ
PRICING_CONFIG = {
    "exchange_rate": 150,        # 円/USD
    "margin_percent": 20,        # マージン率（%）
    "input_output_ratio": 0.5,  # 入出力比率（0.5 = 50%入力、50%出力）
}

# カテゴリー別トークン容量制限
# ユーザー体験の一貫性とコスト管理のため、カテゴリーごとに上限を設定
TOKEN_CAPACITY_LIMITS = {
    "quick": 5_000_000,  # Quick カテゴリー: 5M tokens
    "think": 1_000_000,  # Think カテゴリー: 1M tokens
}

# デフォルトユーザーID（認証システム未実装時）
DEFAULT_USER_ID = "default_user"

# 初期価格データ（データベース初期化時に使用）
INITIAL_PRICING_DATA = [
    {
        "model_id": "gemini-2.5-flash",
        "price_per_m_token": 255,
        "category": "quick",
        "exchange_rate": PRICING_CONFIG["exchange_rate"],
        "margin_percent": PRICING_CONFIG["margin_percent"],
    },
    {
        "model_id": "gemini-2.5-pro",
        "price_per_m_token": 750,
        "category": "think",
        "exchange_rate": PRICING_CONFIG["exchange_rate"],
        "margin_percent": PRICING_CONFIG["margin_percent"],
    },
    {
        "model_id": "gemini-2.0-flash",
        "price_per_m_token": 75,
        "category": "quick",
        "exchange_rate": PRICING_CONFIG["exchange_rate"],
        "margin_percent": PRICING_CONFIG["margin_percent"],
    },
]
