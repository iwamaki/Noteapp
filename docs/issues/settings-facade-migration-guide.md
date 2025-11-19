# settingsFacadeから個別ストアへの移行ガイド

## 概要
このドキュメントは、settingsFacade.tsを経由している既存コードを、個別ストアに段階的に移行するための指示書です。
移行完了後、settingsFacade.ts（約450行）を削除できます。

## 目的
- パフォーマンス向上（不要な再レンダリング削減）
- 型安全性の向上
- 依存関係の明確化
- コードベースの簡素化

## 現在の状況

### settingsFacadeを使用しているファイル（22個）
以下のファイルが`useSettingsStore`を使用しています：

```
app/initialization/tasks/configureLLMService.ts
app/initialization/tasks/initializeBillingService.ts
app/initialization/tasks/loadSettings.ts
app/initialization/tasks/verifyAppReady.ts
app/screen/model-selection/hooks/useCreditAllocation.ts
app/screen/model-selection/ModelSelectionScreen.tsx
app/screen/token-purchase/hooks/usePurchaseHandlers.ts
app/screen/file-list-flat/FileListScreenFlat.tsx
app/screen/file-edit/FileEditScreen.tsx
app/billing/utils/modelCategory.ts
app/billing/utils/costCalculation.ts
app/billing/utils/tokenBalance.ts
app/billing/services/purchaseRestoration.ts
app/hooks/useModelSwitch.ts
app/features/chat/components/ModelSelectionModal.tsx
app/features/chat/components/MessageInput.tsx
app/features/chat/index.ts
app/features/chat/hooks/useFileEditChatContext.ts
app/design/theme/ThemeContext.tsx
app/navigation/RootNavigator.tsx
app/settings/SettingsScreen.tsx
app/settings/components/TokenUsageSection.tsx
```

## 移行チェックリスト

### Phase 1: 初期化タスク（4ファイル）

#### ✅ 1.1 `app/initialization/tasks/loadSettings.ts`
**現在の使用**:
```typescript
import { useSettingsStore } from '../../settings/settingsStore';
const { loadSettings } = useSettingsStore.getState();
```

**移行後**:
```typescript
import {
  useUISettingsStore,
  useEditorSettingsStore,
  useLLMSettingsStore,
  useSystemSettingsStore,
  useTokenBalanceStore,
  useUsageTrackingStore
} from '../../settings/settingsStore';

// 全ストアを並列で読み込み
await Promise.all([
  useUISettingsStore.getState().loadSettings(),
  useEditorSettingsStore.getState().loadSettings(),
  useLLMSettingsStore.getState().loadSettings(),
  useSystemSettingsStore.getState().loadSettings(),
  useTokenBalanceStore.getState().loadData(),
  useUsageTrackingStore.getState().loadUsage(),
]);
```

**テスト項目**:
- [x] アプリ起動時に全設定が正しく読み込まれる
- [x] デフォルト値が正しく設定される

---

#### ✅ 1.2 `app/initialization/tasks/configureLLMService.ts`
**現在の使用**:
```typescript
const { settings } = useSettingsStore.getState();
// settings.llmEnabled, settings.llmService などを使用
```

**移行後**:
```typescript
import { useLLMSettingsStore } from '../../settings/settingsStore';
const { settings } = useLLMSettingsStore.getState();
// settings.llmEnabled, settings.llmService のみアクセス可能
```

**テスト項目**:
- [x] LLMサービスが正しく初期化される
- [x] LLM設定の変更が反映される

---

#### ✅ 1.3 `app/initialization/tasks/initializeBillingService.ts`
**現在の使用**:
```typescript
const { loadTokenBalance } = useSettingsStore.getState();
```

**移行後**:
```typescript
import { useTokenBalanceStore } from '../../settings/settingsStore';
const { loadTokenBalance } = useTokenBalanceStore.getState();
```

**テスト項目**:
- [x] トークン残高が正しく読み込まれる
- [x] 課金サービスが正しく初期化される

---

#### ✅ 1.4 `app/initialization/tasks/verifyAppReady.ts`
**現在の使用**:
```typescript
const { checkAndResetMonthlyUsageIfNeeded } = useSettingsStore.getState();
```

**移行後**:
```typescript
import { useUsageTrackingStore } from '../../settings/settingsStore';
const { checkAndResetMonthlyUsageIfNeeded } = useUsageTrackingStore.getState();
```

