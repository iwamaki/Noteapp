# Google OAuth2 設定ガイド - Web Application Client ID

**作成日:** 2025/11/17
**目的:** Custom URI Scheme（非推奨）から Web Application + Authorization Code Flow への移行

---

## 🎯 なぜ Web Application Client ID を使うのか

### 現在の問題点

1. **Android Client ID + Implicit Flow** を使用中
   - ID Token を直接フロントエンドが受け取る
   - Custom URI Scheme (`com.googleusercontent.apps.*://`) を使用

2. **Google のセキュリティ変更（2025年）**
   - Custom URI Scheme は **app impersonation attacks に脆弱**
   - 新規 Android アプリではデフォルトで無効化
   - 段階的に廃止される予定

### 新しい構成（推奨）

- **Web Application Client ID** を使用
- **Authorization Code Flow + PKCE**
- バックエンド（FastAPI）でトークン交換
- Client Secret を安全に管理

---

## 📋 Google Cloud Console 設定手順

### 前提条件

- Google Cloud プロジェクトが作成済み
- APIs & Services が有効化済み
- プロジェクト: NoteApp
- テストユーザー: `aramaki1027@gmail.com`

---

## Step 1: OAuth 同意画面の設定

### 1.1 同意画面の基本設定

```
Google Cloud Console > APIs & Services > OAuth 同意画面
```

**設定項目:**

| 項目 | 値 |
|------|-----|
| User Type | 外部（External） |
| アプリ名 | NoteApp |
| ユーザーサポートメール | aramaki1027@gmail.com |
| アプリのロゴ | （オプション） |
| アプリドメイン - ホームページ | https://noteapp.iwamaki.app |
| アプリドメイン - プライバシーポリシー | https://noteapp.iwamaki.app/privacy |
| アプリドメイン - 利用規約 | https://noteapp.iwamaki.app/terms |
| 承認済みドメイン | iwamaki.app |
| デベロッパーの連絡先情報 | aramaki1027@gmail.com |

**保存して次へ**

### 1.2 スコープの設定

**追加するスコープ:**

```
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/userinfo.profile
openid
```

これにより以下の情報が取得可能:
- メールアドレス
- 表示名（name）
- プロフィール画像（picture）
- Google User ID（sub）

**保存して次へ**

### 1.3 テストユーザーの追加

**テストモード時に必要:**

```
+ ADD USERS

aramaki1027@gmail.com
```

**保存して次へ**

### 1.4 確認

設定内容を確認して **ダッシュボードに戻る**

---

## Step 2: Web Application Client ID の作成

### 2.1 認証情報の作成

```
Google Cloud Console > APIs & Services > 認証情報
```

**+ 認証情報を作成 > OAuth クライアント ID**

### 2.2 アプリケーションの種類

**重要: 必ず「ウェブ アプリケーション」を選択**

```
アプリケーションの種類: ウェブ アプリケーション
```

### 2.3 名前

```
名前: NoteApp Web Client
```

### 2.4 承認済みの JavaScript 生成元（オプション）

この項目は **空欄でOK**（モバイルアプリでは不要）

### 2.5 承認済みのリダイレクト URI

**重要: ここが最も重要な設定**

#### 開発環境用

```
http://localhost:8000/api/auth/google/callback
https://0bbc35a79143.ngrok-free.app/api/auth/google/callback
```

**注意:**
- ngrok URL は **起動のたびに変わる** ため、都度更新が必要
- または ngrok の固定ドメイン機能を使用（有料）

#### 本番環境用

```
https://api.noteapp.iwamaki.app/api/auth/google/callback
```

#### リダイレクト URI のルール

✅ **OK:**
- `https://` で始まる URL
- `http://localhost` または `http://127.0.0.1`（開発用のみ）
- パスは必須（例: `/api/auth/google/callback`）

❌ **NG:**
- `http://`（localhost 以外）
- カスタム URI スキーム（`com.googleusercontent.apps.*://`）
- ワイルドカード（`https://*.example.com`）

### 2.6 作成

**作成** ボタンをクリック

---

## Step 3: 認証情報の取得

### 3.1 Client ID と Client Secret のコピー

作成完了後、ポップアップが表示されます:

```
クライアント ID:
xxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com

クライアント シークレット:
GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**この情報をメモ！**（後で環境変数に設定）

### 3.2 JSON ダウンロード（オプション）

右側の **ダウンロード（JSON）** アイコンをクリックして保存:

```json
{
  "web": {
    "client_id": "xxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com",
    "project_id": "noteapp-xxxxx",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "redirect_uris": [
      "http://localhost:8000/api/auth/google/callback",
      "https://api.noteapp.iwamaki.app/api/auth/google/callback"
    ]
  }
}
```

**⚠️ このファイルは .gitignore に追加！**

---

## Step 4: バックエンド環境変数の設定

### 4.1 開発環境（`.env.development`）

```bash
# Google OAuth2 - Web Application Client ID
GOOGLE_CLIENT_ID=xxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback

