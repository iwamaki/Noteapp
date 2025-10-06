**フェーズ1: 共通基盤の構築 (EventBus, CommandExecutor) - 詳細**

このフェーズでは、イベント駆動アーキテクチャの核となる`EventBus`と、Undo/Redo機能の基盤となる`CommandExecutor`を実装します。これらのコンポーネントは、アプリケーション全体の状態管理の疎結合化と予測可能性向上に不可欠です。

### 1. `app/services/eventBus.ts`の新規作成

イベントの発行と購読を管理する中央ハブを構築します。

*   **`AppError`インターフェースの定義**:
    イベントバスを介してエラーを伝播するための標準的なエラーインターフェースを定義します。
    ```typescript
    export interface AppError {
      message: string;
      code?: string;
      statusCode?: number;
      originalError?: any; // 元のエラーオブジェクトを保持する場合
      context?: string;    // エラーが発生したコンテキストを示す場合
    }
    ```
*   **型定義のインポート**:
    *   `Note`型を`../../shared/types/note`からインポートします。
    *   `LLMCommand`、`LLMResponse`型を`../services/llmService`からインポートします。
*   **`EventBus`クラスと`eventBus`インスタンスの実装**:
    提案書（`docs/issues/Refucturing/02_try/02_Refactoring.md`）に記載されている`EventMap`、`EventBus`クラス、および`eventBus`インスタンスを正確に実装します。
    *   `EventMap`には、アプリケーション内で発生する主要なイベントとそのペイロードを定義します。
    *   `EventBus`クラスは、`on`（イベントリスナー登録）、`emit`（イベント発行）、`processQueue`（イベントキュー処理）などのメソッドを持ちます。
    *   イベント処理は順次実行され、予測可能性を確保します。
    *   エラー発生時には`error:occurred`イベントを発行し、エラーハンドリングを一元化します。

### 2. `app/services/commandExecutor.ts`の新規作成

ユーザー操作やシステムイベントを抽象化し、実行履歴を管理するシステムを構築します。

*   **型定義のインポート**:
    *   `Note`型を`../../shared/types/note`からインポートします。
    *   `NoteStorageService`を`../services/storageService`からインポートします。
    *   `eventBus`を`../services/eventBus`からインポートします。
*   **`Command`インターフェース、`UpdateNoteCommand`クラス、`CommandExecutor`クラス、`commandExecutor`インスタンスの実装**:
    提案書（`docs/issues/Refucturing/02_try/02_Refactoring.md`）に記載されている内容を正確に実装します。
    *   `Command`インターフェースは、`execute`、`undo`（任意）、`redo`（任意）メソッドを定義します。
    *   `UpdateNoteCommand`は、ノートの更新操作をカプセル化する具体的なコマンドの例です。`execute`メソッド内で`NoteStorageService`を呼び出し、`eventBus.emit('note:updated', ...)`でイベントを発行します。`undo`メソッドでは、更新前の状態に戻すロジックを実装します。
    *   `CommandExecutor`クラスは、コマンドの実行履歴を管理し、`execute`、`undo`、`redo`メソッドを提供します。これにより、アプリケーションレベルでのUndo/Redo機能の実装が容易になります。
