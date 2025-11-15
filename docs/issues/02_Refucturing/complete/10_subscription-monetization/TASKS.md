# サブスクリプション課金機能 タスク管理

このファイルは、実装の進捗を追跡するためのチェックリストです。

---

## Phase 0: 準備（完了）

- [x] プラン定義ファイル作成（`app/constants/plans.ts`）
- [x] 機能要件ファイル作成（`app/constants/features.ts`）
- [x] settingsStore更新（サブスクリプション情報追加）
- [x] バックエンド設定更新（`server/src/core/config.py`）
- [x] 実装計画書作成

---

## Phase 1: アプリ内課金 (Week 1-3)

### Week 1: IAP統合 & UI

#### App Store / Play Console設定
- [ ] App Store Connect でプロダクト登録
  - プロダクトID: `noteapp.pro.monthly`
  - 価格: ¥980/月
- [ ] Play Console でプロダクト登録
- [ ] スクリーンショット・説明文準備

#### IAP統合
- [ ] `npm install react-native-iap` インストール
- [ ] iOS設定（`cd ios && pod install`）
- [ ] Android設定
- [ ] `app/services/iapService.ts` 作成
  - [ ] IAPの初期化
  - [ ] プロダクト取得
  - [ ] 購入フロー
  - [ ] レシート検証
  - [ ] 復元機能

#### サブスクリプション画面
- [ ] `app/screen/subscription/SubscriptionScreen.tsx` 作成
- [ ] `app/screen/subscription/PlanCard.tsx` 作成
- [ ] `app/screen/subscription/FeatureList.tsx` 作成
- [ ] ナビゲーションに追加
- [ ] プラン比較表示
- [ ] 購入ボタン実装

#### 使用量ダッシュボード
- [ ] `app/screen/usage/UsageScreen.tsx` 作成
- [ ] LLMリクエスト数表示
- [ ] ファイル数表示
- [ ] ストレージ使用量表示
- [ ] プログレスバー実装

---

### Week 2: 機能制限

#### 権限チェックヘルパー
- [ ] `app/utils/subscriptionHelpers.ts` 作成
  - [ ] `useSubscription()` フック
  - [ ] `canUseFeature()`
  - [ ] `canUseModel()`
  - [ ] `canSendLLMRequest()`
  - [ ] `canCreateFile()`

#### LLM機能の制限
- [ ] `app/features/chat/hooks/useChat.ts` 更新
  - [ ] モデル選択時の権限チェック
  - [ ] リクエスト前の制限チェック
- [ ] `app/features/chat/components/ModelSelector.tsx` 更新
  - [ ] Pro専用モデルにバッジ表示
  - [ ] 無効化とツールチップ
- [ ] リクエスト数カウンター実装

#### RAG・Web検索の制限
- [ ] チャット設定画面更新
  - [ ] RAG検索トグルの条件付き表示
  - [ ] Web検索トグルの条件付き表示
- [ ] 機能使用時の権限チェック
- [ ] アップグレードプロンプト表示

#### ファイル制限
- [ ] `app/screen/file-edit/FileEditScreen.tsx` 更新
  - [ ] 新規作成前のファイル数チェック
- [ ] `app/data/repositories/fileRepository.ts` 更新
  - [ ] 保存前の容量チェック
- [ ] 制限超過時のエラーメッセージ

#### アップグレードUI
- [ ] `app/components/UpgradeModal.tsx` 作成
- [ ] `app/components/UpgradePrompt.tsx` 作成
- [ ] `app/components/ProBadge.tsx` 作成

---

### Week 3: 使用量トラッキング & テスト

#### 使用量トラッキング
- [ ] `settingsStore.ts` にトラッキング関数追加
  - [ ] `incrementLLMUsage()`
  - [ ] `incrementFileCount()`
  - [ ] `decrementFileCount()`
  - [ ] `updateStorageUsed()`
  - [ ] `resetMonthlyUsage()`
- [ ] 月次リセットのバックグラウンドタスク実装

#### テスト
- [ ] 購入フロー全体のテスト
  - [ ] 購入成功
  - [ ] 購入キャンセル
  - [ ] エラーハンドリング
- [ ] 各プランでの機能制限テスト
  - [ ] Free: 制限が正しく動作
  - [ ] Pro: 全機能が利用可能
- [ ] 使用量カウンターのテスト
- [ ] レシート検証のテスト

#### リリース準備
- [ ] App Store 審査提出
- [ ] Play Store 審査提出
- [ ] リリースノート作成
- [ ] ユーザー向けドキュメント作成

---

## Phase 2: ユーザー管理 (Week 4-7)

### Week 4: インフラ準備

#### Firebase設定
- [ ] Firebase プロジェクト作成
- [ ] Authentication 有効化
- [ ] iOS アプリ登録
- [ ] Android アプリ登録
- [ ] Google OAuth設定
- [ ] Apple Sign In設定

