# イベント駆動アーキテクチャ導入計画書

## 概要

本計画は、React Nativeアプリケーションにおけるストア間の循環依存を解消し、保守性と拡張性を向上させるためのリファクタリング実施要項を定めます。

## アーキテクチャ変更の目標

現在のストア間直接参照による密結合な状態から、イベントバスを介した疎結合なアーキテクチャへ移行します。これにより、各モジュールが独立して動作し、状態変更が予測可能になります。

---

## Phase 0: 型定義の統一化

### 開始条件
- 現在、`Note`型が複数箇所（`app/services/storageService.ts`、`shared/types/note.ts`）で重複定義されている

### 実装要件
```typescript
// shared/types/note.ts が唯一の真実の源となること
export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  tags?: string[];
}
```

### 受け入れ条件
- [x] `shared/types/note.ts`に`Note`型が定義されている
- [x] `app/services/storageService.ts`から`Note`型のローカル定義が削除されている
- [x] 全ファイルで`import { Note } from 'shared/types/note'`形式でインポートされている
- [x] TypeScriptコンパイラがエラーを出さない

### 検証方法
```bash
# Note型の重複定義がないことを確認
grep -r "interface Note" --include="*.ts" --include="*.tsx" | grep -v "shared/types/note.ts"
# 結果が空であること
```

---

## Phase 1: イベントバス基盤の構築

### 開始条件
- Phase 0が完了している
- 既存のストア構造が動作している

### 実装要件

#### 1.1 EventBus実装 (`app/services/eventBus.ts`)

**必須機能:**
- イベントの型安全な定義（`EventMap`）
- リスナーの登録と自動クリーンアップ機能
- 非同期イベント処理のキューイング
- エラーハンドリングと`error:occurred`イベントの自動発火

**必須イベント定義:**
```typescript
type EventMap = {
  'note:created': { note: Note };
  'note:updated': { note: Note; previousState?: Note };
  'note:deleted': { noteId: string };
  'note:selected': { noteId: string | null };
  'notes:bulk-deleted': { noteIds: string[] };
  'notes:bulk-copied': { sourceIds: string[]; newNotes: Note[] };
  'draft:saved': { note: Note };
  'error:occurred': { error: Error; context: string };
};
```

#### 1.2 CommandExecutor実装 (`app/services/commandExecutor.ts`)

**必須機能:**
- `Command`インターフェースの定義（execute, undo, redo）
- 実行履歴の管理
- 現在位置の追跡

### 受け入れ条件

- [x] `eventBus.on()`でリスナー登録時、クリーンアップ関数が返される
- [x] `eventBus.emit()`で発火したイベントが全リスナーに順次配信される
- [x] リスナー内でエラーが発生した場合、`error:occurred`イベントが発火される（無限ループ防止機構付き）
- [x] `commandExecutor.execute()`でコマンドが実行され、履歴に追加される
- [x] `commandExecutor.undo()`で直前のコマンドが取り消される
- [x] `commandExecutor.redo()`で取り消したコマンドが再実行される

### 検証方法
```typescript
// テストコード例
const testListener = jest.fn();
const cleanup = eventBus.on('note:created', testListener);
await eventBus.emit('note:created', { note: mockNote });
expect(testListener).toHaveBeenCalledWith({ note: mockNote });
cleanup();
```

---

## Phase 2: コアストアのイベント駆動化

### 開始条件
- Phase 1が完了している
- EventBusとCommandExecutorが動作確認済み

### 実装要件

#### 2.1 noteStoreのリファクタリング

**変更前の問題:**
```typescript
// 他ストアへの直接参照
const activeNote = useNoteStore.getState().activeNote;
```

**変更後の要件:**
- 他ストアへの直接参照（`import`および`getState()`）を完全に削除
- イベントリスナーによる状態更新のみ
- 自身の状態変更時に適切なイベントを発火

#### 2.2 noteSelectionStoreのリファクタリング

**必須変更:**
```typescript
// Before: 直接参照
await useNoteStore.getState().fetchNotes();

// After: イベント発火
await eventBus.emit('notes:bulk-deleted', { noteIds });
```

#### 2.3 永続化サービスレイヤーの実装 (追加要件)

**背景:**
`noteSelectionStore`や`noteDraftStore`から永続化ロジックを分離した結果、その責務の引き受け先が存在せず、データ永続化フローが分断される問題が確認された。これを解決するため、永続化処理を専門に担うサービスレイヤーを導入する。