**テスト項目**:
- [x] 月次使用量リセットが正しく動作する
- [x] アプリ起動時の検証が成功する

---

### Phase 2: 設定画面（2ファイル）

#### ✅ 2.1 `app/settings/SettingsScreen.tsx`
**現在の使用**:
```typescript
const { settings, loadSettings, updateSettings, checkAndResetMonthlyUsageIfNeeded } = useSettingsStore();
```

**移行後**:
```typescript
import {
  useUISettingsStore,
  useEditorSettingsStore,
  useLLMSettingsStore,
  useUsageTrackingStore
} from './settingsStore';

const uiSettings = useUISettingsStore();
const editorSettings = useEditorSettingsStore();
const llmSettings = useLLMSettingsStore();
const { checkAndResetMonthlyUsageIfNeeded } = useUsageTrackingStore();

// 各設定を個別に更新
const handleThemeChange = (theme) => {
  uiSettings.updateSettings({ theme });
};

const handleLLMToggle = (enabled) => {
  llmSettings.updateSettings({ llmEnabled: enabled });
};
```

**テスト項目**:
- [x] テーマ変更が正しく動作する
- [x] フォントサイズ変更が正しく動作する
- [x] LLM設定の切り替えが正しく動作する
- [x] 設定リセットが正しく動作する

---

#### ✅ 2.2 `app/settings/components/TokenUsageSection.tsx`
**現在の使用**:
```typescript
const { settings } = useSettingsStore();
// settings.tokenBalance, settings.usage を使用
```

**移行後**:
```typescript
import { useTokenBalanceStore, useUsageTrackingStore } from '../settingsStore';

const { balance } = useTokenBalanceStore();
const { usage } = useUsageTrackingStore();
```

**テスト項目**:
- [x] トークン残高が正しく表示される
- [x] 使用量が正しく表示される
- [x] モデル別詳細が正しく表示される

---

### Phase 3: テーマ関連（1ファイル）

#### ✅ 3.1 `app/design/theme/ThemeContext.tsx`
**現在の使用**:
```typescript
const { settings, updateSettings } = useSettingsStore();
// settings.theme を使用
```

**移行後**:
```typescript
import { useUISettingsStore } from '../../settings/settingsStore';
const { settings, updateSettings } = useUISettingsStore();
// settings.theme のみアクセス可能
```

**テスト項目**:
- [x] テーマ切り替えが正しく動作する
- [x] ダークモード/ライトモードが正しく適用される
- [x] システムテーマの自動追従が動作する

---

### Phase 4: モデル選択/課金関連（5ファイル）

#### ☐ 4.1 `app/screen/model-selection/ModelSelectionScreen.tsx`
**現在の使用**:
```typescript
const { settings, loadModel } = useSettingsStore();
// settings.loadedModels, settings.activeModelCategory を使用
```

**移行後**:
```typescript
import { useTokenBalanceStore } from '../../settings/settingsStore';
const { loadedModels, activeModelCategory, loadModel } = useTokenBalanceStore();
```

**テスト項目**:
- [ ] モデル一覧が正しく表示される
- [ ] モデル切り替えが正しく動作する
- [ ] トークン残高が正しく表示される

---

#### ☐ 4.2 `app/screen/model-selection/hooks/useCreditAllocation.ts`
**現在の使用**:
```typescript
const { settings, refreshTokenBalance } = useSettingsStore();
```

**移行後**:
```typescript
import { useTokenBalanceStore } from '../../../settings/settingsStore';
const { balance, refreshTokenBalance } = useTokenBalanceStore();
```

**テスト項目**:
- [ ] クレジット配分が正しく動作する
- [ ] 残高更新が正しく動作する

---

#### ☐ 4.3 `app/screen/token-purchase/hooks/usePurchaseHandlers.ts`
**現在の使用**:
```typescript
const { refreshTokenBalance } = useSettingsStore();
```

**移行後**:
```typescript
import { useTokenBalanceStore } from '../../../settings/settingsStore';
const { refreshTokenBalance } = useTokenBalanceStore();
```

**テスト項目**:
- [ ] トークン購入後の残高更新が正しく動作する

---

#### ☐ 4.4 `app/billing/utils/modelCategory.ts`
**現在の使用**:
```typescript
import { TOKEN_CAPACITY_LIMITS } from '../../settings/settingsStore';
```

**移行後**:
```typescript
import { TOKEN_CAPACITY_LIMITS } from '../../settings/types/tokenBalance.types';
```

