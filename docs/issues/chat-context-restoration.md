# チャットコンテキスト機能の復元

## 概要
フラット構造への移行（Phase 4）により、ファイルリスト画面のチャットコンテキスト機能が一時的に無効化されました。
この機能を新しいFlatListContextを使用して再実装する必要があります。

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

## 必要な作業

### 1. useFileListChatContextフックの再実装
- [ ] FlatListContextに対応した実装に更新
  ```typescript
  // 旧: useFileListContext (hierarchical)
  // 新: useFlatListContext (flat structure)
  ```
- [ ] フラット構造用のコマンドハンドラの作成
  - [ ] create_file ハンドラ（create_directoryの代わり）
  - [ ] delete_file ハンドラ（delete_itemの代わり）
  - [ ] rename_file ハンドラ（move_itemの代わり）

### 2. ChatService.getAllFilesForContext()の実装
`app/features/chat/index.ts:256-272`で現在スタブになっている実装を更新:
```typescript
private async getAllFilesForContext(): Promise<Array<{ title: string; path: string; type: 'file' | 'folder' }>> {
  try {
    const files = await FileRepositoryFlat.getAll();
    return files.map(file => ({
      title: file.title,
      path: `/${file.title}`, // Flat structure
      type: 'file' as const,
    }));
  } catch (error) {
    logger.error('chatService', 'Error getting all files for context:', error);
    return [];
  }
}
```

### 3. フラット構造用コマンドハンドラの実装
新しいハンドラを `app/features/chat/handlers/` に作成:
- [ ] `createFileHandlerFlat.ts` - ファイル作成（フォルダパス指定なし）
- [ ] `deleteFileHandlerFlat.ts` - ファイル削除（フラット構造版）
- [ ] `renameFileHandlerFlat.ts` - ファイル名変更（移動の代わり）

### 4. FileListScreenFlatの更新
`app/screen/file-list-flat/FileListScreenFlat.tsx:246-251`のコメントアウトを解除:
```typescript
useFileListChatContext({
  items: state.files.map((f) => ({ type: 'file' as const, item: f })),
  currentPath: '/', // フラット構造では常に"/"
});
```

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
