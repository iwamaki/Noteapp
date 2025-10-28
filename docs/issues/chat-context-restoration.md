# チャットコンテキスト機能の復元

**ステータス**: フロントエンド実装完了（バックエンド対応待ち - issue #2参照）

## 概要
フラット構造への移行（Phase 4）により、ファイルリスト画面のチャットコンテキスト機能が一時的に無効化されました。
この機能を新しいFlatListContextを使用して再実装する必要があります。

**進捗**: フロントエンド側の実装は完了しましたが、バックエンド側がまだ階層構造を前提としているため、統合テストはバックエンドの対応後に実施します。

## 影響を受けるファイル

### 完全に無効化されたファイル
- `app/features/chat/hooks/useFileListChatContext.ts`
  - 旧FileListContextへの依存
  - 削除されたV2ハンドラへの依存

### 部分的に無効化されたファイル
- `app/features/chat/index.ts`
  - `getAllFilesForContext()` メソッドが空配列を返すように変更
- `app/screen/file-list-flat/FileListScreenFlat.tsx`
  - useFileListChatContextの呼び出しがコメントアウト

## 完了した作業 (2025-01-XX)

### 1. 型定義の最適化（フラット構造対応）✅
- [x] `app/features/chat/llmService/types/types.ts`
  - `ChatContext.allFiles`: `path`削除、`title`・`categories`・`tags`のみに
  - `LLMCommand`: フラット構造用フィールド追加（`title`、`new_title`、`categories`、`tags`）
- [x] `app/features/chat/types.ts`
  - `FileListItem`: `filePath`削除、`title`・`type`・`categories`・`tags`に変更
  - `FilelistScreenContext`: `currentPath`削除

### 2. ChatServiceの実装 ✅
- [x] `app/features/chat/index.ts:253-271`
  - `getAllFilesForContext()`: `FileRepositoryFlat.getAll()`を使用
  - LLMに`title`、`type`、`categories`、`tags`のみ送信

### 3. フラット構造用ハンドラの作成 ✅
- [x] `app/features/chat/handlers/createFileHandlerFlat.ts`
- [x] `app/features/chat/handlers/deleteFileHandlerFlat.ts`
- [x] `app/features/chat/handlers/renameFileHandlerFlat.ts`

### 4. useFileListChatContextフックの再実装 ✅
- [x] `app/features/chat/hooks/useFileListChatContext.ts`
  - FlatListContext対応
  - フラット構造用ハンドラを登録

### 5. FileListScreenFlatでの有効化 ✅
- [x] `app/screen/file-list-flat/FileListScreenFlat.tsx:247-250`
  - useFileListChatContextの呼び出しを有効化

## 必要な作業（残タスク）

### バックエンド対応 🔄
- [ ] バックエンド（server/）のフラット構造対応
  - 詳細は `docs/issues/02_backend-flat-structure-migration.md` を参照
  - バックエンドが完了するまで、統合テストは実施不可

## テスト項目
- [ ] LLMがファイルリストを正しく認識する
- [ ] LLMがcreate_fileコマンドでファイルを作成できる
- [ ] LLMがdelete_fileコマンドでファイルを削除できる
- [ ] LLMがrename_fileコマンドでファイル名を変更できる
- [ ] コマンド実行後にUI が自動的に更新される（refreshData が呼ばれる）
- [ ] エラーケースの適切な処理

## 優先度
High - LLMによるファイル操作はアプリの主要機能の一つ

## 参考
- 旧実装: `app/features/chat/hooks/useFileListChatContext.ts`（コメントアウトされた実装を参照）
- 削除されたV2ハンドラ:
  - `app/features/chat/handlers/createDirectoryHandlerV2.ts`（削除済み）
  - `app/features/chat/handlers/deleteItemHandlerV2.ts`（削除済み）
  - `app/features/chat/handlers/moveItemHandlerV2.ts`（削除済み）

## 注意事項
- フラット構造では、フォルダの概念がないため、パス指定のロジックをすべて削除する必要がある
- カテゴリーやタグによる整理をLLMが理解できるよう、プロンプトに含める必要があるかもしれない

## 実装の詳細

### 主要な設計判断

1. **LLMには人間が読める情報のみ送信**
   - ❌ `id`（UUID）や`path`を送信しない
   - ✅ `title`（人間が読めるファイル名）のみで識別
   - 理由: LLMが記号の羅列（UUID）を処理するのは非効率

2. **フラット構造のシンプルさを活かす**
   - パス管理不要
   - カテゴリーとタグで柔軟な分類
   - ディレクトリツリーの複雑さを排除

3. **同名ファイル問題**
   - 現状: 最初に見つかったファイルを操作（シンプル実装）
   - 将来: エラーハンドリングの改善が必要（後回し）

### フロントエンド→LLMのデータフロー

```typescript
// 1. ファイルデータ（FileFlat）
{
  id: "uuid-123",
  title: "会議メモ",
  content: "...",
  categories: ["仕事", "議事録"],
  tags: ["重要"],
}

// 2. LLMに送信（FileListItem）
{
  title: "会議メモ",
  type: "file",
  categories: ["仕事", "議事録"],
  tags: ["重要"],
}
// ← idは送信しない

// 3. LLMから受信（LLMCommand）
{
  action: "delete_file",
  title: "会議メモ",
}

// 4. ハンドラでtitle→id変換
const allFiles = await FileRepositoryFlat.getAll();
const file = allFiles.find(f => f.title === "会議メモ");
await FileRepositoryFlat.delete(file.id);
```

### バックエンドとの不整合の発見

フロントエンド実装中に、バックエンドがまだ階層構造を前提としていることが判明：

**バックエンドの問題点**:
- `FileListItem.filePath` を期待（フロントは`title`）
- `FilelistScreenContext.currentPath` を期待（フロントは削除済み）
- ツールが`path`ベース（`create_directory`, `move_item`等）

**解決策**:
- 新しいissue (#2)を作成: `docs/issues/02_backend-flat-structure-migration.md`
- バックエンド対応後に統合テスト実施
