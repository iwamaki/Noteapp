# @file constants.py
# @summary 認証関連の設定定数
# @responsibility JWT設定、OAuth設定などの定数管理

# JWT設定
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30  # アクセストークン有効期限: 30分
REFRESH_TOKEN_EXPIRE_DAYS = 30    # リフレッシュトークン有効期限: 30日

# セキュリティ基準
MIN_SECRET_KEY_LENGTH = 32  # 最小シークレットキー長（32文字）

# OAuth設定
AUTH_URI = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URI = "https://oauth2.googleapis.com/token"
USERINFO_URI = "https://www.googleapis.com/oauth2/v2/userinfo"
