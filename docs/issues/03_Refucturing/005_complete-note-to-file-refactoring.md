---
filename: 005_complete-note-to-file-refactoring
id: 005
status: open
priority: high
attempt_count: 0
tags: [refactoring, app, naming, identifiers, completion, consistency]
related_issues: [004, 002, 001]
---

## 概要 (Overview)

このアプリケーションは、ユーザーが作成するコンテンツを内部的に「ファイル」として扱う設計になっています。しかし、コードベース内に"note"（ノート）と"file"（ファイル）の用語が混在しており、型定義では`File`型を使用しているにも関わらず、変数名やインターフェース名では`note`が使われている状態です。

**なぜ統一が必要なのか:**

この用語の不統一は、将来的に以下の問題を引き起こします：

1. **開発者の混乱**: 新しい開発者がコードを読む際、「このアプリはノートアプリなのか？ファイル管理アプリなのか？」と混乱し、コード理解に余計な時間がかかる
2. **保守コストの増大**: 「`note`と`file`は同じものを指しているのか？別の概念なのか？」という判断が常に必要になり、機能追加や修正時に認知負荷が増大
3. **バグのリスク**: 用語が統一されていないことで、意図しない動作やバグが混入しやすくなる
4. **LLM連携の精度低下**: AIがコードを理解する際、用語の不一致が理解を妨げ、誤った提案やコード生成につながる可能性がある
5. **技術的負債の蓄積**: 時間が経つほど不統一な用語が広がり、修正コストが指数関数的に増大する

Issue #004で完了とされていたリファクタリングを真に完了させるため、残存する約80-100箇所の"note"識別子を"file"に完全統一します。名前統一により将来的な混乱を避け、コードベース全体で用語の一貫性を達成します。これにより、コードの可読性、保守性、拡張性が大幅に向上します。

## 背景 (Background)

Issue #004は「resolved」とマークされていますが、詳細な分析により以下の事実が判明しました：

1. **ナビゲーションルート名**: `NoteList` が依然として使用されている（4箇所）
2. **設定値リテラル**: `'note-list'`, `'last-note'`, `'new-note'` が残存（4箇所）
3. **変数名・パラメータ名**: `note`, `notes`, `noteId`, `noteIndex` など（50-60箇所）
4. **型プロパティ名**: `EditorState.note` が `File | null` 型なのにプロパティ名が `note`（1箇所）
5. **インターフェース名**: `NoteListProviderProps`, `NoteListSearchBarProps` など（3箇所）
6. **コメント・ドキュメント**: JSDocコメントやファイルヘッダーに旧用語が残存（20-30箇所）

**合計: 約80-100箇所の"note"識別子が残存**

これらの不統一により以下の問題が発生しています：

1. **認知的不一致の継続**: 型は`File`なのに変数名は`note`
2. **コードレビューの混乱**: 新しい開発者が「なぜnoteとfileが混在しているのか」と疑問を持つ
3. **将来的な保守コストの増大**: 用語の不統一が技術的負債として蓄積
4. **LLM連携の精度低下**: AIがコードを理解する際に用語の不一致が理解を妨げる

## 実装方針 (Implementation Strategy)

以下の順序で段階的かつ安全に変更を実施します：

### Phase 1: ナビゲーション関連の統一
**目的**: アプリケーションのルーティング層での用語統一

1. **ナビゲーションルート名の変更**
   - `app/navigation/types.ts`: `NoteList` → `FileList`
   - `app/navigation/RootNavigator.tsx`: 全3箇所の `'NoteList'` を `'FileList'` に変更

2. **影響箇所の修正**
   - `currentRouteName === 'NoteList'` → `currentRouteName === 'FileList'`
   - `initialRouteName="NoteList"` → `initialRouteName="FileList"`
   - `name="NoteList"` → `name="FileList"`

3. **型定義の更新**
   - `NoteListScreenNavigationProp` → `FileListScreenNavigationProp`（`app/screen/file-list/components/OverflowMenu.tsx`）

**検証**: 型チェック成功 + アプリ起動確認

---

