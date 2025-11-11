---
filename: 20251111_model-loading-system
status: new
priority: high
attempt_count: 0
tags: [billing, token-management, UI, refactoring]
date: 2025/11/11
---

## 概要 (Overview)

Quick/Thinkモデルの「装填システム」を実装し、ユーザーが自由にモデルを選択・切り替えできるようにする。現在のハードコードされたGemini固定システムから、モデル単位でトークンを管理する柔軟なシステムへ移行する。

## 背景 (Background)

### 現在の問題点
- **モデルがハードコード**: MessageInput.tsx:34でGemini 2.5 Flash/Proが固定されている
- **カテゴリー単位の管理**: トークン残高が`tokenBalance.flash`/`tokenBalance.pro`のようにカテゴリー単位で管理されており、モデル単位での管理ができない
- **拡張性の欠如**: 新しいモデル（GPT-4, Claude等）を追加する際に大規模な変更が必要
- **ユーザー体験の制限**: ユーザーが好みのモデルを選択できない

### 新システムのビジョン
SVGモックアップ（`docs/sandbox/model-selection-ui-mockup.svg`）に基づき：
1. **装填システム**: QuickとThinkのスロットに好きなモデルを「装填」できる
2. **モデル単位の残高管理**: 各モデルごとにトークン残高を管理
3. **容量制限**: Quick 5M / Think 1M の上限で買いすぎを予防
4. **視覚的なゲージ**: カテゴリー内の全モデルのトークン量をスタック表示

## 実装方針 (Implementation Strategy)

### フェーズ分けアプローチ
大規模な変更のため、6つのフェーズに分けて段階的に実装：

#### Phase 1: データ構造の変更
- `settingsStore.ts`の`tokenBalance`をカテゴリー単位からモデル単位に変更
- `loadedModels: { quick: string, think: string }`を追加
- 容量制限定数`TOKEN_CAPACITY_LIMITS`を定義
- マイグレーション関数で既存データを移行

#### Phase 2: トークン管理関数の変更
- `addTokens(modelId, tokens, purchaseRecord)`に変更
- `deductTokens(modelId, tokens)`に変更
- `loadModel(category, modelId)`を新規追加
- 容量制限チェックロジックを実装

#### Phase 3: トークン消費ロジックの変更
- `tokenTrackingHelper.ts`をモデル単位の消費に対応
- カテゴリー判定からモデルID直接指定に変更

#### Phase 4: モデル切り替えロジックの変更
- `MessageInput.tsx`のハードコードを削除
- `loadedModels`を参照する動的な切り替えに変更

#### Phase 5: トークンパッケージ定義の変更
- `TokenPackage`の構造を変更（`tokens: {flash, pro}` → `targetModel, tokens`）
- パッケージ定義をモデル単位に再構成
- IAP Product IDを新規追加（Apple/Google審査必要）

#### Phase 6: UI実装
- 新しい`ModelSelectionSection`コンポーネント作成
- トークン容量ゲージの実装
- 装填中モデル表示カードの実装
- モデル選択リストの実装

## 受け入れ条件 (Acceptance Criteria)

### データ層
- [ ] `tokenBalance.byModel`でモデル単位の残高管理ができる
- [ ] `loadedModels.quick`と`loadedModels.think`で装填モデルを保存できる
- [ ] 既存データが新構造に正しくマイグレーションされる
- [ ] 容量制限（Quick 5M / Think 1M）のチェックが機能する

### 機能層
- [ ] トークン購入時にモデルを指定して購入できる
- [ ] トークン消費時に正しいモデルから消費される
- [ ] モデル切り替えが装填モデルを参照して動作する
- [ ] 容量超過時に購入がエラーになる

### UI層
- [ ] SVGモックアップ通りの設定画面が実装されている
- [ ] トークン容量ゲージが正しく表示される
- [ ] 装填中のモデル情報が表示される
- [ ] モデル別のトークン残高が表示される
- [ ] モデルを選択・装填できる

### テスト
- [ ] 開発モードでモック購入が動作する
- [ ] トークン残高の加減算が正しく動作する
- [ ] マイグレーション処理でデータが失われない

## 関連ファイル (Related Files)

### Critical（必ず変更が必要）
- `app/settings/settingsStore.ts` - データ構造とストア関数
- `app/billing/utils/tokenTrackingHelper.ts` - トークン消費ロジック
- `app/features/chat/components/MessageInput.tsx` - モデル切り替え
- `app/billing/constants/tokenPackages.ts` - パッケージ定義

