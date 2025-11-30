# ストア公開準備チェックリスト

**作成日**: 2025-11-28
**対象ビルド**: LLM機能無効版（ストア審査用）
**対象ストア**: Apple App Store / Google Play Store

---

## 概要

このドキュメントは、ノートアプリをApp StoreおよびGoogle Play Storeに公開するための準備状況と対応が必要な項目をまとめたものです。

### ストア審査用ビルドの特徴
- LLM機能を環境変数で無効化（`EXPO_PUBLIC_LLM_ENABLED=false`）
- ログイン不要で利用可能
- カテゴリとタグで整理できるローカルノートアプリ

---

## チェックリスト

### クリティカル（審査で確実にリジェクト）

| # | 項目 | 状態 | 対応内容 | 完了 |
|---|------|------|----------|------|
| 1 | プライバシーポリシーURLの設定 | 対応済み | `app.json`にプライバシーポリシーURLを追加 | [x] |
| 2 | プライバシーポリシーのプレースホルダー修正 | 対応済み | `/docs/privacy_policy.md`を全面更新 | [x] |
| 3 | 本番環境ファイルの作成 | 対応済み | `.env.production`を作成（LLM無効） | [x] |
| 4 | Android Deep LinkのURL修正 | 対応済み | `api.noteapp.iwamaki.app`に変更 | [x] |
| 5 | EASビルド設定の確認 | 対応済み | `store-review`プロファイルを追加 | [x] |

### 高優先度（審査に影響する可能性あり）

| # | 項目 | 状態 | 対応内容 | 完了 |
|---|------|------|----------|------|
| 6 | エラーログ送信の同意UI | 対応済み | 設定画面に「プライバシーとデータ」セクション追加、トグルで有効/無効化可能 | [x] |
| 7 | フィードバック送信時のプライバシー通知 | 対応済み | フィードバックモーダルに収集データの説明を追加 | [x] |
| 8 | 利用規約の作成 | 対応済み | `/docs/terms_of_service.md`を作成、設定画面にリンク追加 | [x] |
| 9 | サポート連絡先の追加 | 対応済み | `app.json`と`privacy_policy.md`に追加 | [x] |

### 中優先度（品質向上）

| # | 項目 | 状態 | 対応内容 | 完了 |
|---|------|------|----------|------|
| 10 | LLM無効時のナビゲーション確認 | 確認済み | `isLLMFeatureAvailable`で適切にガードされていることを確認 | [x] |
| 11 | オフライン動作テスト | 確認済み | ローカルノート機能は`expo-file-system`使用でオフライン対応済み | [x] |
| 12 | ネットワーク状態インジケーター | 保留 | LLM無効ビルドでは必須ではない。初回リリース後の改善項目として保留 | [-] |
| 13 | インポート/エクスポートのエラー表示改善 | 対応済み | インポート結果メッセージをi18n対応に変更（成功/失敗件数表示） | [x] |

### 低優先度（改善推奨）

| # | 項目 | 状態 | 対応内容 | 完了 |
|---|------|------|----------|------|
| 14 | ngrokヘッダーの条件分岐 | 未対応 | 開発環境のみに限定 | [ ] |
| 15 | デバイスIDリセット機能 | 未対応 | 設定画面にデバイスIDリセットオプションを追加 | [ ] |
| 16 | HTTPタイムアウトの最適化 | 未確認 | 操作種別ごとに適切なタイムアウト値を設定 | [ ] |

---

## 詳細説明

### 1. プライバシーポリシーURL

**現状**:
- `/docs/privacy_policy.md`は存在するがプレースホルダーリンクあり
- `app.json`にプライバシーポリシーURLが未設定

**必要な対応**:
1. プライバシーポリシーを公開URLでホスティング
2. `app.json`に以下を追加:
   ```json
   "expo": {
     "extra": {
       "privacyPolicyUrl": "https://実際のドメイン/privacy"
     }
   }
   ```
3. `/docs/privacy_policy.md`内の`https://yourwebsite.com/privacy`を実際のURLに更新

**関連ファイル**:
- `/app.json`
- `/docs/privacy_policy.md`

---

### 2. 本番環境設定

**現状**:
- `.env.production`が存在しない（`.env.production.bak`のみ）
- `.env.production.bak`にはGoogle OAuth Client IDが含まれている

**必要な対応**:
1. `.env.production`を作成:
   ```bash
   EXPO_PUBLIC_API_BASE_URL=https://api.noteapp.iwamaki.app
   EXPO_PUBLIC_LOG_LEVEL=error
   EXPO_PUBLIC_LOG_CATEGORIES=all
   EXPO_PUBLIC_LLM_ENABLED=false
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<実際のクライアントID>
   ```

**関連ファイル**:
- `.env.production.bak`
- `.env.production`（新規作成）

---

### 3. Android Deep Link設定

