"""
@file constants.py
@summary アプリケーション定数
@responsibility 変更頻度の低いアプリケーション全体の定数を定義
"""

# ==========================================
# 認証関連定数
# ==========================================
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 30

# ==========================================
# Billing関連定数
# ==========================================
DEFAULT_USER_ID = "default_user"
MIN_CREDIT_PURCHASE = 1
MAX_CREDIT_PURCHASE = 1000000

# ==========================================
# レート制限関連定数
# ==========================================
RATE_LIMIT_PER_MINUTE = 60
RATE_LIMIT_BURST = 100

# ==========================================
# LLM関連定数
# ==========================================
DEFAULT_LLM_PROVIDER = "gemini"
DEFAULT_MAX_TOKENS = 8192
DEFAULT_TEMPERATURE = 0.7

# ==========================================
# WebSocket関連定数
# ==========================================
WEBSOCKET_HEARTBEAT_INTERVAL = 30  # 秒
WEBSOCKET_MAX_CONNECTIONS = 1000

# ==========================================
# ファイルアップロード関連定数
# ==========================================
MAX_UPLOAD_SIZE_MB = 10
ALLOWED_FILE_EXTENSIONS = [".txt", ".md", ".pdf", ".doc", ".docx"]

# ==========================================
# ページネーション関連定数
# ==========================================
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100
