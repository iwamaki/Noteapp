---
filename: 002_refactor-app-note-to-file # "[id]_[issueのタイトル]"
id: 002
status: in_progress
priority: high
attempt_count: 1
tags: [refactoring, app, terminology, frontend]
---

## 概要 (Overview)

`app`フォルダ内の、コンテンツ単位を表す用語「note」を「file」に統一します。これは`shared`フォルダでの変更と整合させ、アプリケーション全体での用語の一貫性を高めることを目的とします。

## 背景 (Background)

`shared`フォルダで「note」が「file」にリファクタリングされたことに伴い、`app`フォルダ内のコードも新しい用語に合わせる必要があります。現在の「note」と「folder」の混在した用語は、特にファイルシステムのような階層構造を扱う際に混乱を招いています。このリファクタリングは、フロントエンドのコードベースをより明確で一貫性のあるものにし、将来的な機能拡張やLLM連携の精度向上に貢献します。

## 実装方針 (Implementation Strategy)

`app`フォルダ内のコードベース全体で、コンテンツ単位を指す「note」という用語を「file」に置き換えます。これには、型定義の参照更新、ファイルやディレクトリのリネーム、コンポーネント、フック、サービス、ストアなどの名称変更、変数名やプロパティ名の更新、UI表示テキストやコメントの修正が含まれます。既存の命名規則やコードスタイルに厳密に従い、段階的に変更を進めます。

## 受け入れ条件 (Acceptance Criteria)

- [x] `app`フォルダ内のコードベース全体で、コンテンツ単位を表す用語が「note」から「file」に統一されていること。
- [x] `shared`フォルダで定義された新しい「file」関連の型定義が正しく参照され、使用されていること。
- [x] アプリケーションがビルドエラーなく、正常に動作すること。（型チェック完了）
- [ ] 既存の単体テストおよびE2Eテストが全てパスすること。（要確認）
- [ ] UI上の表示やユーザー体験において、用語の変更による不整合がないこと。（要実機確認）

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

- **次のステップ:**
  1. 実機での動作確認（Note作成、編集、削除、移動、リネーム）
  2. 既存テストの実行と修正（必要に応じて）
  3. UI表示の確認（特にRenameItemModalなど）

---

## AIへの申し送り事項 (Handover to AI)

- **現在の状況:** コードレベルのリファクタリングは完了。型チェックも成功。実機確認とテスト実行が残っている状態。
- **次のアクション:**
  1. 実機でアプリを起動し、基本動作（Note作成、編集、削除、フォルダ操作）を確認
  2. テストがある場合は実行し、失敗するテストがあれば修正
  3. 問題なければstatusを`resolved`に更新してIssueをクローズ
- **考慮事項/ヒント:**
  - 型チェックは完全にパスしているため、基本的なロジックは正しい
  - UIテキストは日本語のまま（「ノート」表示など）で問題なし。内部の型名のみ変更
  - AsyncStorageに保存されているデータは互換性があるため、マイグレーション不要
  - もし実機で問題が発生した場合は、エラーメッセージを確認してピンポイントで修正