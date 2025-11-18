# Google OAuth2 セットアップガイド (Authorization Code Flow)

このドキュメントでは、NoteAppでGoogle OAuth2認証（**Authorization Code Flow**）を使用するために必要なGoogle Cloud Console設定を説明します。

## OAuth実装について

本アプリは **Authorization Code Flow** を採用しています。これは以下のセキュリティ上の理由からです:

- **Client Secret がサーバー側のみで使用される** - クライアントサイドに秘密情報が露出しない
- **CSRF攻撃保護** - state パラメータによる保護
- **推奨される標準フロー** - Google が推奨する最もセキュアな認証方式

## 前提条件

- Googleアカウント
- Google Cloud Console へのアクセス権限
- バックエンドサーバー（FastAPI）が稼働していること

## セットアップ手順

### 1. Google Cloud プロジェクトの作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 「プロジェクトを選択」→「新しいプロジェクト」をクリック
3. プロジェクト名を入力（例: `noteapp`）
4. 「作成」をクリック

### 2. OAuth同意画面の設定

1. 左側のメニューから「APIとサービス」→「OAuth同意画面」を選択
2. User Typeで「外部」を選択（テスト段階では「内部」も可）
3. 「作成」をクリック
4. 以下の情報を入力：
   - **アプリ名**: NoteApp
   - **ユーザーサポートメール**: あなたのメールアドレス
   - **デベロッパーの連絡先情報**: あなたのメールアドレス
5. 「保存して次へ」をクリック
6. スコープの設定（デフォルトで `.../auth/userinfo.email`, `.../auth/userinfo.profile` が含まれている）
7. 「保存して次へ」をクリック
8. テストユーザーの追加（テスト段階では必要に応じて追加）
9. 「保存して次へ」をクリック

### 3. OAuth 2.0 クライアントIDの作成

#### Android用クライアントID

1. 「APIとサービス」→「認証情報」を選択
2. 「認証情報を作成」→「OAuth クライアントID」をクリック
3. アプリケーションの種類で「Android」を選択
4. 以下の情報を入力：
   - **名前**: NoteApp (Android)
   - **パッケージ名**: `com.iwash.NoteApp`（app.jsonの`android.package`と一致）
   - **SHA-1 署名証明書フィンgerprint**: 開発用証明書のSHA-1

##### SHA-1の取得方法（開発用）

```bash
# Expo開発ビルド用のSHA-1を取得
# 1. Expo Goを使用する場合
# → Google OAuth2はExpo Goでは制限があるため、開発ビルドを推奨

# 2. EAS Buildを使用する場合
eas credentials

# 3. ローカルのキーストアから取得する場合（Androidのみ）
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

5. 「作成」をクリック
6. **Client ID**をコピーして保存

#### iOS用クライアントID

1. 「認証情報を作成」→「OAuth クライアントID」をクリック
2. アプリケーションの種類で「iOS」を選択
3. 以下の情報を入力：
   - **名前**: NoteApp (iOS)
   - **バンドルID**: `com.iwash.NoteApp`（app.jsonの`ios.bundleIdentifier`と一致）
4. 「作成」をクリック
5. **Client ID**をコピーして保存

#### Web Application用クライアントID（**必須** - Authorization Code Flow用）

1. 「認証情報を作成」→「OAuth クライアントID」をクリック
2. アプリケーションの種類で「**ウェブアプリケーション**」を選択
3. 以下の情報を入力：
   - **名前**: NoteApp (Backend)
   - **承認済みのリダイレクトURI**:
     - 開発環境: `http://localhost:8000/api/auth/google/callback`
     - 本番環境: `https://your-domain.com/api/auth/google/callback`
     - ngrok使用時: `https://<your-ngrok-id>.ngrok-free.app/api/auth/google/callback`
4. 「作成」をクリック
5. **Client ID** と **Client Secret** の両方をコピーして保存

**重要**: Client Secret は絶対に公開しないこと。サーバー側の環境変数のみに保存してください。

### 4. 環境変数の設定

#### フロントエンド (.env)

プロジェクトルートに `.env` ファイルを作成し、以下を追加：

```bash
# Google OAuth2 Client IDs
EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=<Android用Client ID>.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=<iOS用Client ID>.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_CLIENT_ID_EXPO=<Web用Client ID>.apps.googleusercontent.com

# API Base URL
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000
```

**注意**: `.env` ファイルは `.gitignore` に追加してGitにコミットしないこと。

#### バックエンド (server/.env)

