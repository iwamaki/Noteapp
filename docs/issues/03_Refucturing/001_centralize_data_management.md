---
filename: 001_centralize_data_management
id: 001
status: new
priority: high
attempt_count: 0
tags: [data-management, refactoring, storage]
---

## 概要 (Overview)

アプリケーションの`AsyncStorage`への生データアクセス層を一元化し、ファイル、フォルダ、ファイルバージョンに関するストレージ操作の重複を解消します。これにより、データ管理の保守性、一貫性、拡張性を向上させます。

## 背景 (Background)

現在、`file-list`と`file-edit`モジュール内で`AsyncStorage`への生アクセス操作（ファイルの読み書き、エラーハンドリング、ストレージキー定義など）が重複しています。また、`StorageError`クラスも複数箇所で定義されています。この重複は、コードの保守性を低下させ、将来的な変更や機能追加の際に不整合やバグを引き起こすリスクがあります。他の機能（チャットハンドラー、差分ビューなど）もこれらのストレージ層を利用しているため、基盤の安定化が急務です。

## 実装方針 (Implementation Strategy)

1.  **共通ストレージサービスの導入**: `app/data/storageService.ts`を新規作成し、`AsyncStorage`へのすべての生アクセス操作（ファイル、フォルダ、ファイルバージョンに関する読み書き）、関連するストレージキー、および`StorageError`クラスを一元化します。
2.  **既存モジュールのリファクタリング**: `file-list/fileStorage/storage.ts`と`file-edit/repositories/fileStorage.ts`から重複するコードを削除し、新しく作成した`app/data/storageService.ts`から必要な関数やクラスをインポートして利用するように変更します。
3.  **`StorageUtils`の活用**: `app/data/asyncStorageUtils.ts`で定義されている`StorageUtils.safeJsonParse`や`StorageUtils.convertDates`を、`storageService.ts`内で一貫して利用するようにします。

## 受け入れ条件 (Acceptance Criteria)

-   [ ] `app/data/storageService.ts`が作成され、ファイル、フォルダ、ファイルバージョンに関するすべての生`AsyncStorage`操作、ストレージキー、`StorageError`クラスが一元化されていること。
-   [ ] `file-list/fileStorage/storage.ts`から重複する`AsyncStorage`操作および`StorageError`クラスが削除され、`storageService.ts`を参照するように変更されていること。
-   [ ] `file-edit/repositories/fileStorage.ts`から重複する`AsyncStorage`操作および`StorageError`クラスが削除され、`storageService.ts`を参照するように変更されていること。
-   [ ] 既存のファイル、フォルダ、ファイルバージョンのCRUD操作が、リファクタリング後も正常に機能すること。
-   [ ] アプリケーションのビルドおよび既存のテストがすべてパスすること。

## 関連ファイル (Related Files)

-   `app/data/asyncStorageUtils.ts`
-   `app/screen/file-list/fileStorage/storage.ts`
-   `app/screen/file-edit/repositories/fileStorage.ts`
-   `app/features/chat/handlers/deleteItemHandler.ts`
-   `app/features/chat/handlers/moveItemHandler.ts`
-   `app/screen/file-list/fileStorage/folder.ts`
-   `app/screen/file-list/fileStorage/index.ts`
-   `app/screen/file-list/fileStorage/file.ts`
-   `app/screen/diff-view/hooks/useDiffView.tsx`

## 制約条件 (Constraints)

-   既存のデータ構造（`File`, `Folder`, `FileVersion`）を変更しないこと。
-   `AsyncStorage`の基本的な動作を変更しないこと。
-   パフォーマンスに悪影響を与えないこと。
-   既存の機能が損なわれないこと。

## 開発ログ (Development Log)

## AIへの申し送り事項 (Handover to AI)
