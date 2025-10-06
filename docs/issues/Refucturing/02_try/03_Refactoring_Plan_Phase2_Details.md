# フェーズ2: ストアのリファクタリング詳細計画

## 目的
既存のストア（`noteStore`、`noteSelectionStore`、`noteDraftStore`、`settingsStore`）をイベント駆動型アーキテクチャに移行し、`EventBus`と連携するようにリファクタリングします。これにより、ストア間の直接的な依存関係を解消し、疎結合な状態管理を実現します。

## 参照ドキュメント
*   `docs/issues/Refucturing/02_try/03_Refactoring_Plan.md` (全体リファクタリング計画)
*   `docs/issues/Refucturing/02_try/02_Refactoring.md` (EDA提案書 - EventBusとCommandExecutorの実装詳細)
*   `dependency-graph.dot` (現在の依存関係グラフ)

## 各ストアのリファクタリング計画

### 1. `app/store/note/noteStore.ts` のリファクタリング

**目標**: `noteStore`をイベント駆動型に変換し、`note:created`、`note:updated`、`note:deleted`イベントに反応し、`note:selected`および`error:occurred`イベントを発行するようにします。

**手順**:
1.  **必要なモジュールのインポート**:
    *   `eventBus`を`../../services/eventBus`からインポートします。
    *   `Note`型を`../../shared/types/note`からインポートします。
    *   `AppError`を`../../utils/AppError`からインポートします（`AppError`が未定義の場合は、別途作成します）。
2.  **`NoteStoreState`インターフェースの更新**:
    *   既存の`fetchNotes`、`createNote`、`updateNote`、`deleteNote`アクションを削除します。
    *   `error: AppError | null;`を追加します。
3.  **イベントリスナーの実装**:
    *   `create`関数内で、以下の`eventBus.on`リスナーを登録します。
        *   `note:created`: 新しいノートを`notes`配列に追加し、`activeNote`として設定します。
        *   `note:updated`: `notes`配列内の対応するノートを更新し、更新されたノートが`activeNote`である場合は`activeNote`も更新します。
        *   `note:deleted`: `notes`配列からノートを削除し、削除されたノートが`activeNote`であった場合は`activeNote`を`null`に設定します。
4.  **`selectNote`アクションのリファクタリング**:
    *   `selectNote`を`eventBus.emit('note:selected', { noteId })`を発行するように変更します。
5.  **エラーハンドリング**:
    *   `noteStore`内のすべての`console.error`呼び出しを`eventBus.emit('error:occurred', { error, context: 'noteStore' })`に置き換えます。
6.  **未使用のインポート/定義の削除**:
    *   `NoteError`インターフェースおよび`createNoteError`ヘルパー関数を削除します。
    *   `StorageError`のインポートを削除します。

### 2. `app/store/note/noteSelectionStore.ts` のリファクタリング

**目標**: `noteSelectionStore`をイベント駆動型に変換し、`notes:bulk-deleted`、`notes:bulk-copied`、`error:occurred`イベントを発行するようにします。`NoteStorageService`および`useNoteStore`への直接的な依存を削除します。

**手順**:
1.  **必要なモジュールのインポート**:
    *   `eventBus`を`../../services/eventBus`からインポートします。
    *   `NoteStorageService`を`../../services/storageService`からインポートします（実際のストレージ操作には引き続き必要ですが、他のストアからの直接呼び出しは削除されます）。
    *   `AppError`を`../../utils/AppError`からインポートします。
2.  **`deleteSelectedNotes`アクションのリファクタリング**:
    *   実際の削除処理のために`NoteStorageService.deleteNote`呼び出しを保持します。
    *   削除成功後、`eventBus.emit('notes:bulk-deleted', { noteIds: Array.from(selectedNoteIds) })`を発行します。
    *   自身の状態（`selectedNoteIds`、`isSelectionMode`）を更新します。
    *   ロジックを`try-catch`ブロックで囲み、エラー発生時に`error:occurred`イベントを発行します。