# または ngrok 使用時
# GOOGLE_REDIRECT_URI=https://0bbc35a79143.ngrok-free.app/api/auth/google/callback
```

### 4.2 本番環境（`.env.production`）

```bash
# Google OAuth2 - Web Application Client ID
GOOGLE_CLIENT_ID=xxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_REDIRECT_URI=https://api.noteapp.iwamaki.app/api/auth/google/callback
```

**セキュリティ注意:**
- `.env.*` ファイルは **絶対に Git にコミットしない**
- `.gitignore` に `.env*` が含まれているか確認
- 本番環境では環境変数を Docker Compose または Cloud Run で設定

---

## Step 5: フロントエンド環境変数の設定

### 5.1 `.env`（開発環境）

```bash
# Google OAuth2 - Web Application Client ID（フロントエンド用）
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
```

### 5.2 `.env.production`

```bash
# Google OAuth2 - Web Application Client ID（フロントエンド用）
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
```

**注意:**
- フロントエンドでは **Client Secret は不要**（使用禁止）
- Client ID のみを使用

---

## 📌 重要な注意点

### リダイレクト URI の変更

**変更が反映されるまで 5分〜数時間かかることがあります。**

変更後にテストする場合:
1. 5分待つ
2. ブラウザのキャッシュをクリア
3. 新しいプライベートウィンドウで試す

### ngrok URL の更新

ngrok を再起動すると URL が変わるため、以下を実行:

```bash
# 1. 新しい ngrok URL を取得
ngrok http 8000

# 2. Google Cloud Console でリダイレクト URI を更新
https://console.cloud.google.com/apis/credentials

# 3. バックエンドの環境変数を更新
GOOGLE_REDIRECT_URI=https://新しいURL.ngrok-free.app/api/auth/google/callback

# 4. Docker コンテナを再起動
docker compose down && docker compose up -d
```

### テストモード vs 本番公開

**現在の状態: テストモード**

- テストユーザーのみがログイン可能
- 追加方法: OAuth 同意画面 > テストユーザー > + ADD USERS

**本番公開する場合:**

1. OAuth 同意画面 > 公開ステータス
2. **アプリを公開** をクリック
3. Google による審査が必要（数日〜数週間）
4. 審査完了後、全ユーザーがログイン可能

---

## 🔍 トラブルシューティング

### エラー: `redirect_uri_mismatch`

**原因:**
- リダイレクト URI が Google Console に登録されていない
- URI が完全一致していない（スラッシュの有無など）

**解決策:**
1. Google Console で登録済み URI を確認
2. バックエンドのログで実際に送信されている URI を確認
3. 完全一致させる（大文字小文字、スラッシュ含む）

### エラー: `invalid_client`

**原因:**
- Client Secret が間違っている
- Client ID が間違っている

**解決策:**
1. `.env` ファイルの値を再確認
2. Google Console で Client Secret を再確認
3. コピペ時の前後スペースに注意

### エラー: `Access blocked: This app's request is invalid`

**原因:**
- OAuth 同意画面が未設定
- テストモードでテストユーザーに追加されていない

**解決策:**
1. OAuth 同意画面 > テストユーザー に追加
2. または、アプリを公開する

---

## 🔐 セキュリティベストプラクティス

### DO ✅

- **Client Secret をバックエンドのみで使用**
- 環境変数で管理（`.env` ファイル）
- `.gitignore` に `.env*` を追加
- HTTPS を使用（本番環境）
- PKCE を有効化
- リダイレクト URI を最小限に絞る

### DON'T ❌

- Client Secret をフロントエンドに埋め込む
- Client Secret を Git にコミット
- ワイルドカードのリダイレクト URI
- HTTP を使用（localhost 以外）
- 不要なスコープを要求

---

## 📚 参考資料

### 公式ドキュメント

- [Google OAuth 2.0 for Web Server Apps](https://developers.google.com/identity/protocols/oauth2/web-server)
- [OAuth 2.0 Scopes for Google APIs](https://developers.google.com/identity/protocols/oauth2/scopes)
- [Google Cloud Console](https://console.cloud.google.com/)

### セキュリティ

- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [PKCE RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636)

---

## ✅ 設定完了チェックリスト

- [ ] OAuth 同意画面を設定した
- [ ] スコープ（email, profile, openid）を追加した
- [ ] テストユーザーに `aramaki1027@gmail.com` を追加した
- [ ] Web Application Client ID を作成した
- [ ] リダイレクト URI（開発・本番）を登録した
- [ ] Client ID と Client Secret をメモした
- [ ] バックエンドの `.env` に設定した
- [ ] フロントエンドの `.env` に設定した
- [ ] `.gitignore` に `.env*` が含まれているか確認した
- [ ] ngrok 使用時は URL 更新手順を理解した

---

**次のステップ:** バックエンド実装（Authorization Code Flow + PKCE）
