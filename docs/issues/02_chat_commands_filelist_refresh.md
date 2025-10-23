---
filename:  02_chat_commands_filelist_refresh
id: 2
status: new
priority: high
attempt_count: 0
tags: [chat, UI, bug, file-management]
---

## 概要 (Overview)

チャット機能から実行されるファイルシステム操作コマンド（ディレクトリ作成、アイテム削除、アイテム移動）が、`FileListScreen` に即座に反映されない問題を解決します。これにより、ユーザーはコマンド実行後、手動で画面を更新することなく、変更されたファイルリストをすぐに確認できるようになります。

## 背景 (Background)

LLMからのチャット応答には、`LLMCommand` オブジェクトとしてファイルシステム操作（例: `create_directory`, `delete_item`, `move_item`）が含まれることがあります。これらのコマンドは `app/features/chat/handlers/` 内の対応するハンドラ（例: `createDirectoryHandler.ts`）によって処理されます。

現在、`editFileHandler.ts` は `context.setContent` を利用して `FileEditScreen` の内容を直接更新し、画面に即座に反映させています。しかし、`createDirectoryHandler.ts`、`deleteItemHandler.ts`、`moveItemHandler.ts` は、`FolderRepository` や `FileRepository` を直接操作して `AsyncStorage` のデータを変更するものの、`FileListScreen` に対して画面更新をトリガーするメカニズムがありません。

`FileListScreen` は `FileListProvider` を通じてデータ管理を行っており、`refreshData()` 関数が呼び出されることで `AsyncStorage` から最新のファイルリストを取得し、UIを更新します。`FileListProvider` 自身のファイルシステム操作アクション（例: `createFolder`, `deleteSelectedItems`）は、データ変更後に `refreshData()` を呼び出すことで画面更新を保証しています。

しかし、チャットコマンドハンドラが直接リポジトリを操作した場合、`refreshData()` が呼び出されないため、`FileListScreen` は変更を認識せず、UIが古い情報のままになってしまいます。このため、ユーザーはコマンド実行後に手動で画面を更新する必要があり、UXを損ねています。

## 実装方針 (Implementation Strategy)

`FileListScreen` に関連するチャットコマンドハンドラが、ファイルシステム変更後に `FileListScreen` のデータを再取得・更新できるように、以下の戦略で修正を行います。

1.  **`useFileListChatContext` の拡張**:
    *   `app/features/chat/hooks/useFileListChatContext.ts` を修正し、`FileListProvider` から提供される `actions.refreshData` 関数を `handlerContext` に含めて、チャットコマンドハンドラに渡せるようにします。
    *   `handlerContext` の型定義 (`app/features/chat/handlers/types.ts`) に `refreshData?: () => Promise<void>` を追加します。

2.  **チャットコマンドハンドラの修正**:
    *   `app/features/chat/handlers/createDirectoryHandler.ts`、`deleteItemHandler.ts`、`moveItemHandler.ts` を修正します。
    *   これらのハンドラは、ファイルシステム操作が成功した後、`context.refreshData()` が存在すればそれを呼び出すように変更します。

このアプローチにより、チャットコマンドハンドラは `FileListScreen` の状態管理メカニズムと適切に連携し、保守性と拡張性を保ちつつ、画面の即時更新を実現できます。

## 受け入れ条件 (Acceptance Criteria)

- [x] `docs/issues/02_chat_commands_filelist_refresh.md` が作成されていること。
- [x] `CommandHandlerContext` に `refreshData` が追加されていること。
- [x] `useFileListChatContext` が `FileListProvider` の `refreshData` を `handlerContext` に含めていること。
- [x] `createDirectoryHandler` が処理成功後に `refreshData` を呼び出すこと。
- [x] `deleteItemHandler` が処理成功後に `refreshData` を呼び出すこと。
- [x] `moveItemHandler` が処理成功後に `refreshData` を呼び出すこと。
- [ ] チャット機能から `create_directory` コマンドを実行した際、`FileListScreen` に新しいディレクトリが即座に表示されること（動作確認）。
- [ ] チャット機能から `delete_item` コマンドを実行した際、`FileListScreen` から該当アイテムが即座に削除されること（動作確認）。
- [ ] チャット機能から `move_item` コマンドを実行した際、`FileListScreen` 上でアイテムが移動先に即座に表示され、元の場所から消えること（動作確認）。
- [ ] 上記の変更が、既存の `FileListScreen` の機能やパフォーマンスに悪影響を与えないこと（動作確認）。