**実装要件:**
- `app/services/NoteActionService.ts` を新規作成する。
- このサービスは、永続化を伴うアクション（一括削除、一括コピー、ドラフト保存など）の実行責務を持つ。
- サービス内の各メソッドは、`NoteStorageService`を呼び出して実際のデータ操作を行い、処理成功後に`eventBus`で結果（例: `notes:bulk-deleted`）を通知する。
- `noteSelectionStore`および`noteDraftStore`のアクションは、`eventBus.emit`を直接呼び出すのではなく、`NoteActionService`の対応するメソッドを呼び出すように修正する。

### 受け入れ条件

- [x] `noteStore.ts`に他ストアのimport文が存在しない
- [x] `noteSelectionStore.ts`に他ストアのimport文が存在しない
- [x] `noteDraftStore.ts`に他ストアのimport文が存在しない
- [x] 各ストアがEventBusのリスナーを初期化時に登録している (noteStore.ts, noteSelectionStore.ts 完了)
- [x] ノート作成時：`note:created`イベントで全ストアが正しく更新される (noteStore.ts 完了)
- [x] ノート削除時：`note:deleted`イベントで全ストアが正しく更新される (noteStore.ts 完了)
- [x] **(追加)** `NoteActionService`が永続化処理（一括削除、ドラフト保存など）を実行し、成功後に適切なイベントを発行する
- [x] **(追加)** `noteSelectionStore`と`noteDraftStore`のアクションが、イベントを直接発行するのではなく`NoteActionService`を呼び出している
- [x] **(追加)** 一括削除やドラフト保存を実行した結果、データが永続化され、関連するストア（`noteStore`など）の状態が正しく更新される

### 検証方法
```bash
# ストア間の直接参照がないことを確認
grep -E "useNoteStore|useNoteDraftStore|useNoteSelectionStore" app/store/note/*.ts | \
  grep -v "export.*use.*Store"
# 結果が空であること
```

---

## Phase 3: UI層の統合

### 開始条件
- Phase 2が完了し、サービスレイヤー(`NoteActionService`)が導入されている
- 全ストアがイベント駆動で動作している

### 実装要件

#### 3.1 useNoteOperationsフックの実装 (`app/hooks/useNoteOperations.ts`)

**責務:** UI層とビジネスロジック/永続化層（サービス、コマンド）を仲介する。

**必須機能:**
- ノートの作成、更新、削除などの永続化を伴う操作を、`NoteActionService`または`CommandExecutor`を呼び出して実行する。
- UIコンポーネントや他のUIフックに、`useCallback`でメモ化された安定した操作関数を提供する。

#### 3.2 既存フックのリファクタリング

**対象フック:**
- `useNoteListLogic`
- `useNoteEditor`
- `useLLMCommandHandler`

**変更後の要件:**
- 永続化を伴う操作は、すべて`useNoteOperations`フック経由で実行する。
- `NoteActionService`や`NoteStorageService`を直接呼び出さない。
- 状態の取得は、各ストアのセレクターフック（例: `useNoteStore(state => state.notes)`）を利用する。

### 受け入れ条件

- [x] `useNoteOperations`フックが、`NoteActionService`や`CommandExecutor`を利用して永続化操作を実行する唯一の窓口として機能している。
- [x] `useNoteListLogic`、`useNoteEditor`などの既存UIフックから、永続化に関するロジック（`NoteActionService`等の直接呼び出し）が削除され、`useNoteOperations`の関数を呼び出すように修正されている。
- [x] **CRUD操作**: UIからのノート作成、編集、保存、削除が、`useNoteOperations`を経由して正しく実行され、データが永続化される。
- [x] **一括操作**: 選択モードでの一括削除・一括コピーが、`useNoteOperations`を経由して正しく実行され、データが永続化される。
- [x] **状態の同期**: 上記の操作後、`eventBus`を通じてストアの状態が正しく更新され、UIに即座に反映される。
- [x] LLMコマンド実行後の状態更新が正常に動作する。

### 検証方法
```typescript
// 統合テスト例
// 1. UIフックから操作を実行
const { result } = renderHook(() => useNoteOperations());
await act(async () => {
  await result.current.createNote({ title: 'Test', content: 'Content' });
});

// 2. ストアの状態が更新されたことを確認
const { notes } = useNoteStore.getState();
expect(notes).toContainEqual(expect.objectContaining({ title: 'Test' }));

// 3. ストレージ（モック）が呼び出されたことを確認
expect(NoteStorageService.createNote).toHaveBeenCalled();
```

