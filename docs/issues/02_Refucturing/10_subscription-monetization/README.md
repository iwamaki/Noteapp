# サブスクリプション課金機能 実装計画

## 📋 概要

### 目的
Noteappに課金機能を導入し、無料プランと有料プラン（Pro/Enterprise）を提供する。

### 現状
- 単一ユーザー前提（ユーザー管理なし）
- 全機能が無料で利用可能
- サーバーはLLM APIキーを管理しているが、クライアント側の制限なし

### 目標
- 早期収益化（3週間以内）
- 段階的に本格的な機能へ拡張（9週間で完成）
- 既存ユーザーへの影響を最小化

---

## 🎯 3つのフェーズ

```
Phase 1 (3週) → Phase 2 (4週) → Phase 3 (2週)
  IAP実装        ユーザー管理      サーバー権限
```

### Phase 1: アプリ内課金 (3週間)
**目標**: 早期リリース、基本的な収益化
- アプリ内課金（IAP）の実装
- クライアント側での機能制限
- サブスクリプション画面・使用量ダッシュボード

### Phase 2: ユーザー管理 (4週間)
**目標**: 複数デバイス対応、データ同期
- Firebase Authentication
- Supabase データベース
- クラウド同期機能

### Phase 3: サーバー権限 (2週間)
**目標**: セキュリティ強化、不正防止
- サーバー側での権限チェック
- LLM APIの保護
- 本番環境対応

---

## 📦 プラン定義

### 無料プラン
- ファイル数: 50
- LLMリクエスト: 100回/月
- ストレージ: 100MB
- 機能: 基本機能のみ

### Pro (¥980/月)
- ファイル数: 1,000
- LLMリクエスト: 1,000回/月
- ストレージ: 5GB
- 機能: **高度なLLMモデル、RAG検索、Web検索**

### Enterprise (¥3,000/月)
- すべて無制限
- 優先サポート

---

## 🗓️ マイルストーン

### Phase 1: アプリ内課金 (Week 1-3)

#### Week 1: IAP統合 & UI
- [ ] react-native-iap インストール
- [ ] App Store / Play Console プロダクト登録
- [ ] サブスクリプション画面実装
- [ ] 使用量ダッシュボード実装

#### Week 2: 機能制限
- [ ] `app/utils/subscriptionHelpers.ts` - 権限チェックヘルパー
- [ ] LLM機能の制限（モデル選択、リクエスト数）
- [ ] RAG・Web検索の制限
- [ ] ファイル数・容量の制限
- [ ] アップグレード促進UI

#### Week 3: テスト & リリース準備
- [ ] 使用量トラッキング実装
- [ ] 各プランでの機能テスト
- [ ] 購入フロー全体のテスト
- [ ] App Store / Play Store 審査提出

**成果物**: IAP実装完了、Phase 1リリース

---

### Phase 2: ユーザー管理 (Week 4-7)

#### Week 4: インフラ準備
- [ ] Firebase プロジェクト作成
- [ ] Supabase プロジェクト作成
- [ ] データベース設計（ユーザー、サブスクリプション、使用量、ファイル）
- [ ] RLS（Row Level Security）設定

#### Week 5: 認証実装
- [ ] Firebase Authentication 統合
- [ ] 認証画面実装（ログイン・サインアップ）
- [ ] Supabase クライアント統合
- [ ] ローカルデータ移行ツール

#### Week 6: サブスクリプション同期
- [ ] サーバー側API実装（FastAPI）
  - `POST /api/subscription/sync` - IAP購入同期
  - `GET /api/subscription/status` - 状態取得
  - `GET /api/usage/current` - 使用量取得
- [ ] IAP購入のサーバー検証
- [ ] データベースの状態更新

#### Week 7: クラウド同期
- [ ] ファイル同期機能
- [ ] 設定の同期
- [ ] オフライン対応
- [ ] 複数デバイスでのテスト

**成果物**: ユーザー管理完了、複数デバイス同期可能

---

### Phase 3: サーバー権限 (Week 8-9)

#### Week 8: API保護
- [ ] 認証ミドルウェア拡張
  - `@require_feature(feature)` デコレーター
  - `@check_usage_limit(limit_type)` デコレーター
- [ ] LLMルーターの保護
- [ ] RAG・Web検索ルーターの保護
- [ ] ファイルAPIの保護

#### Week 9: セキュリティ & テスト
- [ ] セキュリティ監査
- [ ] レート制限実装
- [ ] 包括的なテスト
- [ ] パフォーマンステスト
- [ ] 本番環境デプロイ

