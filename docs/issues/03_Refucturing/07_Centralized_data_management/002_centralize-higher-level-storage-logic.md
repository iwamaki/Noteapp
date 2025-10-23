---
filename: 006_centralize-higher-level-storage-logic
id: 006
status: new
priority: high
attempt_count: 0
tags: [data-management, refactoring, storage, repository]
---

## 概要 (Overview)

ファイルおよびフォルダ管理の高レベルロジックを、`app/data`フォルダ内の専用リポジトリ（`fileRepository.ts`および`folderRepository.ts`）に一元化します。これにより、UI層からデータ操作のビジネスロジックを完全に分離し、各画面の責務を「表示」に特化させます。

## 背景 (Background)

前回の作業で、`AsyncStorage`への生データアクセス操作は`app/data/storageService.ts`に一元化されました。しかし、`app/screen/file-edit/repositories/fileStorage.ts`、`app/screen/file-list/fileStorage/folder.ts`、`app/screen/file-list/fileStorage/file.ts`といった画面固有のストレージファイルには、ファイルやフォルダのCRUD操作、バージョン管理、パスによるフィルタリング、コピー、移動、削除といった高レベルのビジネスロジックが依然として残っています。これらのロジックは重複している箇所もあり、UI層に近い場所に存在するため、責務の分離が不十分です。この高レベルロジックを`app/data`内のリポジトリ層に移動することで、データ管理のさらなる一貫性、保守性、テスト容易性を実現し、UI層をよりクリーンに保ちます。

## 実装方針 (Implementation Strategy)

1.  **`app/data/fileRepository.ts`の作成**: 
    *   `app/screen/file-edit/repositories/fileStorage.ts`および`app/screen/file-list/fileStorage/file.ts`から、ファイルおよびファイルバージョンに関連するすべての高レベルビジネスロジック（`getFileById`, `createFile`, `updateFile`, `getFileVersions`, `getFileVersion`, `restoreFileVersion`, `getAllFiles`, `getFilesByPath`, `deleteFiles`, `copyFiles`, `moveFile`など）をこの新しいファイルに移動します。
    *   `uuidv4`、`PathService`をインポートし、`app/data/storageService.ts`からの生関数を使用します。
    *   `StorageError`をエクスポートします。

2.  **`app/data/folderRepository.ts`の作成**: 
    *   `app/screen/file-list/fileStorage/folder.ts`から、フォルダに関連するすべての高レベルビジネスロジック（`getAllFolders`, `getFoldersByPath`, `createFolder`, `updateFolder`, `deleteFolder`など）をこの新しいファイルに移動します。
    *   `uuidv4`、`PathService`をインポートし、`app/data/storageService.ts`からの生関数を使用します。
    *   `deleteFolder`内でファイル操作が必要な場合は、`fileRepository`をインポートして利用します。

3.  **既存の画面固有ストレージファイルの削除**:
    *   `app/screen/file-edit/repositories/fileStorage.ts`
    *   `app/screen/file-list/fileStorage/folder.ts`
    *   `app/screen/file-list/fileStorage/file.ts`
    *   `app/screen/file-list/fileStorage/storage.ts`
    *   これらのファイルは、そのロジックが新しいリポジトリに完全に移行されるため削除します。

4.  **`app/screen/file-list/fileStorage/index.ts`のリファクタリング**:
    *   このファイルは現在、削除されるファイルから再エクスポートを行っています。新しい`fileRepository.ts`および`folderRepository.ts`から必要なものを再エクスポートするように更新するか、その目的が完全に吸収される場合は削除します。

5.  **利用者の更新**:
    *   削除またはリファクタリングされるファイルから現在インポートしているすべてのファイルを特定し、新しい`app/data/fileRepository.ts`および`app/data/folderRepository.ts`を使用するようにインポートパスを更新します。

## 受け入れ条件 (Acceptance Criteria)

-   [ ] `app/data/fileRepository.ts`が作成され、ファイルおよびファイルバージョンに関するすべての高レベルビジネスロジックが適切に実装されていること。
-   [ ] `app/data/folderRepository.ts`が作成され、フォルダに関するすべての高レベルビジネスロジックが適切に実装されていること。
-   [ ] `app/screen/file-edit/repositories/fileStorage.ts`、`app/screen/file-list/fileStorage/folder.ts`、`app/screen/file-list/fileStorage/file.ts`、`app/screen/file-list/fileStorage/storage.ts`が削除されていること。
-   [ ] `app/screen/file-list/fileStorage/index.ts`が適切にリファクタリングまたは削除されていること。
-   [ ] 既存のファイルおよびフォルダのCRUD操作、バージョン管理、コピー、移動、削除など、すべての関連機能がリファクタリング後も正常に機能すること。
-   [ ] アプリケーションのビルドおよび既存のテストがすべてパスすること。

## 関連ファイル (Related Files)

-   `app/data/storageService.ts`
-   `app/data/asyncStorageUtils.ts`
-   `app/services/PathService.ts`
-   `app/screen/file-edit/repositories/fileStorage.ts` (削除対象)
-   `app/screen/file-list/fileStorage/folder.ts` (削除対象)
-   `app/screen/file-list/fileStorage/file.ts` (削除対象)
-   `app/screen/file-list/fileStorage/storage.ts` (削除対象)
-   `app/screen/file-list/fileStorage/index.ts` (リファクタリング対象)
-   `app/features/chat/handlers/deleteItemHandler.ts` (利用者)
-   `app/features/chat/handlers/moveItemHandler.ts` (利用者)
-   `app/screen/diff-view/hooks/useDiffView.tsx` (利用者)
-   `app/screen/file-list/application/fileListService.ts` (利用者 - 可能性あり)
-   `app/screen/file-list/application/folderListService.ts` (利用者 - 可能性あり)
-   `app/screen/file-edit/services/fileEditService.ts` (利用者 - 可能性あり)

## 制約条件 (Constraints)

-   既存のデータ構造（`File`, `Folder`, `FileVersion`）を変更しないこと。
-   `AsyncStorage`の基本的な動作を変更しないこと。
-   パフォーマンスに悪影響を与えないこと。
-   既存の機能が損なわれないこと。
-   UI層がデータ操作のビジネスロジックを直接扱わないようにすること。

## 開発ログ (Development Log)

## AIへの申し送り事項 (Handover to AI)
