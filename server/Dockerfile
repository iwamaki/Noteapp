FROM python:3.11-slim

WORKDIR /app

# 必要なシステムパッケージのインストール
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Pythonの依存関係をインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# アプリケーションコードをコピー
COPY . .

# Cloud Runはポート8080を期待
# 環境変数PORTから取得（Cloud Runが自動で設定）
EXPOSE 8080

# アプリケーションの起動
# Cloud Run用: --reload を削除（本番環境では不要）
CMD uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8080}
