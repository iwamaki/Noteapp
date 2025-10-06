## フェーズ3: フックの導入と更新 - 詳細計画

**目的:** `useNoteOperations`フックを新規作成し、`app/features/note-edit/hooks/useNoteEditor.tsx`と`app/features/note-list/hooks/useNoteListLogic.ts`をリファクタリングして、EventBusとCommandExecutorを利用するように変更し、ストアへの直接的な依存関係を解消する。

**重要事項:**

`docs/issues/Refucturing/02_try/03_Refactoring_Plan.md`ではフェーズ1（EventBusとCommandExecutorのコア計画を含む）が完了したと記載されていますが、コードベースには`app/services/eventBus.ts`および`app/services/commandExecutor.ts`ファイルが存在しません。本計画は、これらのファイルがフェーズ3の実施前に実装されることを前提として策定されます。フェーズ1の実際の完了状況を確認し、必要に応じてこれらのファイルを実装することが、フェーズ3を開始する上での前提条件となります。

### 3.1. `app/hooks/useNoteOperations.ts` の新規作成計画

*   **ファイル作成**: `app/hooks/useNoteOperations.ts`という新しいファイルを作成する。
*   **インポートの定義**:
    *   `react`から`useCallback`をインポートする。
    *   `../../shared/types/note`から`Note`型をインポートする。
    *   `../services/storageService`から`CreateNoteData`型をインポートする。(`app/services/storageService.ts`で定義されていることを確認済み。)
    *   `../services/commandExecutor`から`UpdateNoteCommand`と`commandExecutor`をインポートする。(フェーズ1で実装されることを前提とする。)
    *   `../services/eventBus`から`eventBus`をインポートする。(フェーズ1で実装されることを前提とする。)
    *   `../services/storageService`から`NoteStorageService`をインポートする。
*   **`useNoteOperations`フックの実装概要**:
    *   `useCallback`を使用して、`updateNote`、`createNote`、`deleteNote`の各関数を定義する。
    *   `updateNote`関数は、`UpdateNoteCommand`を作成し、`commandExecutor.execute`を呼び出す。
    *   `createNote`関数は、`NoteStorageService.createNote`を呼び出し、結果の`note`を`eventBus.emit('note:created', { note })`で発行する。
    *   `deleteNote`関数は、`NoteStorageService.deleteNote`を呼び出し、`eventBus.emit('note:deleted', { noteId })`で発行する。
    *   これらの関数をオブジェクトとしてエクスポートする。

### 3.2. `app/features/note-edit/hooks/useNoteEditor.tsx` の更新計画

*   **現状分析**:
    *   `useNoteStore`と`useNoteDraftStore`に直接依存している。
    *   `activeNote`、`selectNote`、`updateNote`、`setDraftNote`を直接使用している。
    *   `handleTitleChange`、`handleCompositionEnd`、`handleGoToDiff`内でストアのアクションを直接呼び出している。
*   **インポートの変更**:
    *   `useNoteStore`と`useNoteDraftStore`への既存のインポートを削除する。
    *   `../../../../shared/types/note`から`Note`型をインポートする。
    *   `../../../../services/eventBus`から`eventBus`をインポートする。
    *   `../../../../hooks/useNoteOperations`から`useNoteOperations`をインポートする。
*   **ロジックのリファクタリング**:
    *   `useNoteOperations`フックを呼び出し、`updateNote`、`createNote`などの関数を取得する。
    *   `noteStore`や`noteDraftStore`の直接的なアクション呼び出しを、`useNoteOperations`から取得した対応する関数に置き換える。
    *   `useEffect`フックを使用して、`eventBus.on('note:updated', ...)`および`eventBus.on('note:created', ...)`イベントのリスナーを登録する。これらのリスナー内で、`activeNote`や`draftNote`の状態をイベントペイロードに基づいて更新するロジックを実装する。
    *   `useEffect`のクリーンアップ関数で、登録したイベントリスナーを解除する。
    *   `handleGoToDiff`は、`setDraftNote`の代わりに、`eventBus.emit('draft:saved', { note: { title, content } })`のようなイベントを発行するように変更する。

### 3.3. `app/features/note-list/hooks/useNoteListLogic.ts` の更新計画

*   **現状分析**:
    *   `useNoteStore`と`useNoteSelectionStore`に直接依存している。
    *   `filteredNotes`、`loading`、`fetchNotes`、`createNote`、`isSelectionMode`、`selectedNoteIds`、`toggleSelectionMode`、`toggleNoteSelection`、`clearSelectedNotes`、`deleteSelectedNotes`、`copySelectedNotes`を直接使用している。
    *   `useEffect`、`handleDeleteSelected`、`handleCopySelected`、`handleCreateNote`内でストアのアクションを直接呼び出している。
*   **インポートの変更**:
    *   `useNoteStore`と`useNoteSelectionStore`への既存のインポートを削除する。
    *   `../../../../shared/types/note`から`Note`型をインポートする。
    *   `../../../../services/eventBus`から`eventBus`をインポートする。
    *   `../../../../hooks/useNoteOperations`から`useNoteOperations`をインポートする。
*   **ロジックのリファクタリング**:
    *   `useNoteOperations`フックを呼び出し、`createNote`、`deleteNote`などの関数を取得する。
    *   `handleCreateNote`、`handleDeleteSelected`、`handleCopySelected`などのアクションを、`useNoteOperations`から取得した対応する関数に置き換える。
    *   `useEffect`フックを使用して、`eventBus.on('note:created', ...)`、`eventBus.on('note:deleted', ...)`、`eventBus.on('notes:bulk-deleted', ...)`、`eventBus.on('notes:bulk-copied', ...)`イベントのリスナーを登録する。これらのリスナー内で、ノートリストの状態をイベントペイロードに基づいて更新するロジックを実装する。
    *   `useEffect`のクリーンアップ関数で、登録したイベントリスナーを解除する。
    *   `fetchNotes`の代わりに、`eventBus.emit('sync:requested', { source: 'NoteListScreen' })`のようなイベントを発行し、`noteStore`がこれに反応してノートをフェッチするように変更する。
