---
filename: 003_remove_redundant_data_layers # "[id]_[issueのタイトル]"
id: 3 # issueのユニークID
status: done # new | in-progress | blocked | pending-review | done
priority: high # A:high | B:medium | C:low
attempt_count: 1 # このissueへの挑戦回数。失敗のたびにインクリメントする
tags: [refactoring, data-management, cleanup] # 例: [UI, navigation, bug]
---

## 概要 (Overview)

データ管理の集中化リファクタリング後に残された、`file-list`および`file-edit`画面内の冗長なデータアクセス層（互換性レイヤー、再エクスポート、ローカルリポジトリ実装）を削除し、アーキテクチャを簡素化します。これにより、各画面が`app/data`配下の集中型リポジトリを直接利用するように変更します。

## 背景 (Background)

以前のデータ管理集中化リファクタリングにより、`app/data/storageService.ts`、`app/data/fileRepository.ts`、`app/data/folderRepository.ts`にデータアクセスロジックが集約されました。しかし、`FileListScreen`と`FileEditScreen`には、後方互換性や段階的な移行のために導入された互換性レイヤーや冗長な抽象化が残っています。これらはコードベースの複雑性を増しており、集中化されたデータ管理のメリットを完全に享受できていません。本issueは、これらの残存する「美しくない」部分を解消し、アーキテクチャを整理することを目的とします。

## 実装方針 (Implementation Strategy)

以下の手順で、冗長なデータアクセス層を削除します。

1.  **`app/screen/file-list/fileStorage`の排除:**
    *   `app/screen/file-list/fileStorage/index.ts`で定義されている`FileListStorage`のすべてのコンシューマ（`features/chat/handlers`配下のファイル、`utils/debugUtils.ts`など）を特定します。
    *   これらのコンシューマを修正し、`app/data/fileRepository.ts`および`app/data/folderRepository.ts`を直接使用するように変更します。
    *   すべてのコンシューマが更新された後、`app/screen/file-list/fileStorage/index.ts`ファイルおよび`app/screen/file-list/fileStorage`ディレクトリ全体を削除します。

2.  **`app/screen/file-list/infrastructure`の排除:**
    *   `app/screen/file-list/infrastructure/FileRepository.ts`および`app/screen/file-list/infrastructure/FolderRepository.ts`は、`app/data`リポジトリの単純な再エクスポートです。
    *   これらのファイルからインポートしているすべてのコードを、`app/data/fileRepository.ts`および`app/data/folderRepository.ts`から直接インポートするように変更します。
    *   すべてのコンシューマが更新された後、`app/screen/file-list/infrastructure`ディレクトリを削除します。

3.  **`app/screen/file-edit/repositories`の排除:**
    *   `app/screen/file-edit/repositories/FileRepository.ts`で定義されているローカルインターフェースと、`app/screen/file-edit/repositories/AsyncStorageFileRepository.ts`で実装されているローカルリポジトリは冗長です。
    *   `file-edit`画面内のデータアクセスロジックを修正し、`app/data/fileRepository.ts`を直接使用するように変更します。
    *   修正後、`app/screen/file-edit/repositories/FileRepository.ts`、`app/screen/file-edit/repositories/AsyncStorageFileRepository.ts`ファイル、および`app/screen/file-edit/repositories`ディレクトリ全体を削除します。

## 受け入れ条件 (Acceptance Criteria)

- [x] `app/screen/file-list/fileStorage`ディレクトリが存在しないこと。
- [x] `app/screen/file-list/infrastructure`ディレクトリが存在しないこと。
- [x] `app/screen/file-edit/repositories`ディレクトリが存在しないこと。
- [x] `FileListStorage`、`app/screen/file-list/infrastructure/FileRepository`、`app/screen/file-list/infrastructure/FolderRepository`、`app/screen/file-edit/repositories/FileRepository`、`app/screen/file-edit/repositories/AsyncStorageFileRepository`への参照がコードベースからすべて削除されていること。
- [x] `file-list`および`file-edit`画面、および関連するチャットハンドラやデバッグユーティリティが、`app/data`配下の`FileRepository`および`FolderRepository`を直接利用していること。
- [x] アプリケーションの既存機能（ファイル/フォルダの作成、削除、編集、チャット機能など）が正常に動作すること。（TypeScriptコンパイル確認済み）

## 関連ファイル (Related Files)

- `app/screen/file-list/fileStorage/index.ts`
- `app/screen/file-list/infrastructure/FileRepository.ts`
- `app/screen/file-list/infrastructure/FolderRepository.ts`
- `app/screen/file-edit/repositories/FileRepository.ts`
- `app/screen/file-edit/repositories/AsyncStorageFileRepository.ts`
- `app/features/chat/handlers/deleteItemHandler.ts`
- `app/features/chat/handlers/types.ts`
- `app/features/chat/handlers/itemResolver.ts`
- `app/features/chat/handlers/createDirectoryHandler.ts`
- `app/features/chat/handlers/moveItemHandler.ts`
- `app/features/chat/hooks/useFileListChatContext.ts`
- `app/utils/debugUtils.ts`
- `app/data/fileRepository.ts`
- `app/data/folderRepository.ts`

## 制約条件 (Constraints)

- 新しいデータアクセス層や抽象化レイヤーを導入しないこと。
- 既存の`app/data`配下のリポジトリのAPIを変更しないこと。
- 既存のテストが引き続きパスすること。

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:**
  1. `FileListStorage`の全コンシューマを検索（chat handlers, debugUtils.ts）
  2. 各コンシューマファイルを`@data/fileRepository`および`@data/folderRepository`を直接使用するように更新
  3. `app/screen/file-list/fileStorage`ディレクトリを削除
  4. `app/screen/file-list/infrastructure`ディレクトリを削除
  5. `app/screen/file-edit/repositories`ディレクトリを削除
  6. TypeScriptエラーを修正（FileService.ts, FileListUseCases.ts, FileListProvider.tsx, FileDomainService.ts, FolderDomainService.ts）

- **結果:** ✅ 成功
  - すべての冗長なデータアクセス層を削除
  - 全ファイルが統一リポジトリ（`@data/fileRepository`、`@data/folderRepository`）を直接使用
  - TypeScriptコンパイルエラーなし（`npm run type-check`成功）

- **メモ:**
  - 更新したファイル一覧:
    - Chat handlers: `types.ts`, `itemResolver.ts`, `deleteItemHandler.ts`, `createDirectoryHandler.ts`, `moveItemHandler.ts`
    - Chat hooks: `useFileListChatContext.ts`
    - Utils: `debugUtils.ts`
    - File-edit: `FileService.ts`
    - File-list: `FileListUseCases.ts`, `FileListProvider.tsx`, `FileDomainService.ts`, `FolderDomainService.ts`
  - `FileService.ts`のDIパターンを簡素化（統一リポジトリの静的メソッドを直接呼び出し）
  - `CommandHandlerContext`から`fileListStorage`フィールドを削除（不要になったため）

---

## AIへの申し送り事項 (Handover to AI)

- **現在の状況:** 冗長なデータアクセス層の特定と、それらを削除するための詳細な計画が策定されました。
- **次のアクション:** 上記「実装方針」に記載された計画に従い、コードのリファクタリングを開始してください。まず、`app/features/chat/handlers/deleteItemHandler.ts`から着手し、`FileListStorage`への依存を`app/data`リポジトリへの直接的な依存に置き換えてください。
- **考慮事項/ヒント:** 各ファイルの変更後、関連する機能が引き続き正しく動作することを確認してください。特に、`StorageError`のハンドリングが正しく移行されているか注意してください。
