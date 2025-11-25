# NoteApp バックエンド デプロイガイド

このドキュメントでは、NoteApp バックエンドを Google Cloud Run にデプロイする手順を説明します。

## 📋 前提条件

- Google Cloud Platform アカウント
- `gcloud` CLI がインストール済み
- Docker がインストール済み
- ドメイン `iwamaki.app` が取得済み

## 🏗️ アーキテクチャ

```
[モバイルアプリ]
  iOS/Android
      ↓
  api.noteapp.iwamaki.app
      ↓
  Cloud Run (noteapp-api)
      ↓
  Secret Manager (API Keys)
```

## 🚀 デプロイ手順

### ステップ 1: Secret Manager にシークレットを作成

バックエンドが使用するAPI Keysを Secret Manager に保存します。

```bash
# Gemini API Key
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets create GEMINI_API_KEY --data-file=-

# OpenAI API Key
echo -n "YOUR_OPENAI_API_KEY" | gcloud secrets create OPENAI_API_KEY --data-file=-

# Google CSE API Key
echo -n "YOUR_GOOGLE_CSE_API_KEY" | gcloud secrets create GOOGLE_CSE_API_KEY --data-file=-
```

### ステップ 2: .env.production を作成

```bash
cd /path/to/Noteapp/server
cp .env.production.example .env.production
```

`.env.production` を編集して、実際の値を設定：

```bash
ENV=production
LOG_LEVEL=INFO

# モバイルアプリはCORSチェックを受けないため、空でも可
ALLOWED_ORIGINS=

# GCP設定
GCP_PROJECT_ID=strategic-haven-450402-p6
GOOGLE_APPLICATION_CREDENTIALS=/app/.secrets/geapi/key.json

# Secret Manager シークレット名
GEMINI_API_SECRET_ID=GEMINI_API_KEY
OPENAI_API_SECRET_ID=OPENAI_API_KEY
GOOGLE_CSE_API_SECRET_ID=GOOGLE_CSE_API_KEY

# Google Custom Search
GOOGLE_CSE_ID=2682c97053a18473c

# アプリケーション設定
ANDROID_PACKAGE_NAME=com.iwash.NoteApp
BACKEND_URL=https://api.noteapp.iwamaki.app
```

### ステップ 3: Cloud Run にデプロイ

デプロイスクリプトを実行：

```bash
./deploy-cloudrun.sh
```

または、手動でデプロイ：

```bash
# プロジェクトIDを設定
export PROJECT_ID=strategic-haven-450402-p6
gcloud config set project $PROJECT_ID

# Dockerイメージをビルド
docker build -t gcr.io/${PROJECT_ID}/noteapp-api:latest .

# Container Registryにプッシュ
docker push gcr.io/${PROJECT_ID}/noteapp-api:latest

# Cloud Runにデプロイ
gcloud run deploy noteapp-api \
  --image gcr.io/${PROJECT_ID}/noteapp-api:latest \
  --region asia-northeast1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "ENV=production,LOG_LEVEL=INFO,GCP_PROJECT_ID=${PROJECT_ID},GOOGLE_CSE_ID=2682c97053a18473c,ANDROID_PACKAGE_NAME=com.iwash.NoteApp,ALLOWED_ORIGINS=" \
  --set-secrets "GEMINI_API_KEY=GEMINI_API_KEY:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest,GOOGLE_CSE_API_KEY=GOOGLE_CSE_API_KEY:latest" \
  --max-instances 10 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300
```

### ステップ 4: Cloud Run のカスタムドメインをマッピング

デプロイ後、Cloud Runが自動生成したURLが表示されます：

```
https://noteapp-api-xxxxxxxxxx-an.a.run.app
```

次に、カスタムドメイン `api.noteapp.iwamaki.app` をマッピングします：

#### 4.1 Cloud Run でドメインマッピングを作成

```bash
gcloud run domain-mappings create \
  --service noteapp-api \
  --domain api.noteapp.iwamaki.app \
  --region asia-northeast1
```

#### 4.2 DNSレコードを確認

上記コマンド実行後、設定すべきDNSレコードが表示されます：

```
Please add the following DNS records:
NAME                          TYPE  DATA
api.noteapp.iwamaki.app.      CNAME ghs.googlehosted.com.
```

### ステップ 5: Google Cloud Domains でDNSレコードを設定

