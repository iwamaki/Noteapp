# settingsフォルダのアーキテクチャ問題と改善提案

## 調査日
2025-11-19

## 現状の構造

```
app/settings/
├── settingsStore.ts (687行)
├── SettingsScreen.tsx (375行)
├── components/
│   └── TokenUsageSection.tsx (243行)
└── hooks/
    └── useSettingsHeader.tsx (35行)
```

## 🔴 重大な問題点

### 1. God Object パターン（settingsStore.ts: 687行）

**問題**: `settingsStore.ts`が単一責任原則(SRP)に違反し、多数の責任を持っています。

**settingsStoreが持つ責任一覧**:
1. UI設定（テーマ、フォントサイズ、行間など）
2. 編集設定（自動保存、タブサイズ、インデントなど）
3. LLM/AI設定（プロバイダー、APIキー、コンテキスト管理）
4. バージョン管理/バックアップ設定
5. セキュリティ/ストレージ設定
6. トークン残高管理（API連携）
7. 使用量トラッキング（月次リセット含む）
8. 購入履歴管理
9. モデル装填管理（Quick/Thinkスロット）
10. 認証状態変更ハンドラ
11. UI状態管理（モーダル表示フラグ）

**影響**:
- コードの可読性が低下
- テストが困難（モック化が複雑）
- 変更時の影響範囲が広い
- チーム開発時のコンフリクトリスク増大

---

### 2. 型定義の肥大化（AppSettings: 約150行）

**問題**: 1つの型に13個の異なる設定カテゴリーが混在

```typescript
export interface AppSettings {
  // 1. UI設定
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  // ... 7項目

  // 2. 編集設定
  startupScreen: 'file-list' | 'last-file' | 'new-file';
  // ... 8項目

  // 3. LLM/AI設定
  llmEnabled: boolean;
  // ... 8項目

  // 4-13. その他の設定カテゴリー
  // ...
}
```

**影響**:
- 型の理解が困難
- 部分的な更新が非効率
- 関連する設定のグループ化が不明確

---

### 3. 循環依存のリスク

**問題**: settingsStoreが多数の外部モジュールに依存

```typescript
// settingsStore.ts
import { getModelCategoryFromId } from '../features/llmService/utils/modelCategoryHelper';
import { providerCache } from '../features/llmService/cache/providerCache';

// 遅延インポート（循環依存回避のため）
const { getBillingApiService } = await import('../billing/services/billingApiService');
const { getAccessToken } = await import('../auth/tokenService');
```

**影響**:
- 遅延インポートで循環依存を回避しているが、本質的な解決になっていない
- モジュール間の依存関係が複雑化
- バンドルサイズの増加

---

### 4. ビジネスロジックとUI設定の混在

**問題**: トークン残高管理、使用量トラッキング、認証処理などのビジネスロジックがUI設定と同じストアに混在

**例**:
```typescript
// UI設定
theme: 'light' | 'dark' | 'system',
fontSize: 'small' | 'medium' | 'large',

// ビジネスロジック（課金システム）
tokenBalance: {
  credits: number;
  allocatedTokens: { [modelId: string]: number };
},
loadTokenBalance: () => Promise<void>,
trackTokenUsage: (input: number, output: number, modelId: string) => Promise<void>,
```

**影響**:
- 関心の分離が不明確
- 再利用性の低下
- ドメイン駆動設計(DDD)の原則に違反

---

### 5. AsyncStorageへの過度な依存

**問題**: すべての設定変更で即座にAsyncStorageへ書き込み

```typescript
updateSettings: async (updates: Partial<AppSettings>) => {
  const newSettings = { ...get().settings, ...updates };
  await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
  set({ settings: newSettings });
},

trackTokenUsage: async (inputTokens: number, outputTokens: number, modelId: string) => {
  // ... 計算
  await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
  set({ settings: newSettings });
},
```

**影響**:
- パフォーマンスの問題（頻繁な書き込み）
- バッチ更新の困難さ
- エラー処理の複雑化

---

### 6. テストの困難さ

**問題**: 687行の巨大なストアで、個別機能のテストが困難

**影響**:
- ユニットテストの作成が複雑
- モック化が困難
- テストカバレッジの低下

---

## ✅ 改善提案

### Phase 1: ストアの分割（優先度: 高）

責任ごとにストアを分割し、関心の分離を実現：

```
app/settings/
├── stores/
│   ├── uiSettingsStore.ts          # UI/表示設定（テーマ、フォント）
│   ├── editorSettingsStore.ts      # エディタ設定（自動保存、タブサイズ）
│   ├── llmSettingsStore.ts         # LLM/AI設定（プロバイダー、APIキー）
│   └── settingsFacade.ts           # 既存コード互換性用ファサード
├── billing/                        # 課金関連を独立モジュールに
│   ├── tokenBalanceStore.ts        # トークン残高と配分
│   ├── usageTrackingStore.ts       # 使用量トラッキング
│   └── purchaseHistoryStore.ts     # 購入履歴
├── types/
│   ├── uiSettings.types.ts
│   ├── editorSettings.types.ts
│   └── llmSettings.types.ts
└── services/
    └── settingsPersistenceService.ts  # AsyncStorage操作を抽象化
```

**メリット**:
- 各ストアが単一責任を持つ
- テストが容易
- 変更の影響範囲が限定的
- チーム開発でのコンフリクト減少

---

### Phase 2: サービスクラスの導入（優先度: 中）

AsyncStorage操作とビジネスロジックをサービスクラスに分離：

