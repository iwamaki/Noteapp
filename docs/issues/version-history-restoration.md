# バージョン履歴機能の復元

## ステータス: ✅ 完了

## 概要
フラット構造への移行（Phase 4）により、バージョン履歴機能が一時的に無効化されました。
この機能を新しいFileRepositoryFlatを使用して再実装しました。

## 影響を受けるファイル

### 完全に無効化されたファイル
- `app/screen/version-history/VersionHistoryScreen.tsx`
  - FileRepositoryV2.getVersions()への依存
  - FileRepositoryV2.getById()への依存
- `app/screen/diff-view/hooks/useDiffView.tsx`
  - FileRepositoryV2.restoreVersion()への依存

## 実装内容

### 1. FileRepositoryFlatにバージョン管理機能を追加
- ✅ `getVersions(fileId: string): Promise<FileVersionFlat[]>` メソッドを実装
- ✅ `restoreVersion(fileId: string, versionId: string): Promise<FileFlat>` メソッドを実装
- ✅ バージョン履歴の自動保存ロジック（ファイル更新時に自動保存）
  - updateメソッドでコンテンツ変更時に自動的に旧バージョンを保存
  - ストレージ構造: `{file-uuid}/versions/{version-uuid}/`

### 2. VersionHistoryScreenの更新
- ✅ FileRepositoryV2からFileRepositoryFlatへの移行完了
- ✅ fetchVersions関数の再実装
  ```typescript
  const fetchedVersions = await FileRepositoryFlat.getVersions(fileId);
  const fetchedCurrentFile = await FileRepositoryFlat.getById(fileId);
  ```

### 3. useDiffViewフックの更新
- ✅ FileRepositoryV2からFileRepositoryFlatへの移行完了
- ✅ handleRestore関数の再実装
  ```typescript
  await FileRepositoryFlat.restoreVersion(fileId, versionId);
  ```

### 4. FileServiceの更新
- ✅ getVersionHistory メソッドを有効化
- ✅ restoreVersion メソッドを有効化

## 動作確認結果
- ✅ バージョン履歴が正しく表示される
- ✅ 過去のバージョンとの差分が正しく表示される
- ✅ バージョン復元が正常に動作する
- ✅ 復元後のファイルが正しく保存される
- ✅ エラーハンドリングが適切に動作する

## 技術詳細

### ストレージ構造
```
noteapp/content/
├── {file-uuid}/
│   ├── meta.json
│   ├── content.md
│   └── versions/
│       ├── {version-uuid-1}/
│       │   ├── version_meta.json
│       │   └── version_content.md
│       └── {version-uuid-2}/
│           ├── version_meta.json
│           └── version_content.md
```

### 主要な実装ファイル
- `app/data/repositories/fileRepositoryFlat.ts` - バージョン管理メソッドを追加
- `app/screen/version-history/VersionHistoryScreen.tsx` - FileRepositoryFlatに移行
- `app/screen/diff-view/hooks/useDiffView.tsx` - FileRepositoryFlatに移行
- `app/screen/file-edit/services/FileService.ts` - バージョン管理メソッドを有効化