**現状**:
`app.json`の`android.intentFilters`にTailscale URLが設定されている:
```json
"data": [
  {
    "scheme": "https",
    "host": "iwamaki.tail80450d.ts.net",
    "pathPrefix": "/auth"
  }
]
```

**必要な対応**:
本番ドメインに変更:
```json
"data": [
  {
    "scheme": "https",
    "host": "api.noteapp.iwamaki.app",
    "pathPrefix": "/auth"
  }
]
```

**関連ファイル**:
- `/app.json`

---

### 4. EASビルド設定

**現状**: 未確認

**必要な対応**:
`eas.json`にストア審査用プロファイルを追加または確認:
```json
{
  "build": {
    "store-review": {
      "extends": "production",
      "env": {
        "EXPO_PUBLIC_LLM_ENABLED": "false"
      }
    }
  }
}
```

**関連ファイル**:
- `/eas.json`

---

### 5. エラーログ送信の同意

**現状**: ✓ 対応済み
- 設定画面に「プライバシーとデータ」セクションを追加
- エラーレポート送信のトグルスイッチで有効/無効化可能
- デフォルトは無効（`diagnosticDataEnabled: false`）
- プライバシーポリシー・利用規約へのリンクも追加

**実装内容**:
1. `SettingsScreen.tsx`に「プライバシーとデータ」セクション追加
2. `systemSettings.diagnosticDataEnabled`でトグル制御
3. `logger.setSendToBackend()`で実際の送信を制御
4. 初期化時（`initializeErrorLogService.ts`）に設定を反映

**関連ファイル**:
- `/app/features/settings/SettingsScreen.tsx`
- `/app/features/settings/types/systemSettings.types.ts`
- `/app/initialization/tasks/initializeErrorLogService.ts`
- `/app/i18n/locales/ja.json`, `/app/i18n/locales/en.json`

---

### 6. LLM機能の無効化確認

**現状**:
- `EXPO_PUBLIC_LLM_ENABLED === 'true'`で機能切り替え
- チャットバー: 条件付きレンダリングで対応済み ✓
- ナビゲーション: LLM画面は条件付きで追加 ✓

**確認事項**:
- `TokenPurchase`, `ModelSelection`への直接遷移コードがないか
- 設定画面のLLM関連項目が適切に非表示になるか

**関連ファイル**:
- `/app/navigation/RootNavigator.tsx`
- `/app/features/settings/settingsStore.ts`
- `/app/features/settings/SettingsScreen.tsx`

---

## 良好な実装（対応不要）

以下は適切に実装されており、追加対応は不要です:

| 項目 | 状態 | 備考 |
|------|------|------|
| LLM機能の条件付き無効化 | ✓ 対応済み | `isLLMFeatureAvailable`で制御 |
| 匿名フィードバック送信 | ✓ 対応済み | 認証不要で送信可能 |
| 匿名エラーログ送信 | ✓ 対応済み | 認証不要で送信可能（commit 9b66d3f2） |
| バイナリファイルのエクスポート | ✓ 対応済み | Base64デコード修正済み（commit 7a3634ec） |
| ロガー使用 | ✓ 対応済み | console.log直接使用なし |
| iOS bundleIdentifier | ✓ 対応済み | ストア審査用に設定済み（commit 42790e5c） |

---

## ビルド手順（ストア審査用）

### 事前準備
```bash
# 1. 環境変数ファイルを確認（作成済み）
cat .env.production | grep LLM
# 出力: EXPO_PUBLIC_LLM_ENABLED=false

# 2. EASプロファイルを確認
cat eas.json | grep -A5 store-review
```

### ビルド実行
```bash
# iOS（App Store用）- store-reviewプロファイルを使用
eas build --platform ios --profile store-review

# Android（Google Play用）- store-reviewプロファイルを使用
eas build --platform android --profile store-review

# 両プラットフォーム同時ビルド
eas build --platform all --profile store-review
```

### ビルド後の確認
- [ ] アプリ起動時にクラッシュしない
- [ ] ログイン画面がスキップされる（または匿名で利用可能）
- [ ] ノートの作成・編集・削除が正常動作
- [ ] カテゴリとタグの管理が正常動作
- [ ] LLM関連のUIが表示されない
- [ ] 設定画面が正常表示

---

## 参考リンク

- [Apple App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Developer Policy Center](https://play.google.com/about/developer-content-policy/)
- [Expo EAS Build Documentation](https://docs.expo.dev/build/introduction/)

---

## 更新履歴

| 日付 | 更新内容 |
|------|----------|
| 2025-11-28 | 初版作成（コードベース調査結果をまとめ） |
| 2025-11-28 | クリティカル項目（#1-5）と#9を完了 |
| 2025-11-28 | 高優先度項目（#6-8）を完了 - エラーログ同意UI、フィードバックプライバシー通知、利用規約作成 |
| 2025-11-29 | 中優先度項目（#10-13）を完了 - LLMナビゲーション確認、オフライン動作確認、インポートi18n対応 |
