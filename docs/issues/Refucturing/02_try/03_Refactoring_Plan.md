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
- [ ] `shared/types/note.ts`に`Note`型が定義されている
- [ ] `app/services/storageService.ts`から`Note`型のローカル定義が削除されている
- [ ] 全ファイルで`import { Note } from 'shared/types/note'`形式でインポートされている
- [ ] TypeScriptコンパイラがエラーを出さない

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

- [ ] `eventBus.on()`でリスナー登録時、クリーンアップ関数が返される
- [ ] `eventBus.emit()`で発火したイベントが全リスナーに順次配信される
- [ ] リスナー内でエラーが発生した場合、`error:occurred`イベントが発火される（無限ループ防止機構付き）
- [ ] `commandExecutor.execute()`でコマンドが実行され、履歴に追加される
- [ ] `commandExecutor.undo()`で直前のコマンドが取り消される
- [ ] `commandExecutor.redo()`で取り消したコマンドが再実行される

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

### 受け入れ条件

- [x] `noteStore.ts`に他ストアのimport文が存在しない
- [x] `noteSelectionStore.ts`に他ストアのimport文が存在しない
- [ ] `noteDraftStore.ts`に他ストアのimport文が存在しない
- [x] 各ストアがEventBusのリスナーを初期化時に登録している (noteStore.ts, noteSelectionStore.ts 完了)
- [x] ノート作成時：`note:created`イベントで全ストアが正しく更新される (noteStore.ts 完了)
- [x] ノート削除時：`note:deleted`イベントで全ストアが正しく更新される (noteStore.ts 完了)
- [x] 一括操作時：該当イベントで選択状態がクリアされる

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
- Phase 2が完了している
- 全ストアがイベント駆動で動作している

### 実装要件

#### 3.1 useNoteOperationsフックの作成 (`app/hooks/useNoteOperations.ts`)

**必須機能:**
- ストアを直接操作せず、CommandExecutorとEventBusを使用
- 全ての戻り値関数が`useCallback`でメモ化されている

#### 3.2 既存フックのリファクタリング

**対象フック:**
- `useNoteListLogic`
- `useNoteEditor`
- `useLLMCommandHandler`

### 受け入れ条件

- [ ] `useNoteOperations`が全CRUD操作を提供している
- [ ] UIフックからストアアクションの直接呼び出しが削除されている
- [ ] コンポーネントの既存の挙動が維持されている
- [ ] ノート編集時の自動保存が正常に動作する
- [ ] 選択モードでの一括操作が正常に動作する
- [ ] LLMコマンド実行時の状態更新が正常に動作する

### 検証方法
```typescript
// 統合テスト例
// 1. ノート作成
const { createNote } = useNoteOperations();
const note = await createNote({ title: 'Test', content: 'Content' });

// 2. ストアの状態確認
const { notes } = useNoteStore.getState();
expect(notes).toContainEqual(expect.objectContaining({ id: note.id }));
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

## 引き継ぎ (Handover) - 前セッションAIからの申し送り

### 現在の状況

`app/store/note/noteDraftStore.ts` のイベント駆動型リファクタリング (Phase 2) を進行中。

*   `noteStore.ts` および `noteSelectionStore.ts` のリファクタリングは完了し、関連する受け入れ条件は `03_Refactoring_Plan.md` に反映済み。
*   すべての変更は `feature/phase-2-event-driven-stores` ブランチにコミット・プッシュ済み。

### 発生した問題とメタ的な視点

`noteDraftStore.ts` のリファクタリング中に、以下の問題が発生し、AIの内部状態と実際のファイル内容との間に不一致が生じました。

1.  **ファイル内容の不一致**: `read_file` コマンドの出力と、AIが想定しているファイル内容（特に `import { useNoteStore } from './noteStore';` の有無や `subscribeWithSelector` ブロックの閉じ方）との間に、度々食い違いが発生しました。これにより、AIが意図した `replace` 操作が失敗したり、誤った修正を試みたりするループに陥りました。
2.  **構文エラーの修正ループ**: `TS1005: ';' expected.` などの構文エラーが繰り返し発生し、AIがその修正に過度に集中してしまい、本来の論理的なリファクタリングステップから逸脱する原因となりました。ユーザーからの「型エラーは一時的に無視して良い」という指示により、このループは中断されました。

これらの問題は、AIがコードベースの現在の状態を正確に把握し続けることの難しさを示しています。特に、複数の `replace` 操作や外部からの修正が介在する場合に顕著です。

### 次のAIへの指示

1.  **`app/store/note/noteDraftStore.ts` の最新内容を必ず `read_file` で取得し、現在の状態を正確に把握してください。** これが最も重要です。
2.  **以下のリファクタリング計画の残りのステップに集中してください。** 型エラーは一時的に無視し、論理的な変更を優先してください。
    *   **`NoteDraftStoreState` インターフェースの修正**: `activeNoteId: string | null` と `originalDraftContent: DraftNote | null` を追加し、`saveDraftNote` の戻り値の型を `Promise<void>` に変更します。
    *   **`saveDraftNote` アクションのリファクタリング**: `useNoteStore.getState()` への直接呼び出しを、`draft:save-requested` イベントの発行に置き換えます。イベント発行後にドラフトをクリアします。
    *   **`note:selected` イベントリスナーの更新**: ノートが選択されたとき、`activeNoteId` と `originalDraftContent` をストアの状態に設定します。
    *   **`isDraftModified` および `discardDraft` アクションのリファクタリング**: `activeNoteId` と `originalDraftContent` を使用するように変更します。
3.  各論理ステップの完了後、`npm run type-check` を実行して型安全性を確認してください。ただし、エラーが発生しても、それが論理的なリファクタリングの副作用である場合は、次のステップに進んでください。
4.  変更をコミットし、`feature/phase-2-event-driven-stores` ブランチにプッシュすることを忘れないでください。