### Phase 2: 設定値リテラルの統一とマイグレーション
**目的**: 設定システムでの用語統一と既存ユーザーデータの保護

1. **型定義の変更** (`app/settings/settingsStore.ts`)
   - Line 25: `startupScreen: 'note-list' | 'last-note' | 'new-note'`
   - → `startupScreen: 'file-list' | 'last-file' | 'new-file'`

2. **デフォルト値の変更**
   - Line 91: `startupScreen: 'note-list'` → `startupScreen: 'file-list'`

3. **AsyncStorageマイグレーション実装**
   ```typescript
   // settingsStore.ts の loadSettings() 内に追加
   const migrateStartupScreen = (value: string): 'file-list' | 'last-file' | 'new-file' => {
     const migrations: Record<string, 'file-list' | 'last-file' | 'new-file'> = {
       'note-list': 'file-list',
       'last-note': 'last-file',
       'new-note': 'new-file',
     };
     return migrations[value] || value as any;
   };

   if (loadedSettings.startupScreen) {
     loadedSettings.startupScreen = migrateStartupScreen(loadedSettings.startupScreen);
   }
   ```

**検証**: 型チェック成功 + 既存ユーザー設定の動作確認

---

### Phase 3: EditorState型プロパティの統一
**目的**: エディタの中核的な型定義での用語統一

1. **型定義の変更** (`app/screen/file-edit/types/index.ts`)
   - Line 22: `note: File | null;` → `file: File | null;`

2. **影響ファイルの修正**
   - `app/screen/file-edit/stores/FileEditorStore.ts`
   - `app/screen/file-edit/hooks/useFileEditor.tsx`
   - `app/screen/file-edit/FileEditScreen.tsx`
   - その他 `EditorState.note` を参照する全ファイル

**検証**: 型チェック成功

---

### Phase 4: 変数名・パラメータ名の統一（大規模）
**目的**: すべてのローカル変数・パラメータ名での用語統一

#### 4.1 高頻度変数名の置き換え（優先度順）

1. **`note` → `file`** (単数形変数)
   - `app/screen/file-list/hooks/useSearch.ts` (Line 43-45)
   - `app/screen/file-list/components/TreeListItem.tsx` (Line 85-92)
   - `app/screen/file-list/context/FileListProvider.tsx` (Line 174)
   - `app/screen/file-list/infrastructure/FileRepository.ts` (Line 67-80)
   - その他約20-30箇所

2. **`notes` → `files`** (複数形変数)
   - `app/features/chat/handlers/itemResolver.ts` (Line 72-90)
   - `app/screen/file-list/infrastructure/FileRepository.ts` (複数箇所)
   - その他約10-15箇所

3. **`noteId` → `fileId`**
   - `app/features/chat/handlers/deleteItemHandler.ts` (Line 49, 54)
   - `app/features/chat/handlers/moveItemHandler.ts` (Line 71, 80)
   - その他約5-10箇所

4. **`noteIndex` → `fileIndex`**
   - `app/screen/file-list/infrastructure/FileRepository.ts` (Line 69, 71, 80)

5. **`noteMap` → `fileMap`**
   - `app/screen/file-list/infrastructure/FileRepository.ts` (Line 110, 114)

6. **`updatedNote` → `updatedFile`**
   - `app/screen/file-list/infrastructure/FileRepository.ts` (Line 76, 80, 114)
   - `app/screen/file-list/application/FileListUseCases.ts` (Line 135)

**主要な修正対象ファイル**:
- `app/screen/file-list/infrastructure/FileRepository.ts` (最多: 約15箇所)
- `app/screen/file-list/application/FileListUseCases.ts` (約5箇所)
- `app/features/chat/handlers/itemResolver.ts` (約10箇所)
- `app/features/chat/handlers/deleteItemHandler.ts` (約3箇所)
- `app/features/chat/handlers/moveItemHandler.ts` (約3箇所)
- `app/screen/file-list/hooks/useSearch.ts` (約3箇所)
- `app/screen/file-list/components/TreeListItem.tsx` (約5箇所)
- `app/screen/file-edit/FileEditScreen.tsx` (約3箇所)

**検証**: 各ファイル修正後に型チェック実行