3.  **`copySelectedNotes`アクションのリファクタリング**:
    *   実際のコピー処理のために`NoteStorageService.copyNotes`呼び出しを保持します。
    *   コピー成功後、`eventBus.emit('notes:bulk-copied', { sourceIds, newNotes })`を発行します。
    *   自身の状態（`selectedNoteIds`、`isSelectionMode`）を更新します。
    *   ロジックを`try-catch`ブロックで囲み、エラー発生時に`error:occurred`イベントを発行します。
4.  **`useNoteStore`への直接依存の削除**:
    *   `useNoteStore.getState().fetchNotes()`のような呼び出しをすべて削除します。
5.  **エラーハンドリング**:
    *   `noteSelectionStore`内のすべての`console.error`呼び出しを`eventBus.emit('error:occurred', { error, context: 'noteSelectionStore' })`に置き換えます。

### 3. `app/store/note/noteDraftStore.ts` のリファクタリング

**目標**: `noteDraftStore`をイベント駆動型に変換し、`note:selected`および`note:updated`イベントに反応し、`draft:saved`および`error:occurred`イベントを発行するようにします。`useNoteStore`への直接的な依存を削除します。

**手順**:
1.  **必要なモジュールのインポート**:
    *   `eventBus`を`../../services/eventBus`からインポートします。
    *   `Note`型を`../../shared/types/note`からインポートします。
    *   `AppError`を`../../utils/AppError`からインポートします。
2.  **イベントリスナーの実装**:
    *   `create`関数内で、以下の`eventBus.on`リスナーを登録します。
        *   `note:selected`: 選択されたノートに基づいて`activeNote`を設定し、`draftNote`を初期化します。
        *   `note:updated`: 更新されたノートが現在アクティブなノートである場合、`draftNote`を更新します。
3.  **`saveDraftNote`アクションのリファクタリング**:
    *   `useNoteStore.getState().updateNote`や`createNote`を直接呼び出す代わりに、イベントを発行します。
        *   既存のノートを更新する場合: `eventBus.emit('note:updated', { note: savedNote })`。
        *   新しいノートを作成する場合: `eventBus.emit('note:created', { note: savedNote })`。
    *   保存後、`eventBus.emit('draft:saved', { note: savedNote })`を発行します。
    *   ロジックを`try-catch`ブロックで囲み、エラー発生時に`error:occurred`イベントを発行します。
4.  **`useNoteStore`への直接依存の削除**:
    *   `useNoteStore.getState().activeNote`、`useNoteStore.getState().updateNote`、`useNoteStore.getState().createNote`への直接呼び出しをすべて削除します。
5.  **エラーハンドリング**:
    *   `noteDraftStore`内のすべての`console.error`呼び出しを`eventBus.emit('error:occurred', { error, context: 'noteDraftStore' })`に置き換えます。

### 4. `app/store/settingsStore.ts` のリファクタリング

**目標**: `settingsStore`をエラー報告のためにイベント駆動型に変換します。

**手順**:
1.  **必要なモジュールのインポート**:
    *   `eventBus`を`../services/eventBus`からインポートします。
    *   `AppError`を`../utils/AppError`からインポートします。
2.  **エラーハンドリング**:
    *   `settingsStore`内のすべての`console.error`呼び出しを`eventBus.emit('error:occurred', { error, context: 'settingsStore' })`に置き換えます。

### 5. `AppError` クラスの作成 (未作成の場合)

**目標**: アプリケーション全体で一貫したエラーハンドリングメカニズムを確保します。

**手順**:
1.  `app/types/index.ts`または`app/types/api.ts`などで`AppError`が既に定義されているか確認します。
2.  定義されていない場合、`app/utils/AppError.ts`に基本的な`AppError`クラスを作成します。
    ```typescript
    // app/utils/AppError.ts
    export class AppError extends Error {
      constructor(message: string, public code?: string, public details?: any) {
        super(message);
        this.name = 'AppError';
      }
    }
    ```
3.  すべてのストアが正しいパスから`AppError`をインポートしていることを確認します。

## 期待される成果
*   各ストアが`EventBus`を介してのみ通信するようになり、直接的な依存関係が解消されます。
*   状態変更の追跡とデバッグが容易になります。
*   各ストアのテスト容易性が向上します。
*   将来的な機能拡張や変更に対する柔軟性が向上します。
