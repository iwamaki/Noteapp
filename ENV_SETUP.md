# 環境変数設定ガイド

## 概要

NoteAppでは、開発環境と本番環境で異なるAPIエンドポイントを使用するため、環境変数を適切に管理する必要があります。

## 🚨 重要な修正

以前、環境変数名が不一致だった問題が修正されました:
- **修正前**: `.env` で `EXPO_PUBLIC_API_URL` を使用していたが、コードは `EXPO_PUBLIC_API_BASE_URL` を参照
- **修正後**: すべて `EXPO_PUBLIC_API_BASE_URL` に統一

## ファイル構成

```
.
├── .env                    # 現在使用中の環境変数（Gitで管理されない）
├── .env.development        # 開発環境用の設定
├── .env.production         # 本番環境用の設定
└── .env.example            # 環境変数のテンプレート
```

## 環境変数の説明

### EXPO_PUBLIC_API_BASE_URL
APIサーバーのベースURL

- **開発環境**: ngrokのURL（例: `https://xxxxx.ngrok-free.app`）またはローカルサーバー（`http://localhost:8000`）
- **本番環境**: `https://api.noteapp.iwamaki.app`

### EXPO_PUBLIC_LOG_LEVEL
ログの出力レベル

- `debug`: すべてのログを表示（開発用）
- `info`: 重要な情報のみ表示
- `warn`: 警告とエラーのみ表示
- `error`: エラーのみ表示（本番推奨）
- `none`: ログを表示しない

### EXPO_PUBLIC_LOG_CATEGORIES
ログカテゴリのフィルタリング

- `all`: すべてのカテゴリを表示
- カンマ区切り: 特定カテゴリのみ表示（例: `chat,llm,system`）

利用可能なカテゴリ:
- `chat` - チャット関連
- `chatService` - チャットサービス
- `system` - システム
- `note` - ノート機能
- `diff` - 差分処理
- `llm` - LLM関連
- `default` - デフォルト
- `platformInfo` - プラットフォーム情報
- `tree` - ツリー構造
- `file` - ファイル操作

### EXPO_PUBLIC_LLM_ENABLED
LLM機能の有効/無効

- `true`: LLM機能を有効化
- `false`: LLM機能を無効化

## セットアップ手順

### 初回セットアップ

1. テンプレートから環境変数ファイルを作成:
   ```bash
   cp .env.example .env
   ```

2. `.env` ファイルを編集して、必要な値を設定

### 開発環境での使用

開発時は以下のコマンドを使用:

```bash
# 開発環境の環境変数を使用してExpoを起動
npm run start:dev

# Android開発環境でビルド&起動
npm run android:dev

# 環境変数のみ切り替え（手動でExpoを起動する場合）
npm run env:dev
```

### 本番環境での使用

本番ビルド時は以下のコマンドを使用:

```bash
# 本番環境の環境変数を使用してExpoを起動
npm run start:prod

# Android本番環境でビルド&起動
npm run android:prod

# 本番ビルド作成
npm run build:prod

# プレビュービルド作成
npm run build:preview

# 環境変数のみ切り替え（手動でExpoを起動する場合）
npm run env:prod
```

## npm スクリプト一覧

| コマンド | 説明 |
|---------|------|
| `npm run env:dev` | 開発環境の環境変数に切り替え |
| `npm run env:prod` | 本番環境の環境変数に切り替え |
| `npm run start:dev` | 開発環境でExpoを起動 |
| `npm run start:prod` | 本番環境でExpoを起動 |
| `npm run android:dev` | 開発環境でAndroidアプリを起動 |
| `npm run android:prod` | 本番環境でAndroidアプリを起動 |
| `npm run build:dev` | 開発ビルドを作成 |
| `npm run build:preview` | プレビュービルドを作成 |
| `npm run build:prod` | 本番ビルドを作成 |

## ngrokの設定（開発環境）

ローカル開発サーバーを外部からアクセス可能にするため、ngrokを使用:

```bash
# ngrokでlocalhostを公開
ngrok http 8000
```

ngrokのURLが表示されたら、`.env.development` の `EXPO_PUBLIC_API_BASE_URL` を更新してください。

## トラブルシューティング

### 環境変数が反映されない

1. `.env` ファイルが正しく作成されているか確認
2. Expoの開発サーバーを再起動（`r` キーを押す）
3. アプリのキャッシュをクリア:
   ```bash
   expo start -c
   ```

### APIに接続できない

1. `.env` の `EXPO_PUBLIC_API_BASE_URL` が正しいか確認
2. ローカルサーバーが起動しているか確認（開発環境の場合）
3. ngrok URLが有効か確認（開発環境の場合）
4. 本番環境のAPIサーバーが稼働しているか確認（本番環境の場合）

### ビルド時に環境変数が設定されない

EASビルドでは、環境変数は自動的にコピーされません。ビルド前に以下を実行:

```bash
npm run env:dev   # 開発ビルドの場合
npm run env:prod  # 本番ビルドの場合
```

## セキュリティ注意事項

- `.env` と `.env.production` はGitにコミットされません
- APIキーなどの秘密情報は環境変数に含めないでください
- 秘密情報はバックエンド側で管理してください
