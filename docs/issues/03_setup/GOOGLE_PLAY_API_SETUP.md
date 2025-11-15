# Google Play Console と Google Cloud Console の連携手順

## 概要
Google Play Billing APIを使用してサブスクリプションのレシート検証を行うための設定手順です。

---

## Step 1: Google Cloud Consoleでプロジェクトを作成

### 1-1. Google Cloud Consoleにアクセス
https://console.cloud.google.com/

### 1-2. 新しいプロジェクトを作成
1. 画面上部の「プロジェクトを選択」をクリック
2. 「新しいプロジェクト」をクリック
3. プロジェクト名を入力（例: `noteapp-billing`）
4. 「作成」をクリック

**重要**: このプロジェクトは**Play Consoleにリンクされているプロジェクトと同じ**である必要があります。

---

## Step 2: Google Play Android Developer APIを有効化

### 2-1. APIライブラリに移動
1. Google Cloud Consoleで作成したプロジェクトを選択
2. 左側メニュー → 「APIとサービス」 → 「ライブラリ」

### 2-2. APIを有効化
1. 検索バーで「Google Play Android Developer API」を検索
2. 検索結果から「Google Play Android Developer API」を選択
3. 「有効にする」をクリック

**確認**: 有効化されると「APIが有効です」と表示されます。

---

## Step 3: サービスアカウントの作成

### 3-1. サービスアカウント画面に移動
1. Google Cloud Console
2. 左側メニュー → 「IAMと管理」 → 「サービスアカウント」
3. 「サービスアカウントを作成」をクリック

### 3-2. サービスアカウントの詳細を入力
1. **サービスアカウント名**: `play-billing-service` (任意)
2. **サービスアカウントID**: 自動生成される（例: `play-billing-service@noteapp-billing.iam.gserviceaccount.com`）
3. **説明**: `Google Play Billing API access for subscription verification`
4. 「作成して続行」をクリック

### 3-3. ロールの付与（オプション - スキップ可能）
- このステップはスキップして「続行」
- 権限はPlay Consoleで付与します

### 3-4. 完了
- 「完了」をクリック

---

## Step 4: サービスアカウントキー（JSON）をダウンロード

### 4-1. キーの作成
1. 作成したサービスアカウントをクリック
2. 「キー」タブに移動
3. 「鍵を追加」 → 「新しい鍵を作成」
4. **キーのタイプ**: JSON を選択
5. 「作成」をクリック

### 4-2. JSONファイルの保存
- 自動的にJSONファイルがダウンロードされます
- **重要**: このファイルは秘密情報です。安全に保管してください。
- ファイル名の例: `noteapp-billing-1234567890ab.json`

### 4-3. JSONファイルをサーバーに配置
```bash
# サーバーの適切な場所に配置
mkdir -p server/secrets
mv ~/Downloads/noteapp-billing-*.json server/secrets/service-account-key.json

# パーミッションを制限
chmod 600 server/secrets/service-account-key.json
```

---

## Step 5: Google Play Consoleでサービスアカウントに権限を付与

### 5-1. Google Play Consoleにアクセス
https://play.google.com/console/

### 5-2. APIアクセス画面に移動
1. アプリを選択
2. 左側メニュー → 「設定」 → 「APIアクセス」

### 5-3. サービスアカウントをリンク

**重要な注意事項**:
- 初めてAPIアクセスを設定する場合、Google Cloud Projectとのリンクが必要です
- 「Google Cloud Projectをリンク」ボタンが表示される場合は、Step 1で作成したプロジェクトを選択してください

### 5-4. サービスアカウントを招待
1. 「サービスアカウント」セクションで、Step 3で作成したサービスアカウントを探す
2. まだリストにない場合:
   - 画面を更新（F5）
   - 数分待つ（反映に時間がかかることがあります）
3. サービスアカウントの右側にある「アクセス権を付与」をクリック

### 5-5. 権限を設定
以下の権限を付与します：

