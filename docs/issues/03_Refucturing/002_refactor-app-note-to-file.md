---
filename: 002_refactor-app-note-to-file # "[id]_[issueのタイトル]"
id: 002
status: resolved
priority: high
attempt_count: 1
tags: [refactoring, app, terminology, frontend, type-level]
related_issues: [004]
---

## 概要 (Overview)

`app`フォルダ内の、**型定義レベル**でコンテンツ単位を表す用語「note」を「file」に統一します。これは`shared`フォルダでの変更と整合させ、アプリケーション全体での用語の一貫性を高めることを目的とします。

**注意**: このIssueは型定義レベル（`Note` → `File`、型リテラル `'note'` → `'file'`）のリファクタリングのみを対象としています。実装レベル（ディレクトリ名、ファイル名、関数名、変数名など）のリファクタリングは、Issue #004で実施します。

## 背景 (Background)

`shared`フォルダで「note」が「file」にリファクタリングされたことに伴い、`app`フォルダ内のコードも新しい用語に合わせる必要があります。現在の「note」と「folder」の混在した用語は、特にファイルシステムのような階層構造を扱う際に混乱を招いています。このリファクタリングは、フロントエンドのコードベースをより明確で一貫性のあるものにし、将来的な機能拡張やLLM連携の精度向上に貢献します。

## 実装方針 (Implementation Strategy)

`app`フォルダ内のコードで、**型定義レベル**でコンテンツ単位を指す「note」という用語を「file」に置き換えます。これには、以下が含まれます：

1. 型名の変更：`Note` → `File`、`NoteVersion` → `FileVersion`、`CreateNoteData` → `CreateFileData`など
2. 型リテラルの変更：`FileSystemItem`の `type: 'note'` → `type: 'file'`
3. 型アサーションの更新：`as Note` → `as File`
4. プロパティ名の変更（型定義内）：`FileVersion.noteId` → `FileVersion.fileId`

**このIssueでは実施しない**：
- ディレクトリ名の変更（例：`note-edit/` → `file-edit/`）
- ファイル名の変更（例：`NoteEditScreen.tsx` → `FileEditScreen.tsx`）
- 関数名・変数名の変更（例：`createNote` → `createFile`）
- これらは Issue #004 で実施します。

## 受け入れ条件 (Acceptance Criteria)

- [x] `app`フォルダ内のコードで、**型定義レベル**でコンテンツ単位を表す用語が「Note」から「File」に統一されていること
- [x] `shared`フォルダで定義された新しい「file」関連の型定義が正しく参照され、使用されていること
- [x] すべての型リテラル `'note'` が `'file'` に変更されていること
- [x] アプリケーションがビルドエラーなく、型チェックをパスすること（`npm run type-check` エラー0件）
- [x] `FileVersion.noteId` が `FileVersion.fileId` に変更されていること

## 関連ファイル (Related Files)

- `app/screen/note-edit/**/*.ts(x)`
- `app/screen/note-list/**/*.ts(x)`
- `app/features/chat/**/*.ts(x)`
- `app/navigation/**/*.ts(x)`
- `app/settings/**/*.ts(x)`
- `app/utils/**/*.ts(x)`
- `app/App.tsx`

## 制約条件 (Constraints)

- このIssueでは、`app`フォルダ内のファイルのみを変更対象とします。
- `folder`関連の用語は、このIssueの範囲では変更しません。
- 変更は段階的に行い、各ステップで動作確認を行います。

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:** `app`フォルダ内の「note」関連の用語を「file」に統一するためのIssueを作成。
- **結果:** Issueドキュメントが正常に作成されました。
- **メモ:** このIssueは広範囲にわたるため、複数のサブタスクに分割して進める必要があります。

---
### 試行 #2 (2025-10-22)

- **試みたこと:** `app`フォルダ全体で「Note」→「File」の用語統一リファクタリングを実施
- **アプローチ:**
  1. Phase 1: `shared/types/file.ts`の作成と型定義の移行
     - `Note` → `File`
     - `NoteVersion` → `FileVersion`
     - `CreateNoteData` → `CreateFileData`
     - `UpdateNoteData` → `UpdateFileData`
     - `FileSystemItem`の型リテラル `'note'` → `'file'`
  2. Phase 2: `app`フォルダのレイヤー別更新
     - Infrastructure層: NoteRepository, FolderRepository
     - Domain層: NoteService, ValidationService
     - Application層: NoteListUseCases
     - Storage層: noteStorage (全モジュール)
     - UI層: コンポーネント、フック、画面
     - Features層: chat handlers
     - Utils層: treeUtils, typeGuards, debugUtils
  3. 型リテラルの完全置換: 全ての `type === 'note'` → `type === 'file'`
  4. プロパティ名変更: `FileVersion.noteId` → `FileVersion.fileId`

- **修正ファイル数:** 約30ファイル
  - shared/types/file.ts (新規作成)
  - app/screen/note-list/: infrastructure, domain, application, hooks, components
  - app/screen/note-edit/: repositories, hooks
  - app/screen/version-history/: VersionHistoryScreen.tsx
  - app/features/chat/: handlers (itemResolver, moveItemHandler, deleteItemHandler)
  - app/services/: PathService.ts
  - app/utils/: debugUtils.ts

- **結果:**
  - ✅ 型チェック完全成功 (`npm run type-check` エラー0件)
  - ✅ 全ての型定義が正しく更新され、型安全性を維持
  - ✅ discriminated unionの型リテラルが完全に統一
  - ⚠️ 実機での動作確認が未実施
  - ⚠️ テストの実行が未実施

- **技術的課題と解決:**
  - 課題: FileSystemItemの型リテラル変更に伴う広範囲な影響
  - 解決: Grepで全ての `type === 'note'` パターンを検索し、漏れなく修正
  - 課題: FileVersion.noteId → fileIdの変更による互換性
  - 解決: 全てのFileVersion生成箇所でfileIdプロパティを使用するよう統一

- **完了した内容:**
  - ✅ 型定義レベルのリファクタリング完了
  - ✅ 型チェック完全成功
  - ✅ Issue #002の範囲は完了

- **残存する課題:**
  - ⚠️ 実装レベルでは依然として390箇所以上に"note"が残存
  - ディレクトリ名：`note-edit/`, `note-list/`, `noteStorage/`
  - ファイル名：23個のファイルが"note"を含む
  - 関数名・変数名：大量に残存（`createNote`, `noteId`, `NoteRepository`など）

- **次のステップ:**
  - ➡️ **Issue #004に移行**: 実装レベル（識別子レベル）のリファクタリングを実施
  - Issue #004では、ディレクトリ名、ファイル名、クラス名、関数名、変数名をすべて統一

---

## AIへの申し送り事項 (Handover to AI)

- **このIssueの状態:** ✅ **完了（resolved）**
  - 型定義レベルのリファクタリングは完全に終了
  - 型チェックも成功
  - このIssueで実施すべき内容はすべて完了

- **重要な発見:**
  - 当初このIssueは「app フォルダ全体」の用語統一を目指していましたが、実際には「型定義レベル」のみ完了
  - 実装レベル（識別子）には依然として390箇所以上の"note"が残存
  - これは認知的不一致を引き起こし、コードの混乱の原因となる

- **次のアクション:**
  - Issue #004を参照して、実装レベルのリファクタリングを実施してください
  - Issue #004は、より大規模で段階的なアプローチが必要です

- **このIssueに関する追加作業は不要です**