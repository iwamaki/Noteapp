# バージョン履歴機能の復元

## 概要
フラット構造への移行（Phase 4）により、バージョン履歴機能が一時的に無効化されました。
この機能を新しいFileRepositoryFlatを使用して再実装する必要があります。

## 影響を受けるファイル

### 完全に無効化されたファイル
- `app/screen/version-history/VersionHistoryScreen.tsx`
  - FileRepositoryV2.getVersions()への依存
  - FileRepositoryV2.getById()への依存
- `app/screen/diff-view/hooks/useDiffView.tsx`
  - FileRepositoryV2.restoreVersion()への依存

## 必要な作業

### 1. FileRepositoryFlatにバージョン管理機能を追加
- [ ] `getVersions(fileId: string): Promise<FileVersion[]>` メソッドを実装
- [ ] `restoreVersion(fileId: string, versionId: string): Promise<void>` メソッドを実装
- [ ] バージョン履歴の保存ロジック（ファイル更新時に自動保存）

### 2. VersionHistoryScreenの更新
- [ ] FileRepositoryV2からFileRepositoryFlatへの移行
- [ ] fetchVersions関数の再実装
  ```typescript
  const fetchedVersions = await FileRepositoryFlat.getVersions(fileId);
  const fetchedCurrentFile = await FileRepositoryFlat.getById(fileId);
  ```

### 3. useDiffViewフックの更新
- [ ] FileRepositoryV2からFileRepositoryFlatへの移行
- [ ] handleRestore関数の再実装
  ```typescript
  await FileRepositoryFlat.restoreVersion(fileId, versionId);
  ```

### 4. エラーハンドリングの更新
- [ ] FileSystemV2ErrorからFileSystemFlatErrorへの移行（必要に応じて）

## テスト項目
- [ ] バージョン履歴が正しく表示される
- [ ] 過去のバージョンとの差分が正しく表示される
- [ ] バージョン復元が正常に動作する
- [ ] 復元後のファイルが正しく保存される
- [ ] エラーケースの適切な処理（ファイルが見つからない、バージョンが見つからない等）

## 優先度
Medium - 基本的なファイル操作には影響しないが、ユーザーが過去のバージョンに戻したい場合に必要

## 参考
- 旧実装: `app/screen/version-history/VersionHistoryScreen.tsx`（コメントアウトされた実装を参照）
- 旧実装: `app/screen/diff-view/hooks/useDiffView.tsx`（コメントアウトされた実装を参照）
