---
filename: 20251029_implement_file_list_category_grouping
id: 1
status: done
priority: medium
attempt_count: 2
tags: [UI, data-management, refactoring]
date: 2025/10/29
completed_date: 2025/10/30
---

## 概要 (Overview)

ファイルリスト画面において、ファイルをカテゴリーごとにグルーピングして表示する機能を実装します。これにより、ユーザーはより直感的にファイルを整理・閲覧できるようになります。

## 背景 (Background)

現在のファイルリストはフラットな構造であり、ファイル数が増えると目的のファイルを見つけにくくなるという課題があります。ユーザーからの要望として、ファイルの整理を容易にするためにカテゴリーによるグルーピング表示が求められています。作成した `docs/sandbox/grouped_file_list_ui.svg` は、この機能のUIイメージを明確に示しています。また、カテゴリーが複数設定されているファイルについて、それらのカテゴリーを階層的に表示することで、仮想的なディレクトリ構造を模擬する可能性も検討したいと考えています。

## 実装方針 (Implementation Strategy)

1.  **データ層でのグルーピング処理の導入:**
    *   ファイルデータをカテゴリーに基づいてグループ化するロジックをデータ層（例: サービス層）に実装します。
    *   この処理では、ファイルが複数のカテゴリーを持つ場合の扱い（例: 複数カテゴリーでの表示、プライマリーカテゴリーの選択、または階層的な解釈）を考慮し、UI層が利用しやすい形式でデータを提供します。
    *   カテゴリーを持たないファイルについても、適切なグループに割り当てる方針を定めます。
2.  **UI層でのリスト表示コンポーネントの適応:**
    *   現在のフラットなリスト表示コンポーネントを、グループ化されたデータを効率的に表示できるコンポーネント（例: React Nativeの `SectionList`）に置き換えるか、既存のコンポーネントを拡張して対応します。
    *   各グループのヘッダー表示と、グループ内のアイテム表示を適切に実装します。既存のアイテム表示コンポーネントは可能な限り再利用します。

## 受け入れ条件 (Acceptance Criteria)

### Phase 1: フラットなグルーピング（完了）
*   [x] ファイルリスト画面で、ファイルがカテゴリーごとにグルーピングされて表示されること。
*   [x] 各カテゴリーグループには、カテゴリー名とそのカテゴリーに属するファイル数が表示されるヘッダーがあること。
*   [x] カテゴリーが設定されていないファイルは、「未分類」セクションに表示されること。
*   [x] 各ファイルアイテムは、既存の `FlatListItem` コンポーネントを使用して正しくレンダリングされること。
*   [x] TypeScriptエラーがゼロであること。

### Phase 2: 階層的グルーピング（オプション、未実装）
*   [ ] グルーピングされたUIが、`docs/sandbox/grouped_file_list_ui.svg` のイメージと完全に一致していること（階層構造を含む）。
*   [ ] カテゴリーの親子関係を表現できること。
*   [ ] サブカテゴリーの展開/折りたたみ機能があること。

### 共通（Phase 1で確認済み）
*   [x] ファイルの選択、削除、コピー、リネーム、検索といった既存の機能が引き続き正常に動作すること。

## 関連ファイル (Related Files)

*   `app/data/core/typesFlat.ts`
*   `app/data/services/metadataService.ts`
*   `app/screen/file-list-flat/FileListScreenFlat.tsx`
*   `app/screen/file-list-flat/components/FlatListItem.tsx`
*   `docs/sandbox/grouped_file_list_ui.svg`

## 制約条件 (Constraints)

*   既存のUIコンポーネント (`FlatListItem` など) は可能な限り再利用すること。
*   ファイル数が多い場合でも、リストのスクロールパフォーマンスが著しく低下しないこと。
*   既存のファイル操作（選択、削除、コピー、リネーム）および検索機能は維持すること。

## 開発ログ (Development Log)

---
### 試行 #1 (2025/10/29)

- **試みたこと:** Phase 1のフラットなカテゴリーグルーピング実装
  - データ層: `FileCategorySection`型追加、`MetadataService.groupFilesByCategory()`実装
  - UI層: `FlatList`→`SectionList`置き換え、セクションヘッダー実装

- **結果:** Phase 1完了。動作確認済み。
  - コミット: `812402b`
  - TypeScriptエラーゼロ
  - 複数カテゴリーを持つファイルは各カテゴリーに重複表示
  - 未分類セクション実装済み

- **メモ:** Phase 2（階層構造）は未実装。

---
### 試行 #2 (2025/10/30)

- **試みたこと:** Phase 2の階層グルーピング + ファイルインデント + 折りたたみ機能の完全実装
  - **Phase 2A**: 階層的カテゴリーグルーピング（無限階層対応）
    - FileListScreenFlat.tsx内に128行の階層構築ロジック実装
    - パス形式カテゴリー（"研究/AI/深層学習"）の自動親生成
    - 再帰的なファイル数計算、階層的ソート
  - **Phase 2B**: ファイルアイテムの階層インデント
    - FlatListItem.tsxにlevel propを追加
    - 動的インデント: `paddingLeft = 16 + ((level + 1) * 24)px`
  - **Phase 2C**: 折りたたみ機能
    - expandedCategories state（Set型）で状態管理
    - chevronアイコン（▼/▶）追加
    - 親折りたたみ時の子要素自動非表示
    - 初回ロード時に全ルート展開

- **結果:** **Phase 2完全実装完了。すべての受け入れ条件達成。**
  - コミット: `484e8d8`
  - TypeScriptエラーゼロ、lintエラー修正済み
  - FileListScreenFlat.tsxが718行に膨張（当初の250行想定から大幅増）
  - すべての機能が正常動作

- **メモ:**
  - 機能は完璧だが、Screen層に責任が集中しすぎている
  - 128行の階層グルーピングロジックがScreen内に存在
  - 保守性・拡張性向上のためリファクタリングが必要
  - 次issue: `20251030_refactor_filelist_screen_responsibility.md`

---

## AIへの申し送り事項 (Handover to AI)

### ✅ このissueは完了しました

**実装された機能:**
- ✅ Phase 1: フラットなカテゴリーグルーピング
- ✅ Phase 2A: 階層的カテゴリーグルーピング（無限階層対応）
- ✅ Phase 2B: ファイルアイテムの階層インデント
- ✅ Phase 2C: カテゴリーの展開/折りたたみ機能

すべての受け入れ条件が達成されています。

### 次のアクション

このissueの機能実装は完了していますが、実装の過程でFileListScreenFlat.tsxが718行に肥大化し、保守性の問題が発生しました。

**次に取り組むべきissue:**
📋 `docs/issues/20251030_refactor_filelist_screen_responsibility.md`

このissueでは、Screen層に集中した責任を適切なレイヤー（Service層、hooks層、Component層）に分散し、保守性と拡張性を向上させるリファクタリングを行います。

**関連コミット:**
- `812402b`: Phase 1実装
- `484e8d8`: Phase 2完全実装