**テスト項目**:
- [ ] トークン容量制限が正しく適用される

---

#### ☐ 4.5 `app/billing/utils/costCalculation.ts`
**現在の使用**:
```typescript
const { settings } = useSettingsStore();
// settings.usage.monthlyTokensByModel を使用
```

**移行後**:
```typescript
import { useUsageTrackingStore } from '../../settings/settingsStore';
const { usage } = useUsageTrackingStore();
// usage.monthlyTokensByModel を使用
```

**テスト項目**:
- [ ] コスト計算が正しく動作する
- [ ] モデル別コストが正しく表示される

---

### Phase 5: チャット関連（4ファイル）

#### ☐ 5.1 `app/features/chat/index.ts`
**現在の使用**:
```typescript
const { settings, trackTokenUsage, incrementLLMRequestCount } = useSettingsStore();
```

**移行後**:
```typescript
import {
  useLLMSettingsStore,
  useTokenBalanceStore,
  useUsageTrackingStore
} from '../../settings/settingsStore';

const llmSettings = useLLMSettingsStore.getState();
const { loadedModels, activeModelCategory } = useTokenBalanceStore.getState();
const { trackTokenUsage, incrementLLMRequestCount } = useUsageTrackingStore.getState();
```

**テスト項目**:
- [ ] チャット送信が正しく動作する
- [ ] トークン使用量が正しく記録される
- [ ] LLMリクエストカウントが増加する

---

#### ☐ 5.2 `app/features/chat/components/ModelSelectionModal.tsx`
**現在の使用**:
```typescript
const { settings, loadModel } = useSettingsStore();
```

**移行後**:
```typescript
import { useTokenBalanceStore } from '../../../settings/settingsStore';
const { loadedModels, activeModelCategory, loadModel } = useTokenBalanceStore();
```

**テスト項目**:
- [ ] モーダル内のモデル選択が正しく動作する
- [ ] モデル切り替えが正しく反映される

---

#### ☐ 5.3 `app/features/chat/components/MessageInput.tsx`
**現在の使用**:
```typescript
const { settings } = useSettingsStore();
// settings.llmEnabled を使用
```

**移行後**:
```typescript
import { useLLMSettingsStore } from '../../../settings/settingsStore';
const { settings } = useLLMSettingsStore();
// settings.llmEnabled のみアクセス可能
```

**テスト項目**:
- [ ] LLM無効時に入力欄が無効化される
- [ ] LLM有効時に入力欄が有効化される

---

#### ☐ 5.4 `app/features/chat/hooks/useFileEditChatContext.ts`
**現在の使用**:
```typescript
const { settings } = useSettingsStore();
// settings.sendFileContextToLLM を使用
```

**移行後**:
```typescript
import { useLLMSettingsStore } from '../../../settings/settingsStore';
const { settings } = useLLMSettingsStore();
// settings.sendFileContextToLLM のみアクセス可能
```

**テスト項目**:
- [ ] ファイルコンテキストの送信設定が正しく動作する

---

### Phase 6: その他（6ファイル）

#### ☐ 6.1 `app/navigation/RootNavigator.tsx`
**現在の使用**:
```typescript
const { settings } = useSettingsStore();
// settings.startupScreen を使用
```

**移行後**:
```typescript
import { useEditorSettingsStore } from '../settings/settingsStore';
const { settings } = useEditorSettingsStore();
// settings.startupScreen のみアクセス可能
```

**テスト項目**:
- [ ] 起動時の画面が正しく選択される
- [ ] ナビゲーションが正しく動作する

---

#### ☐ 6.2 `app/screen/file-list-flat/FileListScreenFlat.tsx`
**現在の使用**:
```typescript
const { settings } = useSettingsStore();
// settings.categorySortMethod, settings.fileSortMethod を使用
```

**移行後**:
```typescript
import { useUISettingsStore } from '../../settings/settingsStore';
const { settings } = useUISettingsStore();
// settings.categorySortMethod, settings.fileSortMethod のみアクセス可能
```

**テスト項目**:
- [ ] ファイルソートが正しく動作する
- [ ] カテゴリーソートが正しく動作する

---

#### ☐ 6.3 `app/screen/file-edit/FileEditScreen.tsx`
**現在の使用**:
```typescript
const { settings } = useSettingsStore();
// settings.defaultFileViewScreen を使用
```

