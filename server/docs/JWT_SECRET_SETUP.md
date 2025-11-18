# JWT_SECRET_KEY セットアップガイド

## 概要

JWT_SECRET_KEYは、JWTトークンの署名・検証に使用される重要なシークレットキーです。
本番環境では **Google Secret Manager** を使用し、開発環境では環境変数を使用します。

## 優先順位

システムは以下の順序でJWT_SECRET_KEYを取得します：

1. **Google Secret Manager** （本番環境推奨）
2. **環境変数 `JWT_SECRET_KEY`** （開発環境のみ）

---

## 本番環境セットアップ（Secret Manager）

### 1. シークレットキーの生成

安全なランダムキーを生成します（最低32文字、推奨64文字以上）：

```bash
# Python3を使用
python3 -c "import secrets; print(secrets.token_urlsafe(48))"

# またはOpenSSLを使用
openssl rand -base64 48
```

### 2. Secret Managerにシークレットを作成

```bash
# GCPプロジェクトIDを設定
export GCP_PROJECT_ID="your-project-id"

# シークレットを作成（シークレット名: JWT_SECRET_KEY）
echo -n "生成したシークレットキー" | gcloud secrets create JWT_SECRET_KEY \
    --data-file=- \
    --project=${GCP_PROJECT_ID} \
    --replication-policy="automatic"
```

### 3. サービスアカウントに権限を付与

```bash
# サービスアカウントのメールアドレス
export SERVICE_ACCOUNT_EMAIL="your-service-account@your-project.iam.gserviceaccount.com"

# Secret Manager Secret Accessor ロールを付与
gcloud secrets add-iam-policy-binding JWT_SECRET_KEY \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/secretmanager.secretAccessor" \
    --project=${GCP_PROJECT_ID}
```

### 4. 環境変数の設定

アプリケーションが以下の環境変数を持っていることを確認：

```bash
GCP_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
# オプション: デフォルトは "JWT_SECRET_KEY"
JWT_SECRET_ID=JWT_SECRET_KEY
```

### 5. 動作確認

```bash
# Secret Managerからシークレットを取得できるか確認
gcloud secrets versions access latest --secret="JWT_SECRET_KEY" --project=${GCP_PROJECT_ID}
```

---

## 開発環境セットアップ（環境変数）

開発環境では、`.env` ファイルに直接設定できます：

### 1. シークレットキーの生成

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

### 2. .env ファイルに追加

```bash
# server/.env
JWT_SECRET_KEY=生成したシークレットキー
```

**注意:**
- `.env` ファイルは `.gitignore` に含まれているため、Gitにコミットされません
- 本番環境では必ずSecret Managerを使用してください
- チーム開発では各自が独自のキーを生成してください

---

## セキュリティ要件

- **最小長**: 32文字
- **推奨長**: 64文字以上
- **文字種**: 英数字 + 記号（URL-safe推奨）
- **禁止値**: "secret", "password", "change-me" などの脆弱なデフォルト値

---

## トラブルシューティング

### エラー: "JWT_SECRET_KEY not found"

**原因**: Secret Managerと環境変数の両方でシークレットキーが見つからない

**対処法**:
1. Secret Managerに `JWT_SECRET_KEY` シークレットが存在するか確認
2. サービスアカウントに適切な権限があるか確認
3. または `.env` ファイルに `JWT_SECRET_KEY` を設定

### エラー: "Permission denied accessing Secret Manager"

**原因**: サービスアカウントにSecret Managerアクセス権限がない

**対処法**:
```bash
gcloud secrets add-iam-policy-binding JWT_SECRET_KEY \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/secretmanager.secretAccessor" \
    --project=${GCP_PROJECT_ID}
```

### エラー: "JWT_SECRET_KEY is too short"

**原因**: シークレットキーが32文字未満

**対処法**:
- 64文字以上のランダムキーを再生成してください

---

## シークレットのローテーション（本番環境）

定期的にシークレットキーをローテーションすることを推奨します：

### 1. 新しいシークレットバージョンを作成

```bash
echo -n "新しいシークレットキー" | gcloud secrets versions add JWT_SECRET_KEY \
    --data-file=- \
    --project=${GCP_PROJECT_ID}
```

### 2. アプリケーションを再起動

アプリケーションは起動時に最新バージョンのシークレットを取得します。

### 3. 古いバージョンを無効化（オプション）

```bash
# 古いバージョン番号を確認
gcloud secrets versions list JWT_SECRET_KEY --project=${GCP_PROJECT_ID}

# 特定バージョンを無効化
gcloud secrets versions disable VERSION_NUMBER \
    --secret="JWT_SECRET_KEY" \
    --project=${GCP_PROJECT_ID}
```

---

## 参考リンク

- [Google Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [Best Practices for Managing Secrets](https://cloud.google.com/secret-manager/docs/best-practices)
