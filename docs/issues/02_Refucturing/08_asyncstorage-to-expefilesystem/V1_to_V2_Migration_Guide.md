# V1からV2への移行ガイド

このドキュメントは、Issue 005で実装されたV2構造（expo-file-systemのベストプラクティス）への移行方法を説明します。

## 概要

V2では、AsyncStorageの複雑なパス管理の名残を完全に排除し、expo-file-systemの階層的なディレクトリ構造を最大限活用しています。

### 主な変更点

| 項目 | V1（旧） | V2（新） |
|------|---------|---------|
| **型定義** | `path: string` フィールドあり | `path`削除、`slug`追加 |
| **データ構造** | フラットなJSON | 階層的ディレクトリ |
| **アクセス方法** | `getAll()` → フィルタリング | パス指定で直接アクセス |
| **階層走査** | 手動（キュー・再帰） | ファイルシステムが自動処理 |
| **パス管理** | 複雑な文字列操作 | Directoryオブジェクト |

## V2の新しいファイル

### データ層

- `app/data/typeV2.ts` - V2型定義（`path`削除、`slug`追加）
- `app/data/fileSystemUtilsV2.ts` - 低レベルAPI（階層的構造）
- `app/data/directoryResolver.ts` - パス解決ユーティリティ
- `app/data/fileRepositoryV2.ts` - ファイルリポジトリV2
- `app/data/folderRepositoryV2.ts` - フォルダリポジトリV2
- `app/data/migrationUtilsV2.ts` - V1→V2データ移行

### サービス層

- `app/services/PathServiceV2.ts` - 最小限のパスユーティリティ

### ドメイン層

- `app/screen/file-list/domain/FolderDomainServiceV2.ts` - フォルダドメインサービスV2
- `app/screen/file-list/domain/FileDomainServiceV2.ts` - ファイルドメインサービスV2

### アプリケーション層

- `app/screen/file-list/application/FileListUseCasesV2.ts` - ユースケースV2
- `app/features/chat/handlers/itemResolverV2.ts` - アイテム検索V2

## コード移行パターン

### 1. リポジトリの使用

**V1（旧）:**
```typescript
// 全件取得してフィルタリング（非効率）
const allFolders = await FolderRepository.getAll();
const childFolders = allFolders.filter(
  folder => PathService.normalizePath(folder.path) === parentPath
);
```

**V2（新）:**
```typescript
// パス指定で直接取得（効率的）
const childFolders = await FolderRepositoryV2.getByParentPath(parentPath);
```

### 2. フォルダの削除

**V1（旧）:**
```typescript
// 複雑な階層走査（50行以上）
const allFolders = await FolderRepository.getAll();
const descendants = FolderDomainService.getAllDescendantFolders(folderPath, allFolders);
const filesToDelete = new Set<string>();
// キュー処理、再帰探索...
await FileRepository.batchDelete(Array.from(filesToDelete));
await FolderRepository.batchDelete(Array.from(foldersToDelete));
```

**V2（新）:**
```typescript
// 超簡単！ディレクトリ削除で子孫も自動削除
await FolderRepositoryV2.delete(folderId);
```

### 3. フォルダのリネーム

**V1（旧）:**
```typescript
// 複雑なパス更新（100行以上）
const allFolders = await FolderRepository.getAll();
const descendants = FolderDomainService.getAllDescendantFolders(oldPath, allFolders);
// 子孫フォルダ・ファイルのパスを文字列置換で更新...
const updatedDescendantFolders = descendants.map(d => {
  const descendantFullPath = FolderDomainService.getFullPath(d);
  const newDescendantPath = descendantFullPath.replace(oldFullPath, newFullPath);
  const newParentPath = PathService.getParentPath(newDescendantPath);
  return { ...d, path: newParentPath, updatedAt: new Date() };
});
await FolderRepository.batchUpdate([updatedFolder, ...updatedDescendantFolders]);
```

