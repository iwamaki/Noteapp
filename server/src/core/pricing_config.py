"""
@file pricing_config.py
@summary モデル価格情報と計算ロジック
@description
フロントエンドのtokenPricing.tsから移植した価格計算ロジック。
USD建て原価からポイント換算価格を自動計算する。
ポイント（P）は内部的に円と同等の価値で計算されるが、ユーザーには通貨ではなくポイントとして表示される。
"""


from pydantic import BaseModel


class PricingConfig(BaseModel):
    """価格設定パラメータ"""
    exchange_rate: float = 150.0  # 為替レート（ポイント換算レート: P/USD、内部的には円と同等）
    margin_percent: float = 20.0  # マージン率（%）
    input_output_ratio: float = 0.5  # 入出力トークンの価格比率（入力:出力）


class CostInfo(BaseModel):
    """原価情報（USD/1M tokens）"""
    input_price_per_1m: float
    output_price_per_1m: float


class ModelPricing(BaseModel):
    """モデルごとの価格情報"""
    model_id: str
    display_name: str
    cost: CostInfo  # 原価（USD）
    selling_price_jpy: float  # 販売価格（P/1M tokens）※内部的には円と同等だがポイント表記


# 💰 価格設定（ここを変更するだけで全モデルの販売価格が自動計算される）
PRICING_CONFIG = PricingConfig(
    exchange_rate=150.0,
    margin_percent=20.0,
    input_output_ratio=0.5,  # 50:50 バランス型
)


def calculate_selling_price(
    input_price_usd: float,
    output_price_usd: float,
    config: PricingConfig = PRICING_CONFIG
) -> int:
    """
    原価（USD）から販売価格（ポイント）を自動計算

    Args:
        input_price_usd: 入力トークン単価（USD/1M）
        output_price_usd: 出力トークン単価（USD/1M）
        config: 価格設定パラメータ

    Returns:
        販売価格（P/1M tokens）、5P単位で四捨五入
    """
    # 入力と出力の加重平均価格を計算
    avg_price_usd = (
        input_price_usd * config.input_output_ratio +
        output_price_usd * (1 - config.input_output_ratio)
    )

    # ポイント換算価格（内部的には円と同等）
    cost_jpy = avg_price_usd * config.exchange_rate

    # マージンを加えた販売価格
    selling_price = cost_jpy * (1 + config.margin_percent / 100)

    # 5P単位で四捨五入（価格の見栄えを良くする）
    return round(selling_price / 5) * 5


# ========================================
# モデル価格テーブル
# ========================================

# Gemini モデルの原価（USD/1M tokens）
# 参照: https://ai.google.dev/pricing
# 最終更新: 2025-01
GEMINI_COST_INFO: dict[str, CostInfo] = {
    "gemini-3-pro-preview": CostInfo(
        input_price_per_1m=2.0,
        output_price_per_1m=12.0,
    ),
    "gemini-2.5-pro": CostInfo(
        input_price_per_1m=1.25,
        output_price_per_1m=10.0,
    ),
    "gemini-2.5-flash": CostInfo(
        input_price_per_1m=0.3,
        output_price_per_1m=2.5,
    ),
    "gemini-2.0-flash": CostInfo(
        input_price_per_1m=0.10,
        output_price_per_1m=0.40,
    ),
    "gemini-2.0-pro": CostInfo(
        input_price_per_1m=0.15,
        output_price_per_1m=0.60,
    ),
}

# OpenAI モデルの原価（USD/1M tokens）
# 参照: OpenAI公式情報
# 最終更新: 2025-08
OPENAI_COST_INFO: dict[str, CostInfo] = {
    "gpt-5-mini": CostInfo(
        input_price_per_1m=0.25,
        output_price_per_1m=2.00,
    ),
}

# Anthropic モデルの原価（USD/1M tokens）
# 参照: https://platform.claude.com/docs/en/about-claude/pricing
# 最終更新: 2025-01
ANTHROPIC_COST_INFO: dict[str, CostInfo] = {
    "claude-haiku-4-5": CostInfo(
        input_price_per_1m=1.0,
        output_price_per_1m=5.0,
    ),
}