---

### Phase 5: インターフェース名・型エイリアスの統一
**目的**: 型定義レベルでの完全な用語統一

1. **インターフェース名の変更**
   - `NoteListProviderProps` → `FileListProviderProps` (`app/screen/file-list/context/FileListProvider.tsx`)
   - `NoteListSearchBarProps` → `FileListSearchBarProps` (`app/screen/file-list/components/FileListSearchBar.tsx`)
   - `NoteListScreenNavigationProp` → `FileListScreenNavigationProp` (`app/screen/file-list/components/OverflowMenu.tsx`)

2. **型エイリアスの変更**
   - `NoteDuplicateCheckResult` → `FileDuplicateCheckResult` (`app/screen/file-list/domain/index.ts`)

**検証**: 型チェック成功

---

### Phase 6: テスト関連コードの統一
**目的**: テストコードでの用語統一

1. **ID生成文字列の変更**
   - `app/screen/file-list/__tests__/testUtils.ts`
   - Line 11: `id: 'note-${Date.now()}'` → `id: 'file-${Date.now()}'`

2. **テスト関数名・変数名の変更**
   - Line 39: コメント内の "note" → "file"
   - Line 64-66: パラメータ名 `note` → `file`
   - Line 102-104: `noteServiceTestSuite` → `fileServiceTestSuite`

**検証**: テスト実行（もしあれば）

---

### Phase 7: ログカテゴリの統一
**目的**: ログシステムでの用語統一

1. **ログカテゴリ型の変更**
   - `app/utils/logger.ts`
   - Line 4: `'note'` → `'file'`

**検証**: 型チェック成功

---

### Phase 8: コメント・JSDocの統一
**目的**: ドキュメントレベルでの完全な用語統一

#### 8.1 ファイルヘッダーコメントの修正

1. **@file タグの修正**
   - `app/screen/file-list/application/FileListUseCases.ts:2`
     - `@file NoteListUseCases.ts` → `@file FileListUseCases.ts`
   - `app/screen/file-list/context/fileListReducer.ts:2`
     - `@file noteListReducer.ts` → `@file fileListReducer.ts`
   - `app/screen/file-list/context/FileListContext.tsx:2`
     - `@file NoteListContext.tsx` → `@file FileListContext.tsx`
   - `app/screen/file-list/context/FileListProvider.tsx:2`
     - `@file NoteListProvider.tsx` → `@file FileListProvider.tsx`
   - `app/screen/file-list/infrastructure/FileRepository.ts:2`
     - `@file NoteRepository.ts` → `@file FileRepository.ts`
   - `app/screen/file-list/utils/typeGuards.ts:1`
     - `// app/screen/note-list/utils/typeGuards.ts` → `// app/screen/file-list/utils/typeGuards.ts`
   - `app/screen/file-list/hooks/useSearch.ts:1`
     - `// app/screen/note-list/hooks/useSearch.ts` → `// app/screen/file-list/hooks/useSearch.ts`
   - `app/screen/file-list/__tests__/testUtils.ts:1`
     - `// app/screen/note-list/__tests__/testUtils.ts` → `// app/screen/file-list/__tests__/testUtils.ts`

2. **@summary タグの修正**
   - `app/screen/file-list/context/fileListReducer.ts:3`
     - `NoteList画面の状態管理Reducer` → `FileList画面の状態管理Reducer`
   - `app/screen/file-list/context/FileListContext.tsx:3,77`
     - `NoteList画面の状態管理Context` → `FileList画面の状態管理Context`
     - `NoteListContext` → `FileListContext`
   - `app/screen/file-list/context/useFileListContext.ts:3,10`
     - `NoteListContextを使用するためのカスタムフック` → `FileListContextを使用するためのカスタムフック`
     - `NoteListContextを使用するカスタムフック` → `FileListContextを使用するカスタムフック`
   - `app/screen/file-list/context/types.ts:3,29,64`
     - `NoteListContext用の型定義` → `FileListContext用の型定義`
     - `NoteList画面の全体状態` → `FileList画面の全体状態`
     - `NoteListアクション型` → `FileListアクション型`
   - `app/screen/file-list/context/FileListProvider.tsx:3,22`
     - `NoteList画面の状態管理Provider` → `FileList画面の状態管理Provider`
     - `NoteListProvider` → `FileListProvider`
   - `app/features/chat/hooks/useFileListChatContext.ts:3`
     - `NoteListScreen用のチャットコンテキストプロバイダーフック` → `FileListScreen用のチャットコンテキストプロバイダーフック`
   - `app/screen/file-edit/types/index.ts:3`
     - `ノート編集機能の統一された型定義` → `ファイル編集機能の統一された型定義`