#### Supabase設定
- [ ] Supabase プロジェクト作成
- [ ] データベース設計
  - [ ] `users` テーブル
  - [ ] `subscriptions` テーブル
  - [ ] `usage_logs` テーブル
  - [ ] `files` テーブル
- [ ] RLS（Row Level Security）設定
- [ ] API キー取得

---

### Week 5: 認証実装

#### Firebase Authentication統合
- [ ] `npm install @react-native-firebase/app @react-native-firebase/auth`
- [ ] `app/services/authService.ts` 作成
  - [ ] メール認証
  - [ ] Google OAuth
  - [ ] Apple Sign In
  - [ ] ログアウト
- [ ] `app/contexts/AuthContext.tsx` 作成

#### 認証画面
- [ ] `app/screen/auth/LoginScreen.tsx` 作成
- [ ] `app/screen/auth/SignupScreen.tsx` 作成
- [ ] `app/screen/auth/ProfileScreen.tsx` 作成
- [ ] ナビゲーション統合

#### Supabaseクライアント
- [ ] `npm install @supabase/supabase-js`
- [ ] `app/services/supabaseClient.ts` 作成
- [ ] `app/repositories/cloudFileRepository.ts` 作成

#### データ移行
- [ ] `app/services/migrationService.ts` 作成
- [ ] ローカルファイルのアップロード
- [ ] 設定の同期
- [ ] 移行進捗表示

---

### Week 6: サブスクリプション同期

#### サーバー側API
- [ ] `server/src/auth/middleware.py` 作成
  - [ ] Firebase token検証
  - [ ] ユーザー取得
- [ ] `server/src/subscription/models.py` 作成
- [ ] `server/src/subscription/service.py` 作成
  - [ ] サブスクリプション状態管理
  - [ ] IAP検証ロジック
- [ ] `server/src/subscription/router.py` 作成
  - [ ] `POST /api/subscription/sync`
  - [ ] `GET /api/subscription/status`
  - [ ] `GET /api/usage/current`
  - [ ] `POST /api/usage/increment`

#### IAP検証
- [ ] Apple レシート検証実装
- [ ] Google Play レシート検証実装
- [ ] データベース更新ロジック

---

### Week 7: クラウド同期

#### ファイル同期
- [ ] `app/services/syncService.ts` 作成
- [ ] オフライン編集のキューイング
- [ ] 自動同期ロジック
- [ ] コンフリクト解決

#### 設定同期
- [ ] AsyncStorage ↔ Supabase 同期
- [ ] ログイン時の設定取得
- [ ] 変更時の自動保存

#### テスト
- [ ] 複数デバイスでの同期テスト
- [ ] オフライン→オンライン遷移テスト
- [ ] コンフリクト解決テスト

---

## Phase 3: サーバー権限 (Week 8-9)

### Week 8: API保護

#### 認証ミドルウェア拡張
- [ ] `@require_feature(feature)` デコレーター実装
- [ ] `@check_usage_limit(limit_type)` デコレーター実装
- [ ] エラーハンドリング

#### LLM APIの保護
- [ ] `server/src/llm/routers/chat_router.py` 更新
  - [ ] `@require_feature("llm.chat")`
  - [ ] `@check_usage_limit("llm_request")`
  - [ ] モデル権限チェック

#### RAG・Web検索の保護
- [ ] `server/src/llm/routers/knowledge_base_router.py` 更新
  - [ ] `@require_feature("search.rag")`
- [ ] `server/src/llm/tools/web_search.py` 更新
  - [ ] `@require_feature("search.web")`

#### ファイルAPIの保護
- [ ] ファイル作成APIに制限チェック追加
- [ ] ファイル数・容量チェック

---

### Week 9: セキュリティ & テスト

#### セキュリティ
- [ ] SQLインジェクション対策確認
- [ ] XSS対策確認
- [ ] CSRF対策確認
- [ ] レート制限実装
- [ ] ログ監視

#### 包括的テスト
- [ ] 全機能の統合テスト
- [ ] 各プランでのエンドツーエンドテスト
- [ ] 負荷テスト
- [ ] セキュリティテスト

#### 本番環境
- [ ] 環境変数設定
- [ ] データベースマイグレーション
- [ ] デプロイ
- [ ] モニタリング設定

---

## 完了条件チェックリスト

### Phase 1 完了
- [ ] IAPで購入可能
- [ ] Pro機能が制限される
- [ ] 使用量が表示される
- [ ] App Store/Play Storeで公開

### Phase 2 完了
- [ ] ユーザーログイン可能
- [ ] 複数デバイスで同期
- [ ] サーバーで状態管理

### Phase 3 完了
- [ ] サーバー側で権限チェック
- [ ] 不正リクエストがブロック
- [ ] 本番環境で安定稼働

---

**進捗の記録方法**:
各タスク完了時に `- [ ]` を `- [x]` に変更してコミットしてください。