# 全モデルの価格情報（自動計算）
MODEL_PRICING: dict[str, ModelPricing] = {}

def _initialize_pricing():
    """価格テーブルを初期化（自動計算）"""
    # Geminiモデルの価格情報を追加
    for model_id, cost_info in GEMINI_COST_INFO.items():
        selling_price = calculate_selling_price(
            cost_info.input_price_per_1m,
            cost_info.output_price_per_1m,
            PRICING_CONFIG
        )

        # 表示名を取得（config.pyのmodel_metadataから取得するのが理想だが、循環参照を避けるため簡易版）
        display_name = model_id.replace("-", " ").title()

        MODEL_PRICING[model_id] = ModelPricing(
            model_id=model_id,
            display_name=display_name,
            cost=cost_info,
            selling_price_jpy=selling_price,
        )

    # OpenAIモデルの価格情報を追加
    for model_id, cost_info in OPENAI_COST_INFO.items():
        selling_price = calculate_selling_price(
            cost_info.input_price_per_1m,
            cost_info.output_price_per_1m,
            PRICING_CONFIG
        )

        # 表示名を取得
        display_name = model_id.replace("-", " ").title()

        MODEL_PRICING[model_id] = ModelPricing(
            model_id=model_id,
            display_name=display_name,
            cost=cost_info,
            selling_price_jpy=selling_price,
        )

    # Anthropicモデルの価格情報を追加
    for model_id, cost_info in ANTHROPIC_COST_INFO.items():
        selling_price = calculate_selling_price(
            cost_info.input_price_per_1m,
            cost_info.output_price_per_1m,
            PRICING_CONFIG
        )

        # 表示名を取得
        display_name = model_id.replace("-", " ").title()

        MODEL_PRICING[model_id] = ModelPricing(
            model_id=model_id,
            display_name=display_name,
            cost=cost_info,
            selling_price_jpy=selling_price,
        )

# 初期化実行
_initialize_pricing()


# ========================================
# ヘルパー関数
# ========================================

def get_model_pricing(model_id: str) -> ModelPricing | None:
    """
    モデルIDから価格情報を取得

    Args:
        model_id: モデルID

    Returns:
        価格情報、存在しない場合はNone
    """
    return MODEL_PRICING.get(model_id)


def calculate_cost_usd(
    model_id: str,
    input_tokens: int,
    output_tokens: int
) -> float:
    """
    トークン数からコストを計算（USD）

    Args:
        model_id: モデルID
        input_tokens: 入力トークン数
        output_tokens: 出力トークン数

    Returns:
        コスト（USD）、モデルが見つからない場合は0
    """
    pricing = get_model_pricing(model_id)
    if not pricing:
        return 0.0

    input_cost = (input_tokens / 1_000_000) * pricing.cost.input_price_per_1m
    output_cost = (output_tokens / 1_000_000) * pricing.cost.output_price_per_1m

    return input_cost + output_cost


def credits_to_tokens(model_id: str, credits: float) -> int:
    """
    クレジット（ポイント）をトークン数に変換

    Args:
        model_id: モデルID
        credits: クレジット額（P）

    Returns:
        トークン数、価格情報がない場合は0
    """
    pricing = get_model_pricing(model_id)
    if not pricing or credits <= 0:
        return 0

    return int((credits / pricing.selling_price_jpy) * 1_000_000)


def tokens_to_credits(model_id: str, tokens: int) -> int:
    """
    トークン数をクレジット（ポイント）に変換

    Args:
        model_id: モデルID
        tokens: トークン数

    Returns:
        クレジット額（P）、価格情報がない場合は0
    """
    pricing = get_model_pricing(model_id)
    if not pricing or tokens <= 0:
        return 0

    return int((tokens / 1_000_000) * pricing.selling_price_jpy)
