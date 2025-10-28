---
filename: 01_flat_data_structure_migration
id: 1
status: in_progress
priority: A:high
attempt_count: 1
tags: [architecture, data-layer, migration, product-strategy]
---

## 概要 (Overview)

> フォルダ構造ベースのデータ層から、フラット構造+メタデータ管理へ移行する。
> プロダクトの方向性を明確化し、LLMの強みを活かした「学習意欲のある人」向けメモアプリとして再設計する。

## 背景 (Background)

### 現状の課題

1. **プロダクト方向性の不明確さ**
   - 「LLMが使えるメモアプリ」という手段に焦点が当たっているが、ユーザーに提供する価値が曖昧
   - フォルダ構造、タグ、多機能を提供しているが、「ユーザーは何ができるのか」が不明確
   - ターゲットユーザー層が定まっておらず、差別化ポイントが見えにくい

2. **技術的な複雑さ**
   - フォルダ階層構造の管理が複雑（`DirectoryResolver`, `FolderRepositoryV2`など）
   - パス解決、再帰的検索、slug管理など、実装コストが高い
   - ファイル移動やリネーム操作が煩雑（ディレクトリのコピー&削除が必要）
   - LLMでメモを横断的に分析する際、フォルダ境界が制約になる可能性

3. **フォルダ構造の本質的な問題**
   - メモが一つのフォルダにしか属せない（複数カテゴリーに関連するメモは？）
   - ユーザーに「どこに保存するか」という認知負荷を与える
   - フォルダ分類に悩む時間 > メモを書く時間 になるリスク

### 新しい方向性

**ターゲットユーザー**: 学習意欲のある人（研究者、学生、知的生産者）

**コア価値**: メモから知識を抽出し、学びを深める

**技術的アプローチ**:
- フラット構造: 全メモを一つの階層に配置
- メタデータ管理: タグ、カテゴリー、AI生成要約などで意味づけ
- LLM活用: セマンティック検索、自動カテゴライズ、知識グラフ生成

## 実装方針 (Implementation Strategy)

### 1. データ型定義の再設計

**新しいFile型**:
```typescript
interface File {
  id: string
  title: string
  content: string

  // 柔軟なメタデータ
  tags: string[]                    // ユーザー指定
  categories: string[]              // 仮想フォルダとして使える
  summary?: string                  // LLM生成の要約
  relatedNoteIds?: string[]         // LLM自動抽出の関連メモ
  embedding?: number[]              // セマンティック検索用（将来）

  createdAt: Date
  updatedAt: Date
}
```

**削除する型・概念**:
- `Folder` 型
- `FolderMetadata` 型
- `slug` フィールド
- `path` 概念

### 2. データ層の簡素化

**削除するファイル**:
- `app/data/infrastructure/directoryResolver.ts` (288行)
- `app/data/repositories/folderRepositoryV2.ts` (508行)
- `app/data/core/slugUtils.ts`

**大幅に簡素化されるファイル**:
- `fileRepositoryV2.ts`:
  - `getByFolderPath()` → `getAll()` に変更
  - `move()` 削除（フラット構造では不要）
  - `copy()` 簡素化（パス指定が不要に）

**新しいストレージ構造**:
```
{documentDirectory}/content/
├── {file-uuid-1}/
│   ├── meta.json
│   └── content.md
├── {file-uuid-2}/
│   ├── meta.json
│   └── content.md
└── versions/
    └── {file-uuid-1}/
        ├── v1.json
        └── v2.json
```

### 3. UI層での仮想整理

フラット構造でも、UI上では整理された感じを提供：
- **カテゴリービュー**: categoriesフィールドでフォルダっぽく表示
- **タグフィルター**: 複数タグでの絞り込み
- **AI提案ビュー**: 「関連するメモ」「今週の学び」など
- **検索優先**: 強力な検索（フルテキスト + セマンティック）

### 4. マイグレーション戦略

**段階的な移行**:
1. フェーズ1: 新型定義の作成、新Repositoryの実装
2. フェーズ2: 既存データの移行スクリプト作成
3. フェーズ3: UI層の切り替え
4. フェーズ4: 旧コードの削除