### High（重要な変更）
- `app/screen/token-purchase/hooks/usePurchaseHandlers.ts` - 購入処理
- `app/settings/components/TokenUsageSection.tsx` - トークン残高表示

### Medium（UI実装）
- `app/settings/components/ModelSelectionSection.tsx` - 新規作成
- `app/screen/token-purchase/TokenPurchaseScreen.tsx` - 購入画面
- `app/screen/token-purchase/components/TokenPackageCard.tsx` - パッケージカード

### 参考
- `app/constants/features.ts` - モデル定義
- `app/constants/pricing.ts` - 価格情報
- `app/billing/utils/modelHelpers.ts` - モデル判定ヘルパー

## 制約条件 (Constraints)

### 技術的制約
- **データ損失禁止**: 既存ユーザーのトークン残高を失ってはならない
- **後方互換性**: マイグレーション処理は確実に動作すること
- **パフォーマンス**: トークン残高の計算は高速に行うこと（O(n)以下）
- **型安全性**: TypeScriptの型定義を厳密に保つこと

### 運用的制約
- **マイグレーション不要**: ユーザーは現在「私しか使っていない」ため、既存データの互換性は考慮不要（開発者の判断）
- **IAP審査**: 新しいProduct IDの追加にはApple/Google審査が必要（数日〜1週間）
- **段階的リリース**: 一度に全機能をリリースせず、フェーズごとにテスト可能

### UI/UX制約
- **SVGモックアップ準拠**: `docs/sandbox/model-selection-ui-mockup.svg`のデザインに従う
- **直感的な操作**: モデルの「装填」という概念が直感的に理解できること
- **エラーハンドリング**: 容量超過時に分かりやすいエラーメッセージを表示

## 開発ログ (Development Log)

---
### 試行 #1 (2025/11/11)

- **試みたこと:** コードベース全体の調査を実施。トークン管理、購入処理、モデル切り替え、UI表示の実装を確認。
- **結果:**
  - ハードコード箇所を特定（MessageInput.tsx:34）
  - カテゴリー単位管理の構造を確認
  - 必要な変更の全体像を6フェーズに整理
  - usage.monthlyTokensByModelは既にモデル単位で記録済み（再利用可能）
- **メモ:**
  - データ構造の変更が最優先（Phase 1）
  - マイグレーション処理は簡易的でOK（ユーザーが開発者のみ）
  - Gemini 1.5の価格情報が不足している（pricing.ts）

---

## AIへの申し送り事項 (Handover to AI)

### 現在の状況
- 調査フェーズ完了
- SVGモックアップ作成済み（`docs/sandbox/model-selection-ui-mockup.svg`）
- 全体的な実装計画を6フェーズに整理済み
- 変更が必要なファイルとその優先度を特定済み

### 次のアクション
実装を開始する。推奨順序：

1. **Phase 1から開始**: settingsStore.tsのデータ構造変更
   - `tokenBalance.byModel: { [modelId: string]: number }`を追加
   - `loadedModels: { quick: string, think: string }`を追加
   - マイグレーション関数を実装
   - デフォルト値を設定

2. **Phase 2**: トークン管理関数の変更
   - `addTokens`と`deductTokens`の引数変更
   - 容量制限チェックの実装
   - `loadModel`関数の新規追加

3. **Phase 3以降**: tokenTrackingHelper, MessageInput, UIの順に実装

### 考慮事項/ヒント
- **良い点を活用**: `usage.monthlyTokensByModel`は既にモデル単位で記録しているため、参考にできる
- **段階的テスト**: 各フェーズ完了後に開発モードでモック購入をテストする
- **型定義優先**: データ構造変更時は型定義から始めると、影響範囲が明確になる
- **Gemini 1.5の価格**: pricing.tsにGemini 1.5 Flash/Proの価格情報を追加する必要あり
- **IAP Product ID**: Phase 5では新しいProduct IDが必要だが、開発モードでは不要

### 実装時の注意点
- `settingsStore.ts`の変更時は、必ず`loadSettings`関数でマイグレーション処理を実行
- MessageInput.tsxの変更時は、`settings.loadedModels`が未定義の場合のフォールバック処理を追加
- 容量制限チェックは`addTokens`関数内で実施（購入前に必ずチェック）
- UIは最後に実装（データ層が安定してから）

---