## 関連ファイル (Related Files)

- `app/features/chat/index.ts` (ChatService)
- `app/features/chat/llmService/types/types.ts` (LLMCommand, ChatResponse)
- `app/features/chat/hooks/useFileListChatContext.ts`
- `app/features/chat/handlers/types.ts`
- `app/features/chat/handlers/createDirectoryHandler.ts`
- `app/features/chat/handlers/deleteItemHandler.ts`
- `app/features/chat/handlers/moveItemHandler.ts`
- `app/screen/file-list/FileListScreen.tsx`
- `app/screen/file-list/context/FileListProvider.tsx`
- `app/screen/file-list/context/useFileListContext.ts`
- `app/data/folderRepository.ts`
- `app/data/fileRepository.ts`
- `app/data/storageService.ts`

## 制約条件 (Constraints)

- 既存の `FileListProvider` および `useFileListContext` のアーキテクチャを維持すること。
- `ChatService` と `FileListScreen` の間の結合度を不必要に高めないこと。
- `AsyncStorage` の直接操作は `FolderRepository` および `FileRepository` に限定すること。

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:** チャットコマンドが `FileListScreen` の更新にどのように影響するかを分析。`ChatService`、`useChat`、`useFileListChatContext`、各コマンドハンドラ、`FileListProvider`、`FolderRepository`、`storageService` のコードを調査し、`editFileHandler` と他のファイルシステム操作ハンドラとの間の画面更新メカニズムの違いを特定した。
- **結果:** `editFileHandler` は `setContent` を介して直接UIを更新するが、他のファイルシステム操作ハンドラはリポジトリを直接操作するのみで、`FileListScreen` に画面更新をトリガーするメカニズムがないことを確認。
- **メモ:** `useFileListChatContext` を介して `FileListProvider` の `refreshData` をハンドラに渡すことで、この問題を解決できる見込み。

---
### 試行 #2

- **試みたこと:** 実装方針に沿って、以下の修正を実施:
  1. `app/features/chat/handlers/types.ts` の `CommandHandlerContext` に `refreshData?: () => Promise<void>` を追加
  2. `app/features/chat/hooks/useFileListChatContext.ts` を修正して、`useFileListContext` から `actions.refreshData` を取得し、`handlerContext` に含めた
  3. `createDirectoryHandler.ts`、`deleteItemHandler.ts`、`moveItemHandler.ts` を修正して、各ハンドラが context パラメータを受け取り、処理成功後に `context?.refreshData?.()` を呼び出すようにした
- **結果:** 全ての実装が完了。コードレベルでの受け入れ条件を満たした。
- **メモ:** 実際の動作確認（手動テスト）は、アプリケーションをビルドして実行する必要がある。

---

## AIへの申し送り事項 (Handover to AI)

- **現在の状況:** 実装が完了しました。以下の修正を行いました:
  1. `CommandHandlerContext` に `refreshData` を追加
  2. `useFileListChatContext` を修正して `refreshData` を `handlerContext` に含めるように変更
  3. 3つのハンドラ（`createDirectoryHandler`、`deleteItemHandler`、`moveItemHandler`）を修正して、処理成功後に `refreshData` を呼び出すように変更
- **次のアクション:**
  - アプリケーションをビルドして実行し、動作確認を行ってください
  - チャット機能から `create_directory`、`delete_item`、`move_item` コマンドを実行して、`FileListScreen` が即座に更新されることを確認してください
  - 既存の `FileListScreen` の機能に悪影響がないことを確認してください
- **考慮事項/ヒント:**
  - 動作確認が完了したら、受け入れ条件の残りの項目にチェックを入れてください
  - 問題が見つかった場合は、ログを確認してデバッグしてください