**データ移行**:
- 既存のフォルダ構造 → `categories` フィールドに変換
  - 例: `/研究/論文メモ/file1` → `categories: ["研究", "論文メモ"]`
- 全ファイルをフラット階層に配置
- メタデータは保持

## 受け入れ条件 (Acceptance Criteria)

- [x] 新しいデータ型定義（`File`型）を作成
- [x] フラット構造対応の新Repository実装
  - [x] `FileRepositoryFlat.ts`: `getAll()`, `create()`, `update()`, `delete()`
  - [x] `MetadataService.ts`: categories, tags, summaryの管理
- [ ] データ移行スクリプト作成・テスト
  - [ ] フォルダ構造 → categories変換
  - [ ] 全ファイルのフラット化
  - [ ] データ整合性チェック
- [ ] UI層の対応
  - [ ] カテゴリービューの実装（仮想フォルダ）
  - [ ] 既存のフォルダUIから切り替え
- [ ] 旧コードの削除
  - [ ] `DirectoryResolver`削除
  - [ ] `FolderRepositoryV2`削除
  - [ ] `slugUtils`削除
- [ ] テスト
  - [ ] 単体テスト（新Repository）
  - [ ] 統合テスト（マイグレーション）
  - [ ] E2Eテスト（UI動作確認）

## 関連ファイル (Related Files)

### 現在のデータ層（変更・削除対象）
- `app/data/core/types.ts` - 型定義の大幅変更
- `app/data/infrastructure/directoryResolver.ts` - 削除
- `app/data/repositories/folderRepositoryV2.ts` - 削除
- `app/data/repositories/fileRepositoryV2.ts` - 大幅簡素化
- `app/data/core/slugUtils.ts` - 削除

### UI層（影響を受ける）
- `app/screen/file-list/` - フォルダビュー → カテゴリービューへ
- `app/navigation/types.ts` - ナビゲーションパラメータ変更

## 制約条件 (Constraints)

### 技術的制約
- 既存ユーザーデータを破壊しないこと（マイグレーションで対応）
- React Native + TypeScriptの既存技術スタック維持
- expo-file-systemは引き続き使用（ストレージ構造を変更するのみ）

### 設計原則
- シンプルさ優先: 複雑な階層管理を避ける
- LLM最適化: 全メモを横断的に分析できる構造
- ユーザー体験: 整理された感じは維持（UI層で仮想的に提供）
- 拡張性: 将来的なメタデータ追加に柔軟

### パフォーマンス要件
- `getAll()` の実行時間: ファイル数100件で < 500ms
- メタデータ検索: O(n)の線形探索（将来的にインデックス化を検討）

## 開発ログ (Development Log)

### Phase 1: 新型定義・新Repository実装 ✅ (2025-10-28)

**実装内容:**

1. **新型定義の作成** (`app/data/core/typesFlat.ts`)
   - `FileFlat`: フラット構造のファイル型定義
   - `FileMetadataFlat`: ファイルシステム保存用のメタデータ型
   - `CategoryInfo`, `TagInfo`: 統計情報用の型
   - `MetadataSearchOptions`: 複合検索オプション
   - LLM生成フィールド追加: `summary`, `relatedNoteIds`, `embedding`
   - 実装時間: 約30分

2. **新Repository実装** (`app/data/repositories/fileRepositoryFlat.ts`)
   - 基本的なCRUD操作を実装:
     - `getAll()`: 全ファイル取得（フラット構造なので実装が簡潔）
     - `getById()`, `getByIds()`: ID検索
     - `create()`: ファイル作成
     - `update()`: ファイル更新（バージョン番号自動インクリメント）
     - `delete()`, `batchDelete()`: 削除操作
   - ヘルパー関数:
     - `metadataToFile()`, `fileToMetadata()`: 型変換
     - `readFileMetadata()`, `writeFileMetadata()`: メタデータ読み書き
     - `readFileContent()`, `writeFileContent()`: コンテンツ読み書き
   - `initializeFileSystemFlat()`: ファイルシステム初期化
   - コード行数: 約450行（旧fileRepositoryV2.tsの618行から削減）
   - 実装時間: 約1時間