1. [Google Cloud Domains](https://console.cloud.google.com/net-services/domains) にアクセス
2. `iwamaki.app` を選択
3. 「DNS」タブを開く
4. 「カスタムレコードを管理」をクリック
5. 以下のレコードを追加：

```
ホスト名: api.noteapp
タイプ: CNAME
データ: ghs.googlehosted.com.
```

6. 保存

### ステップ 6: SSL証明書の自動発行を待つ

Cloud Run が自動的にSSL証明書を発行します（5〜15分）。

証明書の発行状況を確認：

```bash
gcloud run domain-mappings describe \
  --domain api.noteapp.iwamaki.app \
  --region asia-northeast1
```

`certificateStatus: ACTIVE` になれば完了です。

### ステップ 7: 動作確認

```bash
curl https://api.noteapp.iwamaki.app/

# レスポンス例:
# {
#   "message": "LLM File App API",
#   "version": "1.0.0",
#   ...
# }
```

### ステップ 8: モバイルアプリの環境変数を更新

モバイルアプリ側の環境変数を更新：

```bash
# Noteapp/.env
EXPO_PUBLIC_API_URL=https://api.noteapp.iwamaki.app
```

---

## 🔧 トラブルシューティング

### デプロイが失敗する

```bash
# ログを確認
gcloud run services logs read noteapp-api --region asia-northeast1 --limit 50
```

### Secret Manager へのアクセスが失敗する

Cloud Run のサービスアカウントに Secret Manager へのアクセス権限を付与：

```bash
PROJECT_ID=strategic-haven-450402-p6
SERVICE_ACCOUNT=$(gcloud run services describe noteapp-api --region asia-northeast1 --format 'value(spec.template.spec.serviceAccountName)')

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding OPENAI_API_KEY \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding GOOGLE_CSE_API_KEY \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"
```

### DNS が反映されない

DNS の反映には最大48時間かかる場合がありますが、通常は数分〜数時間です。

```bash
# DNS の状態を確認
nslookup api.noteapp.iwamaki.app
```

---

## 📊 モニタリング

### Cloud Run のメトリクスを確認

[Cloud Run コンソール](https://console.cloud.google.com/run) でメトリクスを確認できます：

- リクエスト数
- レスポンス時間
- エラー率
- メモリ使用量

### ログを確認

```bash
# リアルタイムでログを確認
gcloud run services logs tail noteapp-api --region asia-northeast1

# 過去のログを確認
gcloud run services logs read noteapp-api --region asia-northeast1 --limit 100
```

---

## 🔄 アップデート手順

コードを更新した場合：

```bash
# 1. 変更をコミット
git add .
git commit -m "Update: ..."

# 2. 再デプロイ
./deploy-cloudrun.sh
```

---

## 💰 コスト管理

Cloud Run の無料枠：

- 月間 200 万リクエスト
- 36 万 GB 秒のメモリ
- 18 万 vCPU 秒

現在の設定（512MB メモリ、1 vCPU）で、小〜中規模のアプリなら無料枠内で運用可能です。

---

## 🔀 マルチインスタンス対応

Cloud Runでマルチインスタンス（自動スケーリング）を有効にする場合、以下の設定が必要です。

### 環境変数設定

```yaml
# cloudbuild.yaml または gcloud run deploy コマンドで設定
OAUTH_STATE_STORAGE=hmac        # HMACベースのステートレス認証（推奨）
TOKEN_BLACKLIST_STORAGE=postgres # PostgreSQLベースのブラックリスト（推奨）
```

| 環境変数 | 設定値 | 説明 |
|---------|-------|------|
| `OAUTH_STATE_STORAGE` | `hmac` (推奨) | HMAC署名付きステートレス方式。サーバー側で状態を保持しない。 |
|                        | `redis` | Redis使用（Redis利用時） |
|                        | `memory` | インメモリ（シングルインスタンス限定） |
| `TOKEN_BLACKLIST_STORAGE` | `postgres` (推奨) | PostgreSQL使用。マルチインスタンス対応。 |
|                            | `redis` | Redis使用（Redis利用時） |
|                            | `memory` | インメモリ（シングルインスタンス限定） |

### Session Affinity（WebSocket用）

WebSocket接続を維持するために、Session Affinityを有効にします：

```bash
gcloud run deploy noteapp-api \
  --session-affinity \
  ... (他のオプション)
```

### マイグレーション実行

初回デプロイまたはテーブル追加時は、Cloud SQLへのマイグレーションが必要です：

```bash
# Cloud SQL Proxy 経由で接続して実行
cloud_sql_proxy -instances=PROJECT_ID:REGION:INSTANCE_NAME=tcp:5432 &

# マイグレーション実行
DATABASE_URL=postgresql://user:password@localhost:5432/dbname alembic upgrade head
```

### 実装詳細

1. **HmacStateManager**: OAuth stateにdevice_id、有効期限、nonceを埋め込み、HMAC-SHA256で署名。サーバー側で状態を保持しない。
2. **PostgresTokenBlacklist**: ログアウト時にトークンハッシュをDBに保存。JWT有効期限後に自動削除。

---

## 🔐 セキュリティ

### 実装済みのセキュリティ対策

✅ Secret Manager でAPI Keyを管理
✅ 環境変数で環境を分離（development/production）
✅ デバッグエンドポイント（`/api/billing/reset`）は本番環境で無効化
✅ HTTPS通信（Cloud Runが自動でSSL証明書を発行）
✅ デバイスID認証（`X-Device-ID` ヘッダー）
✅ JWT認証（アクセストークン30分、リフレッシュトークン30日）
✅ トークンブラックリスト（ログアウト時のトークン無効化）
✅ OAuth CSRF対策（HMAC署名付きstate）

### 推奨される追加対策

- Cloud Armor でDDoS対策
- Cloud CDN でキャッシュ
- Rate Limiting の実装（slowapiで実装済み）

---

## 📚 関連リンク

- [Cloud Run ドキュメント](https://cloud.google.com/run/docs)
- [Secret Manager ドキュメント](https://cloud.google.com/secret-manager/docs)
- [Cloud Domains ドキュメント](https://cloud.google.com/domains/docs)
