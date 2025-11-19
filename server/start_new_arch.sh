#!/bin/bash
# 新アーキテクチャ（フェーズ1）の動作確認スクリプト

set -e

echo "=================================================="
echo "🚀 NoteApp Server - New Architecture (Phase 1)"
echo "=================================================="
echo ""

# 環境変数ファイルの確認
if [ ! -f .env.development ]; then
    echo "⚠️  .env.development が見つかりません"
    echo "📝 .env.test をコピーして .env.development を作成します..."
    cp .env.test .env.development
    echo "✅ .env.development を作成しました"
    echo ""
    echo "⚠️  注意: USE_SECRET_MANAGER=false に設定されています"
    echo "   Secret Managerを使用する場合は、.env.development を編集してください"
    echo ""
fi

# Docker Composeでビルド＆起動
echo "🔨 Dockerイメージをビルドしています..."
docker-compose -f docker-compose.new.yml build

echo ""
echo "▶️  サービスを起動しています..."
docker-compose -f docker-compose.new.yml up -d

echo ""
echo "⏳ サービスが起動するまで待機中..."
sleep 5

# ヘルスチェック
echo ""
echo "🏥 ヘルスチェック実行中..."
if curl -s http://localhost:8001/health > /dev/null; then
    echo "✅ サーバーが正常に起動しました！"
    echo ""
    echo "=================================================="
    echo "📊 利用可能なエンドポイント:"
    echo "=================================================="
    echo "🏠 ルート:           http://localhost:8001/"
    echo "💚 ヘルスチェック:   http://localhost:8001/health"
    echo "⚙️  設定情報:        http://localhost:8001/config"
    echo ""
    echo "🧪 テストエンドポイント:"
    echo "   - バリデーション:  http://localhost:8001/test/exception"
    echo "   - 認証エラー:      http://localhost:8001/test/auth-exception"
    echo "   - 課金エラー:      http://localhost:8001/test/billing-exception"
    echo ""
    echo "=================================================="
    echo "📋 ログ確認:"
    echo "=================================================="
    echo "docker-compose -f docker-compose.new.yml logs -f api-new"
    echo ""
    echo "=================================================="
    echo "🛑 停止方法:"
    echo "=================================================="
    echo "docker-compose -f docker-compose.new.yml down"
    echo ""
else
    echo "❌ サーバーの起動に失敗しました"
    echo ""
    echo "ログを確認してください:"
    echo "docker-compose -f docker-compose.new.yml logs api-new"
    exit 1
fi
