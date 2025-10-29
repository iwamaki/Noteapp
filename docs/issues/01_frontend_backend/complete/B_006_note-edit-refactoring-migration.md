---
title: "[B]_006_note-editリファクタリング後のコードベースへの段階的移行"
id: 006
status: done
priority: medium
attempt_count: 0
tags: [refactoring, note-edit, migration, architecture]
---

## 概要 (Overview)

note-editフィーチャーのリファクタリングが完了し、新しいアーキテクチャ（Zustand Store、サービス層、リポジトリパターン）が実装されました。既存の`useNoteEditor`フックから新しい`useNoteEditorV2`フックへの段階的な移行を実施します。

## 背景 (Background)

リファクタリングにより以下の新しいアーキテクチャが導入されました：

### 新しい構造
- **types/** - 統一された型定義
- **stores/** - Zustandストア（NoteEditorStore、HistoryManager）
- **services/** - ビジネスロジック層（NoteService、ValidationService、ErrorService）
- **repositories/** - データアクセス層（NoteRepository、AsyncStorageNoteRepository）
- **hooks/** - 単一責任フック（useNoteEditorV2、useAutoSave、useKeyboardShortcuts、useUnsavedChangesWarning）

現在、既存の`useNoteEditor`フックと新しい`useNoteEditorV2`フックが共存していますが、以下の理由から段階的に移行する必要があります：

1. **保守性の向上** - 責任が明確で理解しやすいコード
2. **テスタビリティ** - 各層を独立してテスト可能
3. **拡張性** - 新機能の追加が容易
4. **一貫性** - 統一されたパターンによるコード品質向上

## 実装方針 (Implementation Strategy)

### フェーズ1: NoteEditScreenの移行
1. `NoteEditScreen.tsx`を`useNoteEditorV2`に切り替え
2. 既存の動作を維持しながら、新しいフックのインターフェースに適合
3. 未保存変更の警告ロジックを新しいアーキテクチャに統合

### フェーズ2: 関連コンポーネントの調整
1. `NoteEditHeader`コンポーネントを新しいストアに対応
2. `FileEditor`などの子コンポーネントのインターフェース調整
3. エラー表示を新しい`ErrorService`に統合

### フェーズ3: 旧コードのクリーンアップ
1. `useNoteEditor`フックの削除（互換性確認後）
2. `useContentHistory`フックの削除（HistoryManagerに置き換え済み）
3. 未使用のインポートやコードの削除

### フェーズ4: テストとドキュメント
1. 新しいアーキテクチャのユニットテスト追加
2. 統合テストの実施
3. README.mdの更新（移行完了を反映）

## 受け入れ条件 (Acceptance Criteria)

- [ ] `NoteEditScreen.tsx`が`useNoteEditorV2`を使用している
- [ ] すべての既存機能が正常に動作する（保存、Undo/Redo、未保存警告など）
- [ ] 型チェックが通る（`npm run type-check`がエラーなし）
- [ ] Lintが通る（`npm run lint`がエラーなし）
- [ ] 旧`useNoteEditor`フックが削除されている
- [ ] 旧`useContentHistory`フックが削除されている
- [ ] エラーハンドリングが新しい`ErrorService`を使用している
- [ ] 手動テストで以下を確認：
  - [ ] ノートの新規作成
  - [ ] 既存ノートの読み込み
  - [ ] ノートの編集と保存
  - [ ] Undo/Redo機能
  - [ ] タイトル変更
  - [ ] ワードラップ切り替え
  - [ ] 未保存変更の警告表示
  - [ ] キーボードショートカット（Webのみ）

## 関連ファイル (Related Files)

### 移行対象
- `app/screen/note-edit/NoteEditScreen.tsx` - メイン画面
- `app/screen/note-edit/hooks/useNoteEditHeader.tsx` - ヘッダーフック

### 削除対象
- `app/screen/note-edit/hooks/useNoteEditor.tsx` - 旧フック
- `app/screen/note-edit/hooks/useContentHistory.tsx` - 旧履歴管理フック

### 新しいアーキテクチャ（参照用）
- `app/screen/note-edit/hooks/useNoteEditorV2.tsx` - 新しい統合フック
- `app/screen/note-edit/stores/NoteEditorStore.ts` - Zustandストア
- `app/screen/note-edit/stores/HistoryManager.ts` - 履歴管理
- `app/screen/note-edit/services/NoteService.ts` - ビジネスロジック
- `app/screen/note-edit/services/ValidationService.ts` - バリデーション
- `app/screen/note-edit/services/ErrorService.ts` - エラー処理
- `app/screen/note-edit/repositories/AsyncStorageNoteRepository.ts` - データアクセス

## 制約条件 (Constraints)

1. **後方互換性** - 既存のノートデータが正常に読み込めること
2. **動作の一貫性** - 既存の動作を完全に維持すること
3. **パフォーマンス** - 新しいアーキテクチャによる性能劣化がないこと
4. **型安全性** - すべての型チェックが通ること
5. **コード品質** - Lintエラーがないこと
6. **段階的移行** - 一度にすべてを変更せず、段階的に移行すること

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:** リファクタリング完了、新しいアーキテクチャの実装
- **結果:**
  - ✅ types/、stores/、services/、repositories/ の実装完了
  - ✅ useNoteEditorV2フックの実装完了
  - ✅ 型チェック通過
  - ✅ Lint通過
  - ✅ @design/*パスエイリアス追加
  - ✅ README.md作成
- **メモ:**
  - 新しいアーキテクチャは完成したが、まだNoteEditScreen.tsxでは使用されていない
  - 既存のuseNoteEditorフックが引き続き使用中
  - 次は実際の移行作業が必要

---

## AIへの申し送り事項 (Handover to AI)

### 現在の状況
- リファクタリング完了：新しいアーキテクチャ（Zustand Store、サービス層、リポジトリパターン）がすべて実装済み
- 型チェック・Lint：すべてのチェックが通過
- ドキュメント：README.mdに包括的な使用方法を記載
- **現在のNoteEditScreen.tsx**：まだ旧`useNoteEditor`フックを使用中

### 次のアクション

#### Step 1: NoteEditScreen.tsxの移行
1. `NoteEditScreen.tsx`を開く
2. `useNoteEditor`から`useNoteEditorV2`にインポートを変更
3. フックの返り値のインターフェースを調整（必要に応じて）
4. 未保存変更の警告ロジックを確認（`useUnsavedChangesWarning`が既に含まれているため、重複を避ける）

#### Step 2: 動作確認
1. アプリを起動して手動テスト
2. 新規ノート作成、既存ノート編集、保存、Undo/Redoなどの動作を確認
3. エラーが発生した場合は、コンソールログを確認して修正

#### Step 3: クリーンアップ
1. 動作確認が完了したら、旧`useNoteEditor.tsx`を削除
2. 旧`useContentHistory.tsx`を削除
3. 未使用のインポートを削除

### 考慮事項/ヒント

1. **handleSave関数**: 旧フックでは`handleSave`という名前だったが、新フックでは`save`という名前。エイリアスを使うか、呼び出し箇所を修正する必要がある。
   ```typescript
   // 例
   const { save: handleSave } = useNoteEditorV2(noteId);
   ```

2. **canUndo/canRedo**: 新フックでは関数ではなく、直接の値として返される（すでに計算済み）。

3. **viewMode**: 新ストアに`viewMode`と`setViewMode`が含まれているので、ローカルstateから移行可能。

4. **未保存警告**: 新フックの`useUnsavedChangesWarning`が既に含まれているが、NoteEditScreen.tsxの既存の`beforeRemove`リスナーと競合する可能性がある。重複を避けるため、どちらか一方を使用すること。

5. **エラーハンドリング**: 新しい`ErrorService`を使ってエラーを統一的に処理することを推奨。

6. **参考**: `app/screen/note-edit/README.md`に詳細な使用例とAPIドキュメントがあります。

### 推奨される実装順序
1. まず`NoteEditScreen.tsx`のインポートと基本的なフックの切り替え
2. 動作確認（保存、編集など）
3. 未保存警告ロジックの統合
4. 型チェック・Lintの確認
5. 旧コードの削除

この順序で進めることで、問題が発生した場合に素早くロールバックできます。
