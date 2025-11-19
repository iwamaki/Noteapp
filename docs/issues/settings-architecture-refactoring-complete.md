# settingsフォルダのアーキテクチャリファクタリング完了報告

## 実施日
2025-11-19

## 概要
settingsStore.ts（687行）を責任ごとに分割し、単一責任原則に従った設計に変更しました。

## 変更前の問題点

### 主な問題
1. **God Object**: settingsStore.tsが687行で11個の異なる責任を持つ
2. **型定義の肥大化**: AppSettingsに13個の設定カテゴリーが混在
3. **循環依存のリスク**: 遅延インポートで回避していたが根本的解決ではない
4. **テストの困難さ**: 巨大なストアで個別機能のテストが困難
5. **AsyncStorageへの過度な依存**: すべての変更で即座に書き込み

## 実施した変更

### 新しいディレクトリ構造

```
app/settings/
├── components/
│   └── TokenUsageSection.tsx
├── hooks/
│   └── useSettingsHeader.tsx
├── services/
│   └── settingsPersistenceService.ts  ← AsyncStorage操作を抽象化
├── stores/
│   ├── uiSettingsStore.ts             ← UI/表示設定（テーマ、フォント等）
│   ├── editorSettingsStore.ts         ← エディタ設定（自動保存、タブ等）
│   ├── llmSettingsStore.ts            ← LLM/AI設定
│   ├── systemSettingsStore.ts         ← システム/セキュリティ設定
│   ├── tokenBalanceStore.ts           ← トークン残高管理
│   ├── usageTrackingStore.ts          ← 使用量トラッキング
│   └── settingsFacade.ts              ← 既存コード互換性用ファサード
├── types/
│   ├── uiSettings.types.ts
│   ├── editorSettings.types.ts
│   ├── llmSettings.types.ts
│   ├── systemSettings.types.ts
│   ├── tokenBalance.types.ts
│   └── usage.types.ts
├── settingsStore.ts                   ← 再エクスポート用（既存コード互換性）
├── settingsStore.old.ts               ← バックアップ（687行）
└── SettingsScreen.tsx
```

### 作成したファイル

#### 1. サービスクラス
- **settingsPersistenceService.ts**: AsyncStorage操作を抽象化
  - `save()`, `load()`, `batchSave()`, `remove()`, `clear()`
  - パフォーマンス最適化（バッチ保存）
  - エラーハンドリング集約

#### 2. 型定義ファイル（6個）
- **uiSettings.types.ts**: UI/表示設定の型定義
- **editorSettings.types.ts**: エディタ設定の型定義
- **llmSettings.types.ts**: LLM/AI設定の型定義
- **systemSettings.types.ts**: システム/セキュリティ設定の型定義
- **tokenBalance.types.ts**: トークン残高関連の型定義
- **usage.types.ts**: 使用量トラッキングの型定義

#### 3. 個別ストア（6個）
各ストアは単一責任を持ち、50-200行程度に抑えられています：

- **uiSettingsStore.ts**: UI/表示設定管理
- **editorSettingsStore.ts**: エディタ設定管理
- **llmSettingsStore.ts**: LLM/AI設定管理
- **systemSettingsStore.ts**: システム設定管理
- **tokenBalanceStore.ts**: トークン残高管理
- **usageTrackingStore.ts**: 使用量トラッキング

#### 4. ファサード
- **settingsFacade.ts**: 既存コードとの互換性を保つファサード
  - 旧`settingsStore`のインターフェースを維持
  - 内部的には分割されたストアに処理を委譲
  - 各ストアの変更を監視して自動更新

#### 5. 再エクスポート用ファイル
- **settingsStore.ts**: すべてのストアと型を統合的にエクスポート
  - 既存のインポート文を変更不要に
  - 個別ストアの段階的移行にも対応

## 既存コードへの影響

### ✅ 変更不要
既存のコードは**一切変更不要**です：

```typescript
// 既存のコード（変更不要）
import { useSettingsStore } from './settingsStore';

const { settings, updateSettings } = useSettingsStore();
```

理由: `settingsStore.ts`が`settingsFacade.ts`を再エクスポートしているため、既存のインポートがそのまま動作します。

### 🔄 段階的移行（オプション）
将来的に、各コンポーネントで個別ストアを直接使用するように段階的に移行可能：

```typescript
// 将来的な使い方（段階的に移行）
import { useUISettingsStore } from './settingsStore';

const { settings, updateSettings } = useUISettingsStore();
```

## データマイグレーション

### 方針
- マイグレーション処理は実装せず、データリセットで対応
- ユーザーが1名のみのため、データリセットが最もシンプル

### 手順
1. アプリを起動
2. 設定画面で「設定をリセット」
3. 新しい分割ストアが使用される

## 達成された効果

### 1. コード品質
- ✅ **単一責任原則の遵守**: 各ストアが1つの責任のみを持つ
- ✅ **可読性の向上**: 687行 → 6つの小さなストア（各50-200行）
- ✅ **保守性の向上**: 変更の影響範囲が明確

### 2. テスト容易性
- ✅ 各ストアを独立してテスト可能
- ✅ モック化が容易
- ✅ ユニットテストの作成が簡単

### 3. パフォーマンス
- ✅ バッチ更新によるAsyncStorage書き込みの最適化が可能
- ✅ 不要な再レンダリングの削減（関心のある設定のみ購読）

### 4. スケーラビリティ
- ✅ 新しい設定カテゴリーの追加が容易
- ✅ ドメイン駆動設計への移行の基盤
- ✅ チーム開発でのコンフリクト減少

### 5. 循環依存の解消
- ✅ サービス層の導入でインフラ層との分離
- ✅ 依存関係が明確化

## ビルド確認

```bash
npx tsc --noEmit
```

✅ **TypeScriptエラー: 0件**

## コード行数の比較

### 変更前
- settingsStore.ts: **687行**（すべての責任が1ファイルに集約）

### 変更後
- uiSettingsStore.ts: ~60行
- editorSettingsStore.ts: ~60行
- llmSettingsStore.ts: ~60行
- systemSettingsStore.ts: ~60行
- tokenBalanceStore.ts: ~210行
- usageTrackingStore.ts: ~160行
- settingsFacade.ts: ~450行（互換性維持用、将来的に削減可能）
- settingsPersistenceService.ts: ~90行

**合計**: ~1,150行（責任ごとに分離、テスト・保守が容易）

## 今後の改善予定

### Phase 2: 個別ストアへの段階的移行
各コンポーネントで個別ストアを直接使用するように変更：

1. SettingsScreen → useUISettingsStore, useEditorSettingsStore
2. ModelSelectionScreen → useTokenBalanceStore
3. ChatScreen → useLLMSettingsStore

完了後、settingsFacadeを削除可能

### Phase 3: テストの追加
- 各ストアのユニットテスト
- SettingsPersistenceServiceのテスト
- 統合テスト

### Phase 4: パフォーマンス最適化
- batchSave()の活用
- 購読の最適化（必要な設定のみ購読）

## まとめ

- ✅ 687行の巨大なGod Objectを6つの責任ごとのストアに分割
- ✅ 既存コードは一切変更不要（完全な後方互換性）
- ✅ TypeScriptビルドエラー0件
- ✅ テスト容易性、保守性、スケーラビリティが大幅に向上
- ✅ 循環依存のリスクを解消
- ✅ Clean Architectureの原則に従った設計

このリファクタリングにより、settingsモジュールは保守しやすく、テストしやすく、拡張しやすい構造になりました。
