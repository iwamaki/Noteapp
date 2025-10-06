--- Content from referenced files ---
Content from @/home/iwash/02_Repository/Noteapp/docs/issues/Refucturing/02_try/03_Refactoring_Plan.md:
**イベント駆動アーキテクチャ導入によるストア間依存解消計画**

**目的:**
アプリケーション内のストア間の直接的な依存関係を解消し、より柔軟で保守しやすい状態管理システムを構築します。これにより、状態変更の予測可能性を高め、デバッグを容易にし、将来的な機能追加や変更への対応力を向上させます。

**主要な変更点:**

*   **イベントバスシステムの導入:** アプリケーション全体でイベントの発行と購読を管理する中央ハブを設けます。これにより、各ストアは直接通信するのではなく、イベントを介して間接的に連携するようになります。
*   **コマンド実行管理システムの導入:** ユーザー操作やシステムイベントによってトリガーされるアクションを「コマンド」として抽象化し、その実行と管理を一元化するシステムを導入します。これにより、Undo/Redoのような機能の実装も容易になります。
*   **既存ストアのリファクタリング:** ノート関連の既存ストア（`noteStore`や`noteSelectionStore`など）を、イベントバスと連携するように変更します。ストア間の直接的な参照を排除し、イベントの発行と購読を通じて状態を同期させます。
*   **ノート操作フックの導入:** ノートの作成、更新、削除といった主要な操作を抽象化し、コンポーネントから簡単に利用できる新しいカスタムフックを導入します。

**参照ファイル:**

*   `docs/issues/Refucturing/02_try/02_Refactoring.md` (提案書)
*   `app/store/note/noteStore.ts` (既存のノートストア)
*   `app/store/note/noteSelectionStore.ts` (既存のノート選択ストア)
*   `app/store/note/noteDraftStore.ts` (既存のドラフトノートストア)
*   `app/store/settingsStore.ts` (既存の設定ストア)
*   `app/services/storageService.ts` (ノートの永続化サービス)
*   `app/services/llmService.ts` (LLMサービス)
*   `shared/types/note.ts` (共有ノート型定義)
*   `app/features/note-edit/NoteEditScreen.tsx` (ノート編集画面)
*   `app/features/note-list/NoteListScreen.tsx` (ノートリスト画面)
*   `app/navigation/RootNavigator.tsx` (ルートナビゲーター)
*   `app/features/note-edit/hooks/useNoteEditor.ts` (ノートエディターフック)
*   `app/features/note-list/hooks/useNoteListLogic.ts` (ノートリストロジックフック)

**フェーズ概要:**

*   **フェーズ0: 型定義の修正**
    *   **概要**: `shared/types/note.ts`の`Note`インターフェースに`tags?: string[];`を追加し、`app/services/storageService.ts`の`Note`インターフェースとの整合性を確保しました。詳細については、`docs/issues/Refucturing/02_try/04_Phase0_Type_Correction.md`を参照してください。
*   **フェーズ1: 共通基盤の構築 (EventBus, CommandExecutor)**
    *   **概要**: イベント駆動アーキテクチャの核となる`EventBus`と、Undo/Redo機能の基盤となる`CommandExecutor`を実装します。詳細については、`docs/issues/Refucturing/02_try/03_Refactoring_Plan_Phase1_Details.md`を参照してください。
*   **フェーズ2: ストアのリファクタリング**
    *   **概要**: `noteStore`、`noteSelectionStore`、`noteDraftStore`、`settingsStore`をイベント駆動型アーキテクチャに移行し、`EventBus`と連携するようにリファクタリングします。これにより、ストア間の直接的な依存関係を解消し、疎結合な状態管理を実現します。詳細については、`docs/issues/Refucturing/02_try/03_Refactoring_Plan_Phase2_Details.md`を参照してください。
*   **フェーズ3: フックの導入と更新**
    *   **概要**: `useNoteOperations`フックを新規作成し、`useNoteEditor.tsx`と`useNoteListLogic.ts`をリファクタリングして、EventBusとCommandExecutorを利用するように変更し、ストアへの直接的な依存関係を解消します。
    *   **重要事項**: `app/services/eventBus.ts`および`app/services/commandExecutor.ts`ファイルがコードベースに存在しないことが確認されました。フェーズ3の実施前にこれらのファイルが実装される必要があります。
    *   **詳細**: `docs/issues/Refucturing/02_try/03_Refactoring_Plan_Phase3_Details.md`を参照してください。
*   **フェーズ4: 既存コードの調整とクリーンアップ**
    *   **概要**: `app/services/storageService.ts`からローカルの`Note`インターフェース定義を削除し、`../../shared/types/note`からインポートするように調整します。また、`app/services/llmService.ts`の`LLMError`クラスが`AppError`と統合されていないことを確認し、既存のテストを実行してリファクタリングによる影響がないことを検証します。
    *   **詳細**: `docs/issues/Refucturing/02_try/03_Refactoring_Plan_Phase4_Details.md`を参照してください。

**期待される効果:**

*   **疎結合化:** 各モジュールやストアが独立性を保ち、変更が他の部分に与える影響を最小限に抑えます。
*   **予測可能性の向上:** イベントの流れを追うことで、アプリケーションの状態変化をより明確に理解できるようになります。
*   **テスト容易性の向上:** 各コンポーネントやストアを独立してテストしやすくなります。
*   **拡張性の確保:** 新しい機能やストアを追加する際に、既存のコードベースへの影響を最小限に抑え、柔軟な拡張が可能になります。