3. **メタデータサービス** (`app/data/services/metadataService.ts`)
   - カテゴリー操作:
     - `getByCategory()`: 単一カテゴリーでフィルタリング
     - `getByCategoriesOr()`: 複数カテゴリーOR検索
     - `getAllCategories()`: カテゴリー統計情報取得
     - `addCategory()`, `removeCategory()`: カテゴリー追加・削除
   - タグ操作:
     - `getByTag()`, `getByTagsOr()`, `getByTagsAnd()`: タグ検索
     - `getAllTags()`: タグ統計情報取得
     - `addTag()`, `removeTag()`: タグ追加・削除
   - 複合検索:
     - `searchByMetadata()`: カテゴリー + タグ + テキスト検索
   - LLM生成メタデータ操作:
     - `updateSummary()`: 要約更新
     - `updateRelatedNotes()`: 関連メモ更新
     - `updateEmbedding()`: embedding更新
   - コード行数: 約370行
   - 実装時間: 約45分

**型チェック:**
- TypeScript型チェック実行: ✅ エラーなし
- 全ファイルで型の整合性を確認

**削減されるコード量（予想）:**
- `DirectoryResolver`: 288行 → 削除予定
- `FolderRepositoryV2`: 508行 → 削除予定
- `fileRepositoryV2`: 618行 → 450行に簡素化（168行削減）
- `slugUtils`: 約50行 → 削除予定
- **合計削減予定**: 約800行以上

**Phase 1の成果:**
- ✅ シンプルで理解しやすいデータ層の実装
- ✅ フォルダ階層の複雑さを排除
- ✅ メタデータベースの柔軟な検索機能
- ✅ LLM統合のための基盤（summary, relatedNoteIds, embedding）

**次のステップ (Phase 2):**
- データマイグレーションスクリプトの作成
- 既存データのフラット構造への変換
- データ整合性チェック

---

## AIへの申し送り事項 (Handover to AI)

### 現在の状況
- Phase 1完了 ✅ (2025-10-28)
- 新型定義、新Repository、MetadataServiceの実装完了
- 型チェック済み、エラーなし
- 既存コードと並行して配置（破壊的変更なし）

### 次のアクション (Phase 2)

**推奨される実装順序**:

1. **新型定義の作成** (`app/data/core/typesFlat.ts`)
   - 新しい`File`型、メタデータ関連型を定義
   - 既存の`types.ts`と並行して配置

2. **新Repository実装** (`app/data/repositories/fileRepositoryFlat.ts`)
   - `getAll()`: 全ファイル取得
   - `getById()`: ID検索
   - `create()`, `update()`, `delete()`
   - シンプルなフラット構造で実装

3. **メタデータサービス** (`app/data/services/metadataService.ts`)
   - `getByCategory()`: カテゴリーでフィルタリング
   - `getByTags()`: タグで検索
   - `updateCategories()`, `updateTags()`

4. **マイグレーションスクリプト** (`scripts/migrateToFlat.ts`)
   - 既存フォルダ構造を走査
   - `categories`フィールドに変換
   - データ整合性チェック

5. **UI層の更新**
   - `FileListScreen`: カテゴリービューへ変更
   - ナビゲーション: フォルダパス → カテゴリーフィルターへ

### 考慮事項/ヒント
- まずは小さく始める: 新Repository実装 → 簡単な動作確認 → マイグレーション
- 旧コードは残したまま、新コードを並行稼働させてテスト
- マイグレーションは一方向（ロールバック不要）だが、念のためバックアップ推奨
- UI層の変更は最後に（データ層が安定してから）

### プロダクト面での検討事項
- LLMでどんなメタデータを自動生成するか（summary, relatedNoteIds, etc.）
- カテゴリーとタグの使い分け（UI上でどう見せるか）
- セマンティック検索の優先度（embeddingフィールドの実装時期）