#### 8.2 JSDocコメントの修正

1. **パラメータ説明の修正**
   - `app/screen/file-list/application/FileListUseCases.ts:23`
     - `@param noteIds 削除するノートIDの配列` → `@param fileIds 削除するファイルIDの配列`
   - `app/screen/file-list/application/FileListUseCases.ts:298`
     - `@param inputPath パス文字列（例: "folder1/folder2/note title"）` → `@param inputPath パス文字列（例: "folder1/folder2/file title"）`
   - `app/screen/file-list/infrastructure/FileRepository.ts:64,87,95,138`
     - `@param note 更新するノート` → `@param file 更新するファイル`
     - `@param noteId ノートID` → `@param fileId ファイルID`
     - `@param noteIds ノートIDの配列` → `@param fileIds ファイルIDの配列`

2. **関数説明コメントの修正**
   - `app/features/chat/handlers/createDirectoryHandler.ts:16,19`
     - `NoteListStorageを使用してフォルダを作成します` → `FileListStorageを使用してフォルダを作成します`
     - `@param context noteListStorageを含むコンテキスト` → `@param context fileListStorageを含むコンテキスト`
   - `app/features/chat/handlers/deleteItemHandler.ts:43,48,49,50,54`
     - `NoteListStorageを取得` → `FileListStorageを取得`
     - `'Deleting note'` → `'Deleting file'`
     - `noteId: resolvedItem.id` → `fileId: resolvedItem.id`
     - `noteTitle: (resolvedItem.item as any).title` → `fileTitle: (resolvedItem.item as any).title`
   - `app/features/chat/handlers/moveItemHandler.ts:65,70,71,72,80`
     - `NoteListStorageを取得` → `FileListStorageを取得`
     - `'Moving note'` → `'Moving file'`
     - `noteId` → `fileId`
     - `noteTitle` → `fileTitle`
   - `app/features/chat/handlers/itemResolver.ts:25,82,84,85`
     - `検索対象のフルパス（例: "/folder1/note.txt" または "/folder1/subfolder/"）` → `検索対象のフルパス（例: "/folder1/file.txt" または "/folder1/subfolder/"）`
     - `'Found note by path'` → `'Found file by path'`
     - `noteId` → `fileId`
     - `noteTitle` → `fileTitle`

3. **その他コメントの修正**
   - `app/screen/file-list/__tests__/testUtils.ts:39,102`
     - `Content for note ${i + 1}` → `Content for file ${i + 1}`
     - `NoteServiceのテスト例` → `FileServiceのテスト例`
   - `app/utils/debugUtils.ts:77`
     - `Missing note` → `Missing file`
   - `app/screen/diff-view/hooks/useDiffView.tsx:58`
     - `'Failed to restore note version:'` → `'Failed to restore file version:'`

#### 8.3 例示用パス・文字列（低優先度）

これらは例示目的なので、必須ではありませんが統一すると一貫性が向上します：
- `app/services/PathService.ts:44`
  - `"aaa/bbb/note.txt"` → `"aaa/bbb/file.txt"`

**検証**: コメントの正確性を目視確認

---

### Phase 9: UI文字列の確認（保持推奨）

以下のUI向け文字列は**意図的に保持**します（ユーザー向け表示）：

1. **日本語UI表示**
   - 「無題のノート」（`app/screen/file-list/components/TreeListItem.tsx:86`）
   - その他ユーザーに表示される日本語文言

