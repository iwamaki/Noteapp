---
filename: 20251030_refactor_filelist_screen_responsibility
id: 105
status: new
priority: medium
attempt_count: 0
tags: [refactoring, architecture, maintainability]
date: 2025/10/30
---

## 概要 (Overview)

FileListScreenFlat.tsxが718行に膨れ上がり、複数の責任を抱えている状態を解消する。階層的カテゴリー表示と折りたたみ機能の実装により、Screen層に本来属さないビジネスロジックやUI表示ロジックが集中してしまった。これを適切なレイヤーに分散し、保守性と拡張性を向上させる。

## 背景 (Background)

当初、FileListScreenFlatは既存のFileListScreen（454行）をシンプル化した250行程度の実装として設計された。しかし、以下の機能追加により大幅に肥大化：

1. **Phase 1**: カテゴリーによるグルーピング表示（フラット）
2. **Phase 2A**: 階層的カテゴリーグルーピング（無限階層対応）
3. **Phase 2B**: ファイルアイテムの階層インデント対応
4. **Phase 2C**: カテゴリーの展開/折りたたみ機能

特に問題となっている箇所：
- **階層グルーピングロジック**（284-407行、128行）: カテゴリーノード構築、再帰的な親子関係構築、ソートロジック
- **セクションヘッダーレンダリング**（484-541行、57行）: インデント計算、背景色計算、折りたたみアイコン表示
- **折りたたみ状態管理**: expandedCategories stateとその管理ロジック
- **可視セクションフィルタリング**: 親の折りたたみ状態に基づく再帰的フィルタリング

これらはScreen層の責任を超えており、以下の問題を引き起こしている：
- テストが困難（巨大なコンポーネントの単体テスト）
- 再利用性の欠如（他のリスト画面で同様の機能が必要になった場合）
- 可読性の低下（1ファイル内で複数の関心事が混在）
- 変更の影響範囲が不明瞭（修正時のリグレッションリスク）

## 実装方針 (Implementation Strategy)

責任を適切な層に分散する。具体的な実装アプローチは次のセッションで検討するが、以下の指針に従う：

### 1. **関心の分離 (Separation of Concerns)**
- Screen層：画面全体の構成、ナビゲーション、モーダル管理
- Component層：UI表示ロジック、ユーザーインタラクション
- Hooks層：状態管理、ビジネスロジック
- Service層：データ変換、複雑な計算ロジック

### 2. **既存の設計パターンの尊重**
- 既存のhooksディレクトリ（`hooks/useFileListHeader.tsx`）と同様のパターンを踏襲
- 既存のコンポーネント構成（FlatListItem、各種Modal等）との整合性を保つ
- ListItemコンポーネントの共通レイアウト提供という設計思想を維持

### 3. **段階的なリファクタリング**
- 一度にすべてを変更せず、独立した責任から順次分離
- 各ステップでTypeScriptエラーゼロを維持
- 既存機能の動作を保証（リグレッションなし）

## 受け入れ条件 (Acceptance Criteria)

- [ ] FileListScreenFlat.tsxの行数が500行以下になっていること
- [ ] 階層グルーピングロジックがScreen層から分離されていること
- [ ] セクションヘッダーのレンダリングロジックが独立したコンポーネントまたはhooksになっていること
- [ ] 折りたたみ状態管理が適切な抽象化（hooks等）に移行されていること
- [ ] TypeScriptエラーがゼロであること
- [ ] 既存のすべての機能が正常に動作すること（階層表示、折りたたみ、ファイル操作等）
- [ ] 各レイヤーの責任が明確に文書化されていること（コメントまたはJSDoc）

## 関連ファイル (Related Files)

### 主要ファイル
- `app/screen/file-list-flat/FileListScreenFlat.tsx` (718行) - リファクタリング対象
- `app/screen/file-list-flat/components/FlatListItem.tsx` - ファイルアイテム表示
- `app/components/ListItem.tsx` - 共通リストアイテムレイアウト

### 既存のパターン参考
- `app/screen/file-list-flat/hooks/useFileListHeader.tsx` - hooks層の実装パターン
- `app/data/services/metadataService.ts` - サービス層の実装パターン（既にgroupFilesByCategory関数あり）

### 型定義
- `app/data/core/typesFlat.ts` - FileFlat, FileCategorySectionHierarchical等

### Context/Provider
- `app/screen/file-list-flat/context/FlatListProvider.tsx` - 状態管理パターン

## 制約条件 (Constraints)

- **既存機能の維持**: すべての機能（階層表示、折りたたみ、ファイル操作）が現状と同じように動作すること
- **パフォーマンス**: リスト表示のパフォーマンスが現状より悪化しないこと（特に大量ファイル時）
- **共通コンポーネントの尊重**: ListItemコンポーネントの設計思想（共通レイアウト提供）を壊さないこと
- **TypeScript厳格**: すべての型を適切に定義し、型安全性を維持すること
- **テスタビリティ**: 分離後のロジックが単体テスト可能であること