**成果物**: セキュア実装完了、本番環境リリース

---

## 📂 主要な新規ファイル

### 既に作成済み ✅
```
app/constants/plans.ts          # プラン定義
app/constants/features.ts       # 機能要件
app/constants/index.ts          # 再エクスポート
server/src/core/config.py       # バックエンド設定（更新済み）
app/settings/settingsStore.ts  # 設定ストア（更新済み）
```

### Phase 1 で作成
```
app/services/iapService.ts                    # IAP統合
app/utils/subscriptionHelpers.ts              # 権限チェック
app/screen/subscription/SubscriptionScreen.tsx
app/screen/subscription/PlanCard.tsx
app/screen/usage/UsageScreen.tsx
app/components/UpgradeModal.tsx
app/components/ProBadge.tsx
```

### Phase 2 で作成
```
app/services/authService.ts                   # Firebase Auth
app/services/supabaseClient.ts                # Supabase
app/services/migrationService.ts              # データ移行
app/contexts/AuthContext.tsx
app/screen/auth/LoginScreen.tsx
app/screen/auth/SignupScreen.tsx
server/src/auth/middleware.py                 # 認証ミドルウェア
server/src/subscription/router.py             # サブスクリプションAPI
server/src/subscription/service.py
server/src/subscription/models.py
```

### Phase 3 で作成
```
server/src/auth/decorators.py                 # 権限デコレーター
server/src/monitoring/usage_tracker.py        # 使用量監視
```

---

## ⚠️ 主要なリスク

### Phase 1
- **不正利用**: クライアント側のみの制限なので回避可能
- **対策**: Phase 2/3で解決、明らかに異常なパターンは手動対応

### Phase 2
- **データ移行失敗**: ローカルデータの損失リスク
- **対策**: 移行前に必ずバックアップ、段階的移行

### Phase 3
- **APIコスト超過**: LLM使用量が想定を超える
- **対策**: プランごとの厳格な制限、アラート設定

### 全般
- **App Store/Play Store 審査**: 承認に時間がかかる可能性
- **対策**: 早めに提出、審査中に次の開発を進める

---

## 💰 コスト試算

### 開発コスト
- 合計: 9週間（360時間）

### インフラコスト（月額）
- Firebase: 無料枠内（初期）
- Supabase: $25/月
- GCP: 現状維持
- **合計**: 約$30-50/月

### 収益見込み
- 想定ユーザー: 1,000人
- Pro契約率: 10% = 100人
- **月次収益**: ¥98,000
- **純利益**: 約¥90,000/月

---

## 🚀 今すぐやること

### 優先度1（即座に）
1. **App Store Connect / Play Console設定**
   - プロダクトID登録: `noteapp.pro.monthly`
   - 価格設定: ¥980/月
   - スクリーンショット準備

2. **react-native-iap インストール**
   ```bash
   npm install react-native-iap
   cd ios && pod install
   ```

### 優先度2（Week 1開始時）
3. **サブスクリプション画面のUIデザイン**
   - Figmaでワイヤーフレーム
   - デザインレビュー

4. **IAP購入フローの実装開始**
   - `app/services/iapService.ts` 作成
   - 購入ボタンの実装

---

## 📝 進捗管理

各Phaseの完了条件:

### Phase 1 完了条件
- [ ] IAPで購入可能
- [ ] Pro機能（RAG、Web検索、高度なモデル）が制限される
- [ ] 使用量が表示される
- [ ] App Store/Play Storeで公開

### Phase 2 完了条件
- [ ] ユーザーアカウントでログイン可能
- [ ] 複数デバイスでファイルが同期される
- [ ] サーバーでサブスクリプション状態が管理される

### Phase 3 完了条件
- [ ] サーバー側で権限チェックが動作
- [ ] 不正なリクエストがブロックされる
- [ ] セキュリティテスト完了
- [ ] 本番環境で安定稼働

---

## 🔗 関連ドキュメント

- `SUBSCRIPTION_IMPLEMENTATION_PLAN.md` - 詳細な実装手順（必要に応じて参照）
- `app/constants/plans.ts` - プラン定義（コード）
- `app/constants/features.ts` - 機能要件（コード）

---

## 📞 サポート

実装中に不明点があれば、以下を確認:
1. 既存のコードベース分析（Exploreエージェント）
2. 詳細実装計画書
3. 公式ドキュメント（react-native-iap, Firebase, Supabase）

---

**最終更新**: 2025-11-06
**ステータス**: Phase 0完了（定数・設定整理）、Phase 1開始準備完了