**V2（新）:**
```typescript
// 超簡単！リネームで子孫も自動更新
await FolderRepositoryV2.rename(folderId, newName);
```

### 4. アイテムの検索

**V1（旧）:**
```typescript
// 全件取得してループ検索（非効率）
const folders = await FolderRepository.getAll();
for (const folder of folders) {
  const fullPath = PathService.getFullPath(folder.path, folder.name, 'folder');
  if (fullPath === targetPath) {
    return folder;
  }
}
```

**V2（新）:**
```typescript
// DirectoryResolverで直接解決（効率的）
const folderDir = await DirectoryResolver.resolveFolderDirectory(targetPath);
const metadata = await FileSystemUtilsV2.readFolderMetadata(folderDir);
return metadataToFolderV2(metadata);
```

### 5. バリデーション・重複チェック

**V1（旧）:**
```typescript
// 全件取得してチェック
const allFolders = await FolderRepository.getAll();
const targetPath = PathService.getFullPath(parentPath, name, 'folder');
const existing = allFolders.find(folder => {
  const folderFullPath = PathService.getFullPath(folder.path, folder.name, 'folder');
  return folderFullPath === targetPath && folder.id !== excludeId;
});
```

**V2（新）:**
```typescript
// 親フォルダ内のみ取得してチェック
const siblings = await FolderRepositoryV2.getByParentPath(parentPath);
const targetSlug = PathServiceV2.generateSlug(name);
const existing = siblings.find(
  folder => folder.slug === targetSlug && folder.id !== excludeId
);
```

## パフォーマンスの改善

### 全件取得パターンの排除

**V1:**
- `FolderRepository.getAll()` - O(n)の全件スキャン
- メモリ内でのフィルタリング・ソート

**V2:**
- `FolderRepositoryV2.getByParentPath()` - O(1)のディレクトリアクセス
- ファイルシステムレベルで効率的

### 階層走査の最適化

**V1:**
- キュー・再帰による手動走査
- 複雑なパス文字列操作

**V2:**
- ディレクトリ構造 = データ構造
- ファイルシステムが自動処理

## データ移行

アプリ起動時に自動的にV1からV2へデータ移行が実行されます：

1. **自動検出**: 移行が必要かどうかを自動判定
2. **バックアップ**: 移行前にV1データをバックアップ
3. **階層再構築**: `path`フィールドから階層構造を再構築
4. **検証**: データ件数の一致を確認
5. **完了**: 完了フラグを設定

移行タスク: `app/initialization/tasks/migrateToV2.ts`

## トラブルシューティング

### 移行が失敗した場合

1. バックアップから自動的にロールバック
2. 次回起動時に再試行
3. ログを確認: `[MigrateToV2]` で検索

### V2でデータが見つからない場合

1. 移行が完了しているか確認: AsyncStorageの `@migration_v2_completed` キー
2. ディレクトリ構造を確認: `${Paths.document}/noteapp/content/`
3. メタデータファイルの存在を確認: `.folder.json`, `meta.json`

## 今後の削除予定

以下のV1コードは`@deprecated`マークが付けられており、将来的に削除されます：

- `app/services/PathService.ts` - 複雑な関数群
- `app/screen/file-list/domain/FolderDomainService.ts`
- `app/screen/file-list/domain/FileDomainService.ts`
- `app/screen/file-list/application/FileListUseCases.ts`

新しいコードでは、必ずV2クラスを使用してください。

## まとめ

V2では、AsyncStorageの複雑なパス管理を完全に排除し、expo-file-systemの自然な階層構造を最大限活用しています。

**主な利点:**
- ✅ コード量削減（20-50%）
- ✅ 複雑度の劇的削減
- ✅ パフォーマンスの大幅改善
- ✅ 保守性の向上
- ✅ 拡張性の向上

詳細は `005_optimize_for_expo_filesystem_best_practices_detailed_plan.md` を参照してください。
