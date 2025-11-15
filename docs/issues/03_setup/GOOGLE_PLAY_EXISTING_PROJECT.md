# 既存のGoogle Cloud Project連携の確認方法

## 前提: Google Play Consoleは既にGoogle Cloudと連携済み

アプリをGoogle Play Consoleに登録した時点で、自動的にGoogle Cloud Projectが作成されています。

---

## Step 1: 連携済みプロジェクトを確認

### 1-1. Google Play Consoleにアクセス
https://play.google.com/console/

### 1-2. アプリを選択
あなたのアプリ「NoteApp」を選択

### 1-3. APIアクセス画面に移動
1. 左側メニュー → 「設定」
2. 「APIアクセス」をクリック

### 1-4. プロジェクト情報を確認
画面上部に以下のような情報が表示されます:

```
このアプリは Google Cloud Project とリンクされています

プロジェクト名: pc-api-123456789-androidpublisher
プロジェクトID: pc-api-123456789
プロジェクト番号: 123456789
```

**このプロジェクトIDをメモしてください** 📝

---

## Step 2: Google Cloud Consoleで同じプロジェクトにアクセス

### 2-1. Google Cloud Consoleにアクセス
https://console.cloud.google.com/

### 2-2. プロジェクトを選択
1. 画面上部の「プロジェクトを選択」をクリック
2. リストから **Step 1-4でメモしたプロジェクト** を探す
   - プロジェクト名: `pc-api-123456789-androidpublisher` のような名前
3. そのプロジェクトを選択

**重要**: 新しいプロジェクトは作成しないでください！既存のものを使います。

---

## Step 3: このプロジェクトでAPI設定を行う

これ以降は、先ほどの `GOOGLE_PLAY_API_SETUP.md` の **Step 2** から進めてください。

```bash
# Step 2: Google Play Android Developer APIを有効化
# ↓
# Step 3: サービスアカウントの作成
# ↓
# Step 4: JSONキーのダウンロード
# ↓
# Step 5: Play Consoleで権限付与
```

---

## よくある質問

### Q1: プロジェクトが見つからない
**A**: 以下を確認してください:
- Google Play ConsoleとGoogle Cloud Consoleで**同じGoogleアカウント**でログインしているか
- プロジェクト名で検索（`pc-api-`で始まることが多い）
- 組織フィルタを確認（組織が設定されている場合）

### Q2: 複数のプロジェクトがある
**A**:
- Google Play Console → APIアクセス で表示されている**プロジェクトID**と一致するものを選択
- 間違ったプロジェクトを選ぶと、サービスアカウントがPlay Consoleで認識されません

### Q3: 新しいプロジェクトを作成してしまった
**A**:
- 作成したプロジェクトは削除してOK
- 必ず **Play Consoleで既にリンクされているプロジェクト** を使用してください

---

## 図解: プロジェクトの関係

```
┌─────────────────────────────┐
│   Google Play Console       │
│   (あなたのアプリ)            │
│                             │
│   自動作成済み               │
│   ↓                         │
│   pc-api-XXXXXX             │ ← このプロジェクトを使う
└──────────┬──────────────────┘
           │
           │ リンク済み
           ↓
┌──────────────────────────────┐
│   Google Cloud Console       │
│                              │
│   pc-api-XXXXXX              │ ← 同じプロジェクト
│   ├─ Google Play API (有効化)│
│   ├─ サービスアカウント作成   │
│   └─ JSONキー取得            │
└──────────────────────────────┘
```

---

## トラブルシューティング

### エラー: "プロジェクトが見つかりません"
**原因**:
- 異なるGoogleアカウントでログインしている
- 組織の権限がない

**解決策**:
1. Google Play Consoleで使用しているアカウントを確認
2. Google Cloud Consoleで同じアカウントでログイン
3. それでも見つからない場合、組織の管理者に権限を依頼

### 注意: Google Play Console Team Account
もしチームアカウントで作業している場合:
- プロジェクトの所有者（オーナー）権限が必要
- 管理者権限だけでは不十分な場合があります
- チームのオーナーにサービスアカウント作成を依頼するか、権限を付与してもらってください

---

## 次のステップ

1. ✅ 既存のGoogle Cloud Projectを確認
2. → `GOOGLE_PLAY_API_SETUP.md` の Step 2 に進む
3. → サービスアカウントを作成
4. → Play Consoleで権限を付与