**移行後**:
```typescript
import { useEditorSettingsStore } from '../../settings/settingsStore';
const { settings } = useEditorSettingsStore();
// settings.defaultFileViewScreen のみアクセス可能
```

**テスト項目**:
- [ ] デフォルト表示画面が正しく適用される

---

#### ☐ 6.4 `app/hooks/useModelSwitch.ts`
**現在の使用**:
```typescript
const { settings, loadModel } = useSettingsStore();
```

**移行後**:
```typescript
import { useTokenBalanceStore } from '../settings/settingsStore';
const { loadedModels, activeModelCategory, loadModel, setActiveModelCategory } = useTokenBalanceStore();
```

**テスト項目**:
- [ ] モデル切り替えが正しく動作する
- [ ] アクティブカテゴリーの変更が正しく反映される

---

#### ☐ 6.5 `app/billing/utils/tokenBalance.ts`
**現在の使用**:
```typescript
const { settings, getTotalTokensByCategory } = useSettingsStore();
```

**移行後**:
```typescript
import { useTokenBalanceStore } from '../../settings/settingsStore';
const { balance, getTotalTokensByCategory } = useTokenBalanceStore();
```

**テスト項目**:
- [ ] カテゴリー別トークン合計が正しく計算される

---

#### ☐ 6.6 `app/billing/services/purchaseRestoration.ts`
**現在の使用**:
```typescript
const { refreshTokenBalance } = useSettingsStore.getState();
```

**移行後**:
```typescript
import { useTokenBalanceStore } from '../../settings/settingsStore';
const { refreshTokenBalance } = useTokenBalanceStore.getState();
```

**テスト項目**:
- [ ] 購入復元後のトークン残高更新が正しく動作する

---

## 移行完了後の作業

### ☐ Step 1: settingsFacade.tsを削除
```bash
rm app/settings/stores/settingsFacade.ts
```

### ☐ Step 2: settingsStore.tsから削除
`app/settings/settingsStore.ts`から以下を削除：

```typescript
// 削除する
export {
  useSettingsStore,
  TOKEN_CAPACITY_LIMITS,
  type AppSettings,
} from './stores/settingsFacade';
```

### ☐ Step 3: TOKEN_CAPACITY_LIMITSのエクスポートを追加
`app/settings/settingsStore.ts`に追加：

```typescript
// 追加する
export { TOKEN_CAPACITY_LIMITS } from './types/tokenBalance.types';
```

### ☐ Step 4: ビルド確認
```bash
npx tsc --noEmit
```

### ☐ Step 5: テスト実行
すべての機能が正しく動作することを確認

### ☐ Step 6: コミット
```bash
git add .
git commit -m "refactor: Migrate from settingsFacade to individual stores

- Removed settingsFacade.ts (450 lines)
- All 22 files now use individual stores directly
- Improved performance (reduced unnecessary re-renders)
- Better type safety and dependency clarity"
```

---

## 注意事項

### パフォーマンス最適化
個別ストアを使用することで、コンポーネントは必要な設定のみを購読します。
これにより、無関係な設定変更時の不要な再レンダリングが削減されます。

### 型安全性
個別ストアを使用すると、TypeScriptが使用可能なプロパティを厳密にチェックします。
これにより、存在しないプロパティへのアクセスがコンパイル時に検出されます。

### 段階的移行
すべてのファイルを一度に移行する必要はありません。
Phase 1から順番に、1ファイルずつ移行してテストすることを推奨します。

### テスト
各ファイルの移行後は、必ず該当機能をテストしてください。
特にトークン残高、使用量トラッキング、設定の保存/読み込みは重要です。

---

## 進捗トラッキング

### 進捗サマリー
- [x] Phase 1: 初期化タスク（4ファイル）
- [x] Phase 2: 設定画面（2ファイル）
- [x] Phase 3: テーマ関連（1ファイル）
- [ ] Phase 4: モデル選択/課金関連（5ファイル）
- [ ] Phase 5: チャット関連（4ファイル）
- [ ] Phase 6: その他（6ファイル）
- [ ] 完了後作業（settingsFacade削除など）

**合計**: 7/22ファイル完了

---

## 質問・サポート
移行中に問題が発生した場合は、以下を確認してください：

1. `docs/issues/settings-architecture-issues.md` - 元の問題分析
2. `docs/issues/settings-architecture-refactoring-complete.md` - リファクタリング詳細
3. 各ストアのコメント - 使用方法の説明

Good luck! 🚀