**必須の権限**:
- ✅ **財務データの表示** (View financial data)
  - サブスクリプションの購入情報を取得するために必要

**推奨の追加権限**（必要に応じて）:
- ✅ **注文と定期購入を管理** (Manage orders and subscriptions)
  - サブスクリプションのキャンセル・返金処理を行う場合

### 5-6. 招待を送信
- 「招待を送信」をクリック
- **確認**: サービスアカウントのステータスが「有効」になることを確認

---

## Step 6: 環境変数の設定

### 6-1. `.env`ファイルを作成
```bash
cd server
cp .env.example .env
```

### 6-2. 環境変数を設定
`.env`ファイルに以下を追加:

```bash
# Google Play Billing API
GOOGLE_APPLICATION_CREDENTIALS=/app/secrets/service-account-key.json
ANDROID_PACKAGE_NAME=com.iwash.NoteApp

# Backend URL
BACKEND_URL=http://localhost:8000
```

**Docker使用時の注意**:
- パスは**コンテナ内のパス**を指定します
- `docker-compose.yml`でボリュームマウントを確認してください

---

## Step 7: 動作確認

### 7-1. バックエンドを起動
```bash
cd server
pip install -r requirements.txt
python -m src.main
```

### 7-2. APIの動作確認
ブラウザで以下にアクセス:
```
http://localhost:8000/
```

以下のようなレスポンスが返ればOK:
```json
{
  "message": "LLM File App API",
  "version": "1.0.0",
  "endpoints": {
    "payment": "/api/payment"
  }
}
```

### 7-3. テスト購入
1. アプリでサブスクリプションを購入（テストユーザーで）
2. ログを確認:
```bash
# フロントエンド
[usePurchaseHandlers] Verifying receipt with backend...
[subscriptionSync] Receipt verification result: { valid: true, ... }

# バックエンド
[GooglePlayVerifier] Subscription verification result: {...}
```

---

## トラブルシューティング

### エラー: "Service account not found"
**原因**: Play Consoleでサービスアカウントが認識されていない

**解決策**:
1. Google Cloud Projectが正しくリンクされているか確認
2. 数分待ってから再試行（同期に時間がかかる場合があります）
3. サービスアカウントのメールアドレスが正しいか確認

### エラー: "Permission denied"
**原因**: サービスアカウントに適切な権限が付与されていない

**解決策**:
1. Play Console → 設定 → APIアクセス
2. サービスアカウントの権限を確認
3. 「財務データの表示」権限が付与されているか確認

### エラー: "API not enabled"
**原因**: Google Play Android Developer APIが有効化されていない

**解決策**:
1. Google Cloud Console → APIとサービス → ライブラリ
2. 「Google Play Android Developer API」を検索
3. 「有効にする」をクリック

### エラー: "Invalid credentials"
**原因**: サービスアカウントキー（JSON）のパスが間違っている

**解決策**:
1. `GOOGLE_APPLICATION_CREDENTIALS`環境変数のパスを確認
2. JSONファイルが実際に存在するか確認
3. ファイルのパーミッションを確認（読み取り可能か）

---

## セキュリティのベストプラクティス

1. **サービスアカウントキーの管理**
   - ✅ Gitにコミットしない（`.gitignore`に追加）
   - ✅ 本番環境では環境変数またはSecret Managerを使用
   - ✅ 定期的にキーをローテーション

2. **最小権限の原則**
   - ✅ 必要最小限の権限のみ付与
   - ✅ テスト用と本番用でサービスアカウントを分ける

3. **アクセスログの監視**
   - ✅ Google Cloud Consoleでサービスアカウントの使用状況を監視
   - ✅ 異常なアクセスがないか定期的に確認

---

## 参考リンク

- [Google Play Developer API ドキュメント](https://developers.google.com/android-publisher)
- [サービスアカウントの作成と管理](https://cloud.google.com/iam/docs/service-accounts-create)
- [Play Console APIアクセス設定](https://support.google.com/googleplay/android-developer/answer/6112435)
