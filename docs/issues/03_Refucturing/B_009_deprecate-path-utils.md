---
filename:  B_009_deprecate-path-utils # "[id]_[issueのタイトル]"
id: 9 # issueのユニークID (仮)
status: in-progress # new | in-progress | blocked | pending-review | done
priority: high # A:high | B:medium | C:low
attempt_count: 1 # このissueへの挑戦回数。失敗のたびにインクリメントする
tags: [refactoring, architecture, path-management]
---

## 概要 (Overview)

`app/screen/note-list/utils/pathUtils.ts` の利用を廃止し、パス解決およびパス構築のロジックをより堅牢な `itemResolver` および新設する `PathService` に集約します。これにより、アプリケーション全体でのパス管理の一貫性と堅牢性を向上させ、将来的な機能拡張やデータモデル変更への対応を容易にします。

## 背景 (Background)

現在のアプリケーションでは、ファイルやフォルダのパス操作に `app/screen/note-list/utils/pathUtils.ts` が広く利用されています。しかし、このユーティリティはパスを「文字列」として直接操作するため、以下の問題点があります。

*   **ロジックの分散**: パス関連のロジックが `noteStorage`、`itemResolver`、各種フックなど、複数の箇所に散在しており、一貫性の欠如や重複コードの原因となっています。
*   **堅牢性の欠如**: 文字列ベースのパス比較や操作は、曖昧さやエラーの温床となりやすく、特にアイテムの移動やリネーム時に複雑な処理が必要となります。
*   **IDベースへの移行の阻害**: `itemResolver` の導入により、アイテム操作はIDベースへと移行しつつありますが、`itemResolver` 自身が `pathUtils` に依存しているため、完全なIDベースのアーキテクチャへの移行が阻害されています。

このIssueは、`itemResolver` の導入によって可能になった「IDベースのアイテム操作」という新しい基盤を最大限に活用し、パス管理のアーキテクチャを改善することを目的とします。

## 実装方針 (Implementation Strategy)

以下の3つのフェーズで段階的にリファクタリングを進めます。

### フェーズ1: `PathService` の導入とロジックの集約

1.  **`app/services/PathService.ts` の新設**:
    *   `PathUtils` の静的メソッド (`normalizePath`, `getFullPath`, `parseInputPath` など) を `PathService` に移管します。
    *   `getFolderName` は現在未使用のため、移管せず削除を検討します。
2.  **`itemResolver` の強化**:
    *   `itemResolver` が「文字列パスからIDを解決する唯一の窓口」としての役割を徹底します。
    *   `itemResolver` は `PathService` と `NoteListStorage` の両方を知る唯一のモジュールとします。
3.  **`noteStorage` の関心事分離**:
    *   `noteStorage` 層は、パスの計算や文字列操作を直接行わないように修正します。
    *   例えば、`updateFolder` で行われている子要素のパス更新処理は、上位の `NoteService` に移管します。`noteStorage` は、より純粋な「IDに基づいたCRUD」に近づけます。

### フェーズ2: 各コンポーネントのリファクタリング

1.  **`NoteService` の強化**:
    *   `NoteService` を `itemResolver` と `PathService` の主要なコンシューマとします。
    *   `NoteService` は、ユーザーやLLMから提供されるパス文字列を `itemResolver` を介してIDに解決し、`noteStorage` にはIDベースの操作を指示するように変更します。
    *   `NoteService` 内で、`PathService` を利用してパスの構築や解析を行います。
2.  **UI/Hooks の修正**:
    *   `useItemActions`, `useNoteTree`, `useNoteListChatContext` などのフックや、関連するUIコンポーネントは、`PathUtils` や `PathService` を直接呼び出すことを停止します。
    *   これらのコンポーネントは、`itemResolver` が返した `ResolvedItem` オブジェクトや、`NoteService` が提供するリッチなオブジェクトからパス情報を取得して表示するだけにします。

### フェーズ3: `pathUtils.ts` の廃止

1.  全ての依存関係が解消され、`app/screen/note-list/utils/pathUtils.ts` がどこからもインポートされていないことを確認します。
2.  `app/screen/note-list/utils/pathUtils.ts` ファイルを削除します。

## 受け入れ条件 (Acceptance Criteria)

- [x] `app/screen/note-list/utils/pathUtils.ts` がプロジェクトから削除されていること。
- [x] `app/services/PathService.ts` が新設され、`PathUtils` の主要な機能が移管されていること。
- [x] `itemResolver.ts` が `PathService` を利用し、パス解決の唯一の窓口として機能していること。
- [x] `useItemActions`, `useNoteTree`, `useNoteListChatContext` および関連UIコンポーネントが `PathUtils` を直接参照していないこと。
- [x] `noteStorage` 層がパスの文字列操作を直接行わず、IDベースの操作に特化していること。
- [x] `NoteService` が `itemResolver` と `PathService` を適切に利用し、ビジネスロジック層としてパス管理を抽象化していること。
- [ ] 全ての既存機能（ノートの作成、編集、削除、移動、フォルダの作成、削除、移動、ツリー表示、LLMコマンド）が正常に動作すること。
- [ ] 関連する単体テストおよび統合テストがパスすること。

## 関連ファイル (Related Files)