2. **英語UIメッセージ**
   - `"create a new note or folder"` (`app/screen/file-list/FileListScreen.tsx:322`)
   - `options={{ title: 'Notes' }}` (`app/navigation/RootNavigator.tsx:54`)
   - `options={{ title: 'Edit Note' }}` (`app/navigation/RootNavigator.tsx:55`)

**理由**: これらはユーザーインターフェースの一部であり、ユーザーに「ノート」として表示することが適切です。内部的には"file"を使用しますが、UI表示は「ノート」のままとします。

---

## 受け入れ条件 (Acceptance Criteria)

### 必須条件
- [ ] Phase 1: ナビゲーションルート名が `FileList` に統一されていること
- [ ] Phase 2: 設定値リテラルが `'file-list'`, `'last-file'`, `'new-file'` に統一され、マイグレーションロジックが実装されていること
- [ ] Phase 3: `EditorState` の `note` プロパティが `file` に変更されていること
- [ ] Phase 4: 全ての変数名・パラメータ名で `note` → `file` の置き換えが完了していること
- [ ] Phase 5: 全てのインターフェース名・型エイリアスで `Note` → `File` の置き換えが完了していること
- [ ] Phase 6: テストコードで用語が統一されていること
- [ ] Phase 7: ログカテゴリが `'file'` に統一されていること
- [ ] Phase 8: JSDocコメント・ファイルヘッダーが統一されていること
- [ ] アプリケーションがビルドエラーなく、正常に動作すること（型チェック完了）
- [ ] 既存ユーザーの設定が正しくマイグレーションされること

### 検証条件
- [ ] `npm run type-check` が成功すること
- [ ] アプリが起動し、ナビゲーションが正常に機能すること
- [ ] 既存の単体テストおよびE2Eテストが全てパスすること（もしあれば）
- [ ] 実機でファイル作成、編集、削除、移動が正常に動作すること
- [ ] 設定画面で `startupScreen` の変更が正常に機能すること

### 完了基準
- [ ] `app` フォルダ内で識別子レベルの "note" パターンが **0件** であること（UI文字列を除く）
- [ ] コードベース全体で用語の一貫性が達成されていること
- [ ] ドキュメント（JSDoc、コメント）も統一されていること

---

## 関連ファイル (Related Files)

### Phase 1: ナビゲーション（3ファイル）
- `app/navigation/types.ts`
- `app/navigation/RootNavigator.tsx`
- `app/screen/file-list/components/OverflowMenu.tsx`

### Phase 2: 設定（1ファイル）
- `app/settings/settingsStore.ts`

### Phase 3: エディタ型定義（4ファイル）
- `app/screen/file-edit/types/index.ts`
- `app/screen/file-edit/stores/FileEditorStore.ts`
- `app/screen/file-edit/hooks/useFileEditor.tsx`
- `app/screen/file-edit/FileEditScreen.tsx`

### Phase 4: 変数名（主要15ファイル）
- `app/screen/file-list/infrastructure/FileRepository.ts`
- `app/screen/file-list/application/FileListUseCases.ts`
- `app/features/chat/handlers/itemResolver.ts`
- `app/features/chat/handlers/deleteItemHandler.ts`
- `app/features/chat/handlers/moveItemHandler.ts`
- `app/screen/file-list/hooks/useSearch.ts`
- `app/screen/file-list/components/TreeListItem.tsx`
- `app/screen/file-list/context/FileListProvider.tsx`
- `app/screen/file-list/domain/FolderDomainService.ts`
- `app/screen/file-edit/repositories/fileStorage.ts`
- `app/screen/file-edit/repositories/AsyncStorageFileRepository.ts`
- `app/screen/diff-view/hooks/useDiffView.tsx`
- `app/utils/debugUtils.ts`
- `app/services/PathService.ts`
- その他

### Phase 5: インターフェース名（3ファイル）
- `app/screen/file-list/context/FileListProvider.tsx`
- `app/screen/file-list/components/FileListSearchBar.tsx`
- `app/screen/file-list/domain/index.ts`

### Phase 6: テスト（1ファイル）
- `app/screen/file-list/__tests__/testUtils.ts`

### Phase 7: ログ（1ファイル）
- `app/utils/logger.ts`

