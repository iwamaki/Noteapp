#!/bin/bash

# NoteApp API を Cloud Run にデプロイするスクリプト

set -e  # エラーが発生したら即座に終了

# 色付きメッセージ用
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}NoteApp API - Cloud Run デプロイ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# プロジェクトIDの確認
PROJECT_ID=$(gcloud config get-value project)
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}エラー: GCPプロジェクトが設定されていません${NC}"
    echo "以下のコマンドでプロジェクトを設定してください:"
    echo "  gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo -e "${YELLOW}プロジェクトID: ${PROJECT_ID}${NC}"
echo ""

# リージョンの設定
REGION="asia-northeast1"  # 東京
SERVICE_NAME="noteapp-api"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo -e "${YELLOW}ステップ1: Dockerイメージをビルド${NC}"
docker build -t ${IMAGE_NAME}:latest .

echo ""
echo -e "${YELLOW}ステップ2: Container Registryにプッシュ${NC}"
docker push ${IMAGE_NAME}:latest

echo ""
echo -e "${YELLOW}ステップ3: Cloud Runにデプロイ${NC}"

# 環境変数の読み込み（.env.production から）
if [ ! -f .env.production ]; then
    echo -e "${RED}エラー: .env.production が見つかりません${NC}"
    echo "以下のコマンドで作成してください:"
    echo "  cp .env.production.example .env.production"
    echo "  # .env.production を編集して実際の値を設定"
    exit 1
fi

# .env.production から環境変数を読み込む
source .env.production

gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME}:latest \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "ENV=production,LOG_LEVEL=${LOG_LEVEL},GCP_PROJECT_ID=${GCP_PROJECT_ID},GOOGLE_CSE_ID=${GOOGLE_CSE_ID},ANDROID_PACKAGE_NAME=${ANDROID_PACKAGE_NAME},ALLOWED_ORIGINS=${ALLOWED_ORIGINS}" \
  --set-secrets "GEMINI_API_KEY=${GEMINI_API_SECRET_ID}:latest,OPENAI_API_KEY=${OPENAI_API_SECRET_ID}:latest,GOOGLE_CSE_API_KEY=${GOOGLE_CSE_API_SECRET_ID}:latest" \
  --max-instances 10 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}デプロイ完了！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# デプロイされたURLを取得
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format 'value(status.url)')
echo -e "${YELLOW}サービスURL: ${SERVICE_URL}${NC}"
echo ""
echo -e "${YELLOW}次のステップ:${NC}"
echo "1. Cloud Domains で DNS レコードを設定"
echo "   api.noteapp.iwamaki.app → Cloud Run URL"
echo "2. Cloud Run でカスタムドメインをマッピング"
echo "3. フロントエンドの環境変数を更新"
echo ""
