---
title: "バージョン履歴画面の全機能実装"
id: 17
status: new
priority: high
attempt_count: 0
tags: [UI, versioning, data]
---

## 概要 (Overview)

アプリケーションのバージョン履歴画面（`VersionHistoryScreen`）に、ノートの過去バージョン一覧表示、選択したバージョンとの差分表示、および過去バージョンへの復元機能を実装します。

## 背景 (Background)

現在の`VersionHistoryScreen`はプレースホルダーであり、ユーザーはノートの編集履歴を確認したり、過去の状態に戻したりすることができません。これはユーザーが安心して編集作業を進める上で不可欠な機能であり、ユーザー物語「4. 過去のバージョンへの復元」で明確に要求されています。

## 受け入れ条件 (Acceptance Criteria)

- [ ] `VersionHistoryScreen`で、選択されたノートの全バージョンが時系列順に表示されること。
- [ ] 各バージョンについて、作成日時、更新日時、簡単な内容プレビューなどが表示されること。
- [ ] ユーザーが特定のバージョンを選択すると、現在のノート内容とそのバージョンとの差分が`DiffViewScreen`で表示されること。
- [ ] `DiffViewScreen`で差分を確認後、ユーザーが選択したバージョンにノートを復元できること。
- [ ] 復元操作が成功した後、`NoteEditScreen`に復元された内容が反映されて表示されること。
- [ ] バージョン管理のデータが`storageService`または専用のサービスで適切に管理されていること。

## 関連ファイル (Related Files)

- `src/features/version-history/VersionHistoryScreen.tsx`
- `src/navigation/RootNavigator.tsx`
- `src/navigation/types.ts`
- `src/store/noteStore.ts`
- `src/services/storageService.ts` (バージョン履歴の取得・管理ロジック)
- `src/services/diffService.ts`
- `src/features/diff-view/DiffViewScreen.tsx`
- `docs/specifications/requirements.md`
- `docs/specifications/screen-transitions.md`
- `docs/specifications/user-stories.md`

## 実装計画 (Implementation Plan)

1.  **`storageService.ts`の拡張:**
    -   ノートのバージョン履歴を保存するための新しいデータ構造を定義します。`NoteVersion`のようなインターフェースを作成し、`noteId`, `version`, `content`, `createdAt`などを含むようにします。
    -   バージョン履歴を保存するための新しいストレージキー（例: `@note_versions`）を定義します。
    -   `updateNote`が呼ばれる際に、更新前のノート内容を新しいバージョンとして保存するロジックを追加します。
    -   特定のノートIDに紐づく全てのバージョン履歴を取得する`getNoteVersions(noteId: string)`関数を新しく作成します。
    -   特定のバージョンIDのノート内容を取得する`getNoteVersion(versionId: string)`関数を追加します。
    -   ノートを過去のバージョンに復元するための`restoreNoteVersion(noteId: string, versionId: string)`関数を新しく作成します。この関数は、指定されたバージョンの内容で現在のノートを更新し、新しいバージョンとして保存します。

2.  **`shared/types/note.ts`の更新:**
    -   `NoteVersion`インターフェースを`shared/types/note.ts`に定義し、フロントエンドとバックエンド（将来的に）で型を共有できるようにします。

3.  **`VersionHistoryScreen.tsx`の実装:**
    -   画面遷移時に渡される`noteId`を使って、`storageService.getNoteVersions`を呼び出し、バージョン履歴の一覧を取得します。
    -   取得したバージョン一覧を`FlatList`などを使って時系列順に表示します。各項目にはバージョン番号、作成日時などを表示します。
    -   リストの項目がタップされたら、そのバージョンの`content`と現在の`activeNote.content`を`DiffViewScreen`に渡して画面遷移します。復元処理のために、選択した`versionId`も渡します。

4.  **`navigation/types.ts`の更新:**
    -   `DiffViewScreen`が受け取るパラメータを拡張し、`originalContent`, `newContent`, `noteId`, `versionId`など、差分表示と復元に必要な情報を含められるようにします。

5.  **`DiffViewScreen.tsx`の変更:**
    -   `VersionHistoryScreen`から渡されたパラメータを受け取って差分を表示するようにロジックを修正します。
    -   「適用」ボタンのロジックを修正します。`versionId`が渡されている場合は、`storageService.restoreNoteVersion`を呼び出してノートを復元し、成功したら`NoteEditScreen`に戻るようにします。

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:**
- **結果:**
- **メモ:**

---