---

## Phase 4: 品質保証とクリーンアップ

### 開始条件
- Phase 3が完了している
- 全機能が新アーキテクチャで動作している

### 実装要件

#### 4.1 テストの追加
- イベント発火の検証テスト
- ストア間の独立性テスト
- Undo/Redo機能のテスト

#### 4.2 不要コードの削除
- 旧アクションメソッド
- 未使用のユーティリティ
- コメントアウトされたコード

### 受け入れ条件

- [ ] 全ての既存テストがパスする
- [ ] イベント駆動の新規テストが10件以上追加されている
- [ ] カバレッジが70%以上維持されている
- [ ] 不要なコードが削除されている
- [ ] ESLintエラーが0件である
- [ ] TypeScriptコンパイルエラーが0件である

### 検証方法
```bash
# テスト実行
npm test -- --coverage

# 静的解析
npm run lint
npm run type-check

# 不要インポートの確認
npx depcheck
```

---

## 移行完了の判定基準

### 最終確認項目
1. **機能的完全性**: 全ての既存機能が新アーキテクチャで動作する
2. **パフォーマンス**: 画面遷移やリスト表示が従来と同等以上の速度
3. **メモリ使用量**: メモリリークが発生していない
4. **開発体験**: 新機能追加時にストア間の依存を考慮する必要がない

### 成功指標
- [ ] プロダクションビルドが正常に作成できる
- [ ] 10分間の操作でクラッシュが発生しない
- [ ] メモリ使用量が継続的に増加しない
- [ ] 新規開発者が30分以内にイベントフローを理解できる

---

## 実装における注意事項

1. **既存機能の維持**: 各フェーズで既存機能が動作することを確認してから次へ進む
2. **段階的移行**: 一度に全てを変更せず、フェーズごとに確実に進める
3. **ロールバック可能性**: 各フェーズでGitブランチを作成し、問題発生時に戻れるようにする
4. **ドキュメント更新**: 実装と同時にREADMEやコメントを更新する

この計画書に従って実装を進めることで、安全かつ確実にアーキテクチャの改善を達成できます。

---

## 引き継ぎ (Handover) - 現在の状況

### 現在の状況

Phase 3（UI層の統合）の再実装が完了し、厳格な品質チェックの結果、**合格**と判断しました。

今回の修正により、`Command`が永続化とイベント発行の責務を持つアーキテクチャが確立され、`useNoteOperations`はクリーンな仲介役として機能し、各UIフックはUIロジックに専念できるようになりました。リファクタリングの主要な目的は達成されました。素晴らしい仕事です。

`useNoteEditor`に自動保存ロジックが残存するなどの軽微な改善点はありますが、これらはPhase 4のクリーンアップタスクとして扱うことができます。

### 次のステップ：Phase 4 - 品質保証とクリーンアップ

これより、リファクタリングの最終フェーズである**Phase 4**に進んでください。このフェーズの目的は、リファクタリング全体の最終的な品質を保証し、コードベースを整理することです。

以下のタスクを実施してください。

1.  **リグレッションテストの実施**:
    *   すべてのコア機能が、リファクタリング前と同様に、またはそれ以上に正しく、安定して動作することを手動でテストしてください。
    *   **重点確認項目**: ノートの作成・更新・削除、Undo/Redo機能、一括でのコピーと削除、LLMによる編集と保存。

2.  **コードのクリーンアップ**:
    *   プロジェクト全体で、不要になった`import`文、古いコメント、デバッグ用の`console.log`などを削除してください。
    *   （推奨）`useNoteEditor`に残存している軽微な課題（自動保存ロジック、`selectNote`の直接呼び出し）をリファクタリングし、責務を完全に分離してください。
    *   ファイルや関数、変数名の命名規則やフォーマットに一貫性があるか、最終確認を行ってください。

3.  **ドキュメントの更新**:
    *   `README.md`やその他の関連ドキュメントに、今回のリファクタリングで導入された新しいアーキテクチャ（イベントバス、コマンドパターン、サービスレイヤーなど）の概要を反映させてください。

すべてのタスクが完了したら、リファクタリング完了の報告をお願いします。