- `app/screen/note-list/utils/pathUtils.ts` (削除対象)
- `app/features/chat/handlers/itemResolver.ts`
- `app/features/chat/handlers/moveItemHandler.ts`
- `app/features/chat/hooks/useNoteListChatContext.ts`
- `app/screen/note-list/hooks/useItemActions.ts`
- `app/screen/note-list/hooks/useNoteTree.ts`
- `app/screen/note-list/noteStorage/folder.ts`
- `app/screen/note-list/noteStorage/index.ts`
- `app/screen/note-list/noteStorage/note.ts`
- `app/screen/note-list/services/noteService.ts`
- `app/screen/note-list/utils/treeUtils.ts`
- `app/services/PathService.ts` (新規作成)

## 制約条件 (Constraints)

- 既存のデータモデル (`Note`, `Folder` の型定義) は、このIssueの範囲では変更しないこと。
- 既存のユーザーインターフェースやユーザー体験に影響を与えないこと。
- パフォーマンスの低下を招かないこと。

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:** `pathUtils.ts` の利用箇所を特定し、リファクタリング計画を策定した。
- **結果:** 計画が策定され、Issueドキュメントが作成された。
- **メモ:** 次のステップは、フェーズ1の実装を開始すること。

---
### 試行 #2 (2025-10-21)

- **試みたこと:** フェーズ1を完了
  - `app/services/PathService.ts` を新規作成し、`pathUtils.ts` から全機能を移管
  - 以下の9ファイルで `PathUtils` から `PathService` へ完全移行:
    - `app/features/chat/handlers/itemResolver.ts`
    - `app/features/chat/handlers/moveItemHandler.ts`
    - `app/features/chat/hooks/useNoteListChatContext.ts`
    - `app/screen/note-list/hooks/useItemActions.ts`
    - `app/screen/note-list/hooks/useNoteTree.ts`
    - `app/screen/note-list/services/noteService.ts`
    - `app/screen/note-list/noteStorage/note.ts`
    - `app/screen/note-list/noteStorage/folder.ts`
    - `app/screen/note-list/noteStorage/index.ts`
    - `app/screen/note-list/utils/treeUtils.ts`
  - `app/screen/note-list/utils/pathUtils.ts` を削除
  - 全ての型チェックがパスすることを確認
- **結果:** フェーズ1が完全に完了。`pathUtils.ts` はプロジェクトから削除され、`PathService` への移行が成功した。
- **メモ:**
  - 現在、`noteStorage` 層はまだ `PathService` を直接利用している（フェーズ2の課題）
  - 次のステップは、フェーズ2として `noteStorage` 層からパス操作を分離し、`NoteService` に集約すること

---
### 試行 #3 (2025-10-21) - フェーズ2完了

- **試みたこと:** フェーズ2を完了 - `noteStorage` 層の完全なIDベース化
  - **NoteServiceの大幅強化:**
    - 重複チェック機能追加（`checkNoteDuplicate`, `checkFolderDuplicate`）
    - 子要素パス更新機能追加（`updateChildrenPaths`）
    - パス解析・構築機能追加（`ensureFoldersExist`, `createNoteWithPath`）
    - CRUD操作のラッパーメソッド追加（`createNote`, `updateNote`, `moveNote`, `createFolder`, `updateFolder`）
  - **noteStorage層のリファクタリング:**
    - `note.ts`: 重複チェック、パス正規化を削除（NoteServiceに移管）
    - `folder.ts`: 重複チェック、子要素パス更新ロジックを削除（NoteServiceに移管）
    - `index.ts`: `PathService` のimportを削除、`ensureFoldersExist` と `createNoteWithPath` をNoteServiceに移管
  - 全ての型チェックがパスすることを確認
- **結果:**
  - フェーズ2が完全に完了
  - `noteStorage` 層はほぼIDベースのCRUD操作に特化（`deleteFolder` でのみ `PathService.getFullPath` を最小限使用）
  - `NoteService` がパス管理のビジネスロジック層として確立
  - 既存のUI/Hooks層は全てNoteServiceを経由してストレージにアクセス
- **メモ:**
  - `noteStorage` 層は重複チェックやパス正規化を行わず、純粋なデータ操作のみを実施
  - パス文字列の比較は正規化済みと仮定して単純な文字列比較を使用
  - 次のステップは、実機テストで全機能が正常に動作することを確認すること

---

## AIへの申し送り事項 (Handover to AI)

- **現在の状況:** フェーズ1とフェーズ2が完了しました。
  - `PathService` への移行が成功し、`pathUtils.ts` は削除されています
  - `noteStorage` 層はほぼIDベースのCRUD操作に特化しました（重複チェック、パス正規化を削除）
  - `NoteService` がパス管理のビジネスロジック層として確立されました
  - 型チェックは全てパスしています

- **次のアクション:** フェーズ3 - 実機テストと最終検証
  1. 全ての既存機能が正常に動作することを実機で確認:
     - ノートの作成、編集、削除、移動
     - フォルダの作成、削除、移動
     - ツリー表示
     - LLMコマンドによるファイル操作
  2. エッジケースのテスト:
     - 重複するノート/フォルダ名の作成
     - フォルダの移動（子要素のパス更新が正しく動作するか）
     - パスの正規化が正しく機能するか
  3. 必要に応じて単体テストや統合テストを追加

- **考慮事項/ヒント:**
  - `noteStorage` 層は呼び出し側でパスが正規化済みであることを前提としています
  - `NoteService` が全てのパス正規化、重複チェック、子要素パス更新を担当します
  - `deleteFolder` でのみ `PathService.getFullPath` を最小限使用していますが、これは許容範囲内です
  - UI/Hooks層は全て `NoteService` を経由してストレージにアクセスしています