### Phase 8: コメント（20-30ファイル）
- 上記全ファイル + その他コメントを含むファイル

**合計: 約30-40ファイルの修正が必要**

---

## 制約条件 (Constraints)

1. **段階的実施**: 各Phaseを完了後、必ず型チェックと動作確認を実行
2. **コミット戦略**: 各Phase完了後に個別にコミット（ロールバック可能性の確保）
3. **UI文字列の保持**: ユーザーに表示される「ノート」という文言は変更しない
4. **AsyncStorageキーの保持**: ストレージキー名は互換性のため変更しない
5. **マイグレーション必須**: 設定値の変更に伴い、既存ユーザーデータの自動マイグレーションを実装

---

## 技術的課題 (Technical Challenges)

### 1. ナビゲーションルート名の変更
- **課題**: `'NoteList'` → `'FileList'` の変更は、ナビゲーション関連の全コードに影響
- **対応**: TypeScriptの型定義を先に変更し、コンパイラエラーを追跡して修正箇所を特定

### 2. 設定値のマイグレーション
- **課題**: 既存ユーザーが `startupScreen: 'note-list'` などの旧値を保持している
- **対応**: `loadSettings()` 関数内でマイグレーションロジックを実装し、旧値を新値に自動変換

### 3. EditorState.note の影響範囲
- **課題**: `EditorState.note` は多くのファイルで参照されている
- **対応**: `note` → `file` の一括置換後、型チェックでエラーを確認しながら修正

### 4. 変数名の一括置換リスク
- **課題**: `note` という単語は一般的で、誤って関係ない箇所を置換するリスク
- **対応**: 正規表現で境界を指定（`\bnote\b`）し、手動レビューで確認

### 5. コメント内の用語統一
- **課題**: コメント内の用語は機能に影響しないが、一貫性のため統一が望ましい
- **対応**: 低優先度として最後に実施

---

## 推奨アプローチ (Recommended Approach)

### ステップ1: Phase 1-3 を実施（高影響箇所）
1. ナビゲーション関連の変更（Phase 1）
2. 設定値とマイグレーション（Phase 2）
3. EditorState型プロパティ（Phase 3）
4. 型チェック + 動作確認
5. **コミット**

### ステップ2: Phase 4-7 を実施（変数名・型名）
1. 変数名・パラメータ名の一括変更（Phase 4）
2. インターフェース名・型エイリアスの変更（Phase 5）
3. テスト関連コードの変更（Phase 6）
4. ログカテゴリの変更（Phase 7）
5. 型チェック + 動作確認
6. **コミット**

### ステップ3: Phase 8-9 を実施（ドキュメント）
1. コメント・JSDocの統一（Phase 8）
2. UI文字列の確認（Phase 9）
3. 最終型チェック + 動作確認
4. **最終コミット**

### ステップ4: 最終検証
1. 実機での動作確認
2. 既存ユーザー設定のマイグレーション確認
3. Issue #005 をクローズ

---

## 開発ログ (Development Log)

### 試行 #0 (2025-10-22)

- **試みたこと**: Issue #004の完了状況を詳細分析し、残存する"note"識別子を全て洗い出し
- **結果**: 約80-100箇所の"note"識別子が残存していることを確認
- **メモ**: このIssueドキュメント（#005）を作成し、Option A（完全統一）のための詳細な実装計画を策定

---

## AIへの申し送り事項 (Handover to AI)

- **このIssueの状態**: 🆕 **新規作成（open）**
- **前提条件**: Issue #004 が「resolved」とマークされているが、実際には約80-100箇所の"note"識別子が残存
- **目的**: 用語の完全統一により、コードベース全体の一貫性を達成
- **重要**: 各Phase完了後に必ず型チェックと動作確認を実施すること
- **マイグレーション**: 設定値変更に伴う既存ユーザーデータの保護が必須
- **UI文字列**: ユーザーに表示される「ノート」という文言は変更しないこと

---

## 推定作業時間

- Phase 1-3: 2-3時間
- Phase 4-7: 3-4時間
- Phase 8-9: 1-2時間
- 検証・テスト: 1-2時間

**合計: 7-11時間**
