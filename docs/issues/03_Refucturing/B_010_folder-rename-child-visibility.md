---
filename: B_010_folder-rename-child-visibility
id: 10
status: in-progress
priority: high # A:high | B:medium | C:low
attempt_count: 1
tags: [bug, refactoring, path-management, ui]
---

## 概要 (Overview)

フォルダの名前を変更すると、その配下にある子フォルダや子ノートがUIから消えてしまう問題を解決する。ストレージには正しくデータが保存されているが、UIの表示ロジックとの不整合により表示されない。

## 背景 (Background)

B_009（pathUtilsの廃止）のリファクタリング後、フォルダのリネーム機能に問題が発生した：

- フォルダ名を変更すると、子フォルダ・子ノートがUIから消える
- 名前を元に戻すと、消えていたアイテムが再表示される
- LLMにファイルリストを問い合わせると、消えているファイルも正しく取得できる（ストレージには存在）
- さらに、リネーム後のフォルダを移動させようとすると挙動が不安定になる

これは、`NoteService.updateFolder`でのフォルダ更新と子要素のパス更新のタイミングに問題があり、UIが中間状態の不整合なデータを読み取ってしまうことが原因。

## 実装方針 (Implementation Strategy)

### 短期的対応（現在実施済み・効果なし）
- `NoteService.updateFolder`内で、親フォルダと子要素を一度に更新するように変更
- トランザクション的に保存することで、UIが不整合なデータを読み取らないようにする

### 根本的対応（推奨）
`NoteService`が肥大化しており（400行超）、複雑なパス更新ロジックが混在している。以下のリファクタリングを推奨：

1. **PathUpdateService の新設**
   - フォルダ移動・リネーム時の子要素パス更新ロジックを専用サービスに分離
   - トランザクション管理を明確化

2. **NoteService の分割**
   - NoteService: ノート操作
   - FolderService: フォルダ操作
   - PathUpdateService: パス更新ロジック

3. **更新タイミングの最適化**
   - React Nativeの状態更新と同期する仕組みの検討
   - 更新中フラグの導入でUIの中間読み取りを防止

## 受け入れ条件 (Acceptance Criteria)

- [ ] フォルダ名を変更しても、子フォルダ・子ノートがUIから消えないこと
- [ ] リネーム後のフォルダを移動させても、挙動が安定していること
- [ ] ストレージとUIの表示が常に一致していること
- [ ] ネストが深いフォルダ構造（3階層以上）でも正しく動作すること
- [ ] 既存のノート・フォルダ操作機能に影響がないこと

## 関連ファイル (Related Files)

- `app/screen/note-list/services/noteService.ts` (問題の中心・肥大化)
- `app/screen/note-list/utils/treeUtils.ts` (UIツリー構築ロジック)
- `app/screen/note-list/hooks/useNoteTree.ts` (UI表示フック)
- `app/screen/note-list/noteStorage/folder.ts`
- `app/screen/note-list/noteStorage/index.ts`
- `app/services/PathService.ts`

## 制約条件 (Constraints)

- 既存のデータモデル (`Note`, `Folder` の型定義) は変更しないこと
- AsyncStorageの非同期特性を考慮すること
- パフォーマンスの低下を招かないこと
- React Nativeの状態管理パターンに従うこと

## 開発ログ (Development Log)

---
### 試行 #1 (2025-10-21)

- **試みたこと:**
  - `NoteService.updateFolder`の処理順序を変更（子要素更新 → 親フォルダ更新）
  - さらに、親フォルダと子要素を一度に更新するロジックに変更し、トランザクション的に保存

- **結果:**
  - 型チェックは通過
  - 実機テストでは改善せず、問題が継続

- **メモ:**
  - ストレージには正しくデータが保存されている（LLMが取得可能）
  - UIの`buildTree`関数が、更新中のデータを読み取っている可能性
  - `NoteService`が400行を超え、肥大化している
  - 根本的には、サービス層の分割とトランザクション管理の明確化が必要

---

## AIへの申し送り事項 (Handover to AI)

- **現在の状況:**
  - B_009（pathUtils廃止）のリファクタリングは概ね完了
  - フォルダリネーム時の子要素表示バグが残存
  - `NoteService.updateFolder`でトランザクション的更新を試みたが、効果なし

- **次のアクション:**
  1. `buildTree`関数のデバッグ（いつ、どのデータを読み取っているか）
  2. `useNoteTree`フックの更新タイミングの調査
  3. 必要であれば、NoteServiceのリファクタリング（PathUpdateServiceの分離）

- **考慮事項/ヒント:**
  - AsyncStorageの非同期処理と、React Nativeの状態更新のタイミングが問題の核心
  - `saveAllFolders`と`saveAllNotes`の間にUIが読み取りを行う可能性
  - `useNoteTree`の`fetchItemsAndBuildTree`が`useEffect`で呼ばれるタイミングを確認
  - 更新中フラグや楽観的UI更新の導入も検討価値あり