`server/.env` ファイルに以下を追加：

```bash
# Google OAuth2 設定 (Authorization Code Flow)
GOOGLE_CLIENT_ID=<Web Application用Client ID>.apps.googleusercontent.com
GOOGLE_WEB_CLIENT_SECRET=<Web Application用Client Secret>
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:8000/api/auth/google/callback

# 本番環境の場合
# GOOGLE_OAUTH_REDIRECT_URI=https://your-domain.com/api/auth/google/callback
```

**セキュリティ警告**:
- `GOOGLE_WEB_CLIENT_SECRET` は **絶対にGitにコミットしないこと**
- `.gitignore` に `.env` ファイルが含まれていることを確認
- 本番環境では環境変数またはSecret Managerを使用

### 5. Deep Link / App Links の設定

Authorization Code Flowでは、OAuth認証後にアプリに戻るためのDeep LinkまたはApp Linksが必要です。

#### app.json の設定確認

```json
{
  "expo": {
    "scheme": "noteapp",
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "https",
              "host": "your-domain.com",
              "pathPrefix": "/auth"
            },
            {
              "scheme": "com.googleusercontent.apps.461522030982",
              "pathPrefix": "/oauth2redirect"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

**Deep Link フロー**:
1. ユーザーが「Googleでログイン」をタップ
2. バックエンドが認証URLを生成（state付き）
3. WebBrowserでGoogle認証画面を開く
4. ユーザーが認証を完了
5. バックエンドの `/api/auth/google/callback` にリダイレクト
6. バックエンドがトークンを交換し、JWTを生成
7. Deep Link経由でアプリにトークンを返却

### 6. 動作確認

#### 開発環境での確認

1. バックエンドサーバーを起動：
   ```bash
   cd server
   docker-compose up
   ```

2. データベースマイグレーションを実行（初回のみ）：
   ```bash
   sqlite3 server/billing.db < server/migrations/001_add_google_oauth_to_users.sql
   ```

3. フロントエンドを起動：
   ```bash
   npm start
   ```

4. 設定画面を開く
5. 「Googleでログイン」ボタンをタップ
6. Googleアカウントでログイン
7. ログインが成功すると、アカウント情報（メールアドレス、名前）が表示される

## トラブルシューティング

### エラー: "Invalid client"

- Google Cloud ConsoleでOAuth 2.0 クライアントIDが正しく作成されているか確認
- 環境変数のClient IDが正しいか確認
- アプリのパッケージ名/バンドルIDがGoogle Cloud Consoleと一致しているか確認

### エラー: "redirect_uri_mismatch"

- OAuth同意画面で承認済みのリダイレクトURIが正しく設定されているか確認
- app.jsonの`scheme`が正しく設定されているか確認

### エラー: "Token exchange failed"

- バックエンドの `GOOGLE_WEB_CLIENT_SECRET` が正しく設定されているか確認
- `GOOGLE_OAUTH_REDIRECT_URI` がGoogle Cloud Consoleの設定と一致しているか確認

### エラー: "Invalid state"

- CSRF保護のためのstateパラメータが期限切れまたは無効
- 認証フローをやり直してください
- サーバー側の `oauth_state_manager.py` で state の有効期限（デフォルト5分）を確認

### Deep Link が動作しない

- Android: Intent Filterが正しく設定されているか確認（AndroidManifest.xml）
- iOS: URL Schemeが正しく設定されているか確認（Info.plist）
- WebBrowserのセッションが正しく終了しているか確認

## 本番環境への移行

本番環境では以下の追加設定が必要です：

1. **OAuth同意画面の公開**
   - Google Cloud Consoleで「公開ステータス」を「本番環境」に変更
   - Google の審査を受ける必要がある場合があります

2. **本番用証明書の登録**
   - Play StoreとApp Store用の本番証明書のSHA-1を登録
   - EAS Buildを使用する場合: `eas credentials` で証明書を管理

3. **リダイレクトURIの更新**
   - 本番環境のドメインをリダイレクトURIに追加

4. **環境変数の分離**
   - 開発環境と本番環境で異なるClient IDを使用
   - EAS Secretsを使用して本番環境の認証情報を管理

## 参考資料

- [Google OAuth 2.0ドキュメント](https://developers.google.com/identity/protocols/oauth2)
- [Expo Authentication Guide](https://docs.expo.dev/guides/authentication/)
- [expo-auth-session ドキュメント](https://docs.expo.dev/versions/latest/sdk/auth-session/)