## 開発ログ (Development Log)

---
### 現在の状況（リファクタリング前）

**ファイル構成:**
```
FileListScreenFlat.tsx (718行)
├─ State管理 (~20行)
│  ├─ モーダル状態
│  └─ expandedCategories (折りたたみ状態)
├─ ハンドラー群 (~180行)
│  ├─ ファイル操作: 選択、削除、コピー、リネーム
│  ├─ カテゴリー/タグ編集
│  └─ handleToggleCategory (折りたたみ切り替え)
├─ 階層グルーピングロジック (128行: 284-407)
│  ├─ CategoryNode構築
│  ├─ ensureCategoryNode (再帰的親生成)
│  ├─ calculateTotalFileCount (子孫ファイル数計算)
│  └─ addCategoryAndChildren (階層的ソート)
├─ 折りたたみフィルタリング (~30行: 419-443)
│  └─ visibleSections (親の状態を再帰チェック)
├─ renderSectionHeader (57行: 484-541)
│  ├─ インデント計算
│  ├─ 背景色計算 (getBackgroundColor)
│  ├─ 折りたたみアイコン表示
│  └─ TouchableOpacityラッパー
└─ JSX & その他 (~300行)
```

**問題点の詳細:**

1. **階層グルーピングロジック（128行）**
   - Screen層に属さない純粋なデータ変換ロジック
   - 複雑な再帰処理、Map/Set操作が含まれる
   - MetadataServiceに既に`groupFilesByCategory()`が存在するが、階層対応版が必要

2. **renderSectionHeader（57行）**
   - UI表示ロジックが直接記述されている
   - インデント計算、背景色生成などのロジックが混在
   - 独立したコンポーネントにすべき内容

3. **折りたたみ状態管理**
   - `expandedCategories: Set<string>` がScreen層にある
   - 初期化ロジック（全ルート展開）がuseEffect内に散在
   - 状態とロジックをhooksに抽象化可能

**実装されている機能（維持必須）:**
- ✅ 無限階層カテゴリーグルーピング
- ✅ カテゴリーヘッダーの階層インデント（16 + level * 24px）
- ✅ ファイルアイテムの階層インデント（16 + (level + 1) * 24px）
- ✅ 階層レベルに応じた背景色の段階的変更
- ✅ chevronアイコンによる展開/折りたたみ表示（子要素がある場合のみ）
- ✅ 親の折りたたみ時に子カテゴリーとファイルを自動非表示
- ✅ 初回ロード時に全ルートカテゴリーを自動展開

---

## AIへの申し送り事項 (Handover to AI)

### 現在の状況
FileListScreenFlat.tsxは機能的には完全に動作しているが、718行に膨れ上がり、責任が適切に分散されていない。リファクタリングが必要。

### 次のアクション
以下の責任を適切な層に分離してください：

1. **階層グルーピングロジック（最優先）**
   - 現在: FileListScreenFlat.tsxの284-407行（128行）
   - 候補: MetadataServiceに`groupFilesByCategoryHierarchical()`として追加、またはカスタムhooks

2. **セクションヘッダー表示**
   - 現在: renderSectionHeader内（484-541行、57行）
   - 候補: 独立したコンポーネント（例: CategorySectionHeader.tsx）

3. **折りたたみ状態管理**
   - 現在: expandedCategories state + handleToggleCategory + visibleSections filtering
   - 候補: カスタムhooks（例: useCategoryCollapse.ts）

### 考慮事項/ヒント

- **MetadataService参考**: `app/data/services/metadataService.ts:109-166`に既存の`groupFilesByCategory()`実装あり。これは階層対応していないフラット版だが、パターンとして参考になる
- **hooks実装パターン**: `app/screen/file-list-flat/hooks/useFileListHeader.tsx`が既存hooksの実装例
- **共通コンポーネント設計**: FlatListItemは`app/components/ListItem.tsx`の共通レイアウトを使用している。この設計思想を崩さないこと
- **パフォーマンス**: sectionsとvisibleSectionsはuseMemoで最適化されている。リファクタリング後も同様の最適化を維持
- **型安全性**: FileCategorySectionHierarchical型（typesFlat.ts:127-131）が既に定義済み

### リファクタリングの自由度
- 具体的なアーキテクチャはAIの判断に委ねる
- Service層、hooks層、Component層のいずれでも適切な場所に配置してよい
- 既存のディレクトリ構造を尊重しつつ、必要なら新しいディレクトリ/ファイルを追加してよい
- 段階的なリファクタリング（複数コミット）を推奨するが、一括でも構わない

**目標**: 保守性と拡張性に優れた、テスト可能なアーキテクチャの実現