```typescript
// services/settingsPersistenceService.ts
export class SettingsPersistenceService {
  private static STORAGE_KEY_PREFIX = '@app_settings_';

  async save<T>(key: string, data: T): Promise<void> {
    await AsyncStorage.setItem(
      `${this.STORAGE_KEY_PREFIX}${key}`,
      JSON.stringify(data)
    );
  }

  async load<T>(key: string, defaultValue: T): Promise<T> {
    const stored = await AsyncStorage.getItem(`${this.STORAGE_KEY_PREFIX}${key}`);
    return stored ? JSON.parse(stored) : defaultValue;
  }

  async batchSave(updates: Record<string, any>): Promise<void> {
    // バッチ更新でパフォーマンス改善
  }
}

// services/usageTrackingService.ts
export class UsageTrackingService {
  async trackTokenUsage(
    inputTokens: number,
    outputTokens: number,
    modelId: string
  ): Promise<void> {
    // トークン使用量追跡ロジック
  }

  async checkAndResetMonthlyUsage(): Promise<void> {
    // 月次リセットロジック
  }
}
```

**メリット**:
- ストアとインフラ層の分離
- テストが容易（モック化しやすい）
- 再利用性の向上

---

### Phase 3: ファサードパターンの適用（優先度: 高）

既存コードの互換性を保つため、`settingsFacade.ts`を作成：

```typescript
// stores/settingsFacade.ts
import { useUISettingsStore } from './uiSettingsStore';
import { useEditorSettingsStore } from './editorSettingsStore';
import { useLLMSettingsStore } from './llmSettingsStore';
import { useTokenBalanceStore } from '../billing/tokenBalanceStore';

/**
 * 既存コード互換性用のファサード
 * 将来的に削除予定（各コンポーネントで個別ストアを使用）
 */
export const useSettingsStore = create(() => ({
  // 各ストアから集約
  settings: {
    ...useUISettingsStore.getState().settings,
    ...useEditorSettingsStore.getState().settings,
    ...useLLMSettingsStore.getState().settings,
    ...useTokenBalanceStore.getState().balance,
  },

  updateSettings: async (updates: Partial<AppSettings>) => {
    // 適切なストアに委譲
    if ('theme' in updates || 'fontSize' in updates) {
      await useUISettingsStore.getState().updateSettings(updates);
    }
    // ...
  },
}));
```

**メリット**:
- 既存コードの変更を最小限に抑える
- 段階的な移行が可能
- リスクの低減

---

### Phase 4: 型定義の分離（優先度: 中）

各設定カテゴリーの型を別ファイルに分離：

```typescript
// types/uiSettings.types.ts
export interface UISettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  fontFamily: string;
  lineSpacing: number;
  showLineNumbers: boolean;
  syntaxHighlight: boolean;
  showMarkdownSymbols: boolean;
  highContrastMode: boolean;
  screenReaderOptimization: boolean;
}

// types/editorSettings.types.ts
export interface EditorSettings {
  startupScreen: 'file-list' | 'last-file' | 'new-file';
  autoSaveEnabled: boolean;
  autoSaveInterval: number;
  defaultEditorMode: 'edit' | 'preview' | 'split';
  defaultFileViewScreen: 'edit' | 'preview';
  autoIndent: boolean;
  tabSize: number;
  spellCheck: boolean;
  autoComplete: boolean;
}
```

**メリット**:
- 型の見通しが良くなる
- 関連する設定のグループ化が明確
- インポート時の型定義の絞り込みが可能

---

## 🎯 実装計画

### Step 1: 課金関連の分離（最優先）
- トークン残高管理を`app/billing/stores/`に移動
- 使用量トラッキングを独立したストアに分離
- 理由: 課金システムは他の設定と完全に独立したドメイン

### Step 2: UI設定の分離
- `uiSettingsStore.ts`を作成
- テーマ、フォント、表示関連設定を移動

### Step 3: エディタ設定の分離
- `editorSettingsStore.ts`を作成
- 編集、自動保存、ファイル表示設定を移動

### Step 4: LLM設定の分離
- `llmSettingsStore.ts`を作成
- LLM関連設定を移動（モデル装填は課金ストアへ）

### Step 5: ファサードの作成と既存コードの段階的移行
- `settingsFacade.ts`を作成
- 各コンポーネントを段階的に新ストアへ移行
- 旧`settingsStore.ts`を削除

---

## 📊 期待される効果

### コード品質
- ✅ 単一責任原則の遵守
- ✅ テストカバレッジの向上（各ストアを独立してテスト可能）
- ✅ 可読性の大幅な改善

### パフォーマンス
- ✅ バッチ更新によるAsyncStorage書き込みの最適化
- ✅ 不要な再レンダリングの削減（関心のある設定のみ購読）

### 保守性
- ✅ 変更の影響範囲が限定的
- ✅ チーム開発でのコンフリクト減少
- ✅ 新機能追加が容易

### スケーラビリティ
- ✅ 新しい設定カテゴリーの追加が容易
- ✅ ドメイン駆動設計への移行の基盤

---

## ⚠️ 移行時の注意点

1. **既存コードへの影響を最小化**
   - ファサードパターンで後方互換性を維持
   - 段階的な移行で安全性を確保

2. **AsyncStorageキーの変更**
   - 既存の`@app_settings`キーから分割された新キーへのマイグレーション処理が必要
   - データ損失を防ぐため、マイグレーションスクリプトを実装

3. **テストの追加**
   - 各新ストアにユニットテストを追加
   - マイグレーション処理のテスト

4. **型安全性の維持**
   - 分割後も型安全性を確保
   - TypeScriptの型チェックを活用

---

## 参考資料

- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [SOLID原則](https://en.wikipedia.org/wiki/SOLID)
- [Zustand Best Practices](https://docs.pmnd.rs/zustand/guides/practice-with-no-store-actions)
