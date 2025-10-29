---
title: "B_002_Refactor NoteList Tree Handling for Maintainability and Extensibility"
id: 002
status: done
priority: medium
attempt_count: 0
tags: [refactoring, frontend, note-list, tree-structure]
---

## 概要 (Overview)

`app/screen/note-list/` フォルダ内のツリー構造の取り扱いに関するコードの保守性と拡張性を向上させます。特に、`currentPath` の一貫性のない使用と、ツリーノード検索の効率性を改善します。

## 背景 (Background)

現在の `NoteListScreen` および関連するフック (`useNoteList`, `useNoteTree`) では、ツリー構造の構築とナビゲーションパス (`currentPath`) の扱いにいくつかの改善点が見られます。

1.  `useNoteList.ts` の `openRenameModal` では、リネーム対象のアイテムを検索するためにツリー全体をフラット化しており、非効率的です。
2.  `useNoteTree.ts` の `buildTree` は `currentPath` を受け取りますが、常にファイルシステム全体のツリーを構築しており、`currentPath` の意図が不明瞭です。また、`items` ステートの存在も冗長である可能性があります。
3.  `currentPath` が表示されるフォルダを定義する意図がある場合、`treeNodes` はそのパスのコンテンツのみを反映すべきですが、現状ではグローバルなツリーが構築されています。

これらの点が、コードの理解を難しくし、将来的な機能拡張（例: フォルダ間の移動、サブフォルダの表示）を複雑にする可能性があります。

## 実装方針 (Implementation Strategy)

1.  **`treeUtils.ts` に効率的なノード検索関数を追加:**
    *   `flattenTree` の代わりに、ツリー構造から特定のIDとタイプを持つノードを効率的に検索する `findNodeInTree` 関数を `app/screen/note-list/utils/treeUtils.ts` に追加します。
2.  **`useNoteList.ts` の `openRenameModal` を更新:**
    *   `openRenameModal` 関数内で `flattenTree` を使用している箇所を、新しく追加する `findNodeInTree` 関数に置き換えます。
3.  **`useNoteTree.ts` の `currentPath` と `items` の役割を明確化し、必要に応じて修正:**
    *   `currentPath` の役割を再評価します。もし `currentPath` が現在表示されているフォルダのルートを意味する場合、`buildTree` 関数を修正し、`currentPath` を基準としたサブツリーのみを構築するようにします。
    *   `useNoteTree` 内の `items` ステートが冗長であれば削除し、`treeNodes` を単一の真の情報源とします。
    *   `NoteListScreen` で `currentPath` に基づいてツリーをフィルタリングするロジックが必要な場合は、`useNoteTree` または `useNoteList` でその処理を実装します。

## 受け入れ条件 (Acceptance Criteria)

- [ ] `app/screen/note-list/utils/treeUtils.ts` に `findNodeInTree` 関数が追加されていること。
- [ ] `findNodeInTree` 関数が、ツリー全体をフラット化することなく、指定されたIDとタイプでノードを効率的に検索できること。
- [ ] `app/screen/note-list/hooks/useNoteList.ts` の `openRenameModal` が `findNodeInTree` を使用するように変更されていること。
- [ ] `useNoteTree.ts` における `currentPath` の使用が、その意図と一貫していること（例: サブツリー構築またはフィルタリング）。
- [ ] `useNoteTree.ts` から `items` ステートが削除されているか、その必要性が明確に文書化されていること。
- [ ] 既存の機能（ノートのリスト表示、フォルダの展開/折りたたみ、アイテムの選択、リネーム、作成）が正しく動作すること。
- [ ] パフォーマンスが現状維持または向上していること。

## 関連ファイル (Related Files)

- `app/screen/note-list/NoteListScreen.tsx`
- `app/screen/note-list/hooks/useNoteList.ts`
- `app/screen/note-list/hooks/useNoteTree.ts`
- `app/screen/note-list/utils/treeUtils.ts`
- `shared/types/note.ts`

## 制約条件 (Constraints)

- 既存のUI/UXを変更しないこと。
- 既存のデータストレージ (`NoteListStorage`) のインターフェースを変更しないこと。
- TypeScript の型安全性を維持または向上させること。

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:** `app/screen/note-list/utils/treeUtils.ts` に `findNodeInTree` 関数を追加しようとしましたが、ユーザーによってツール実行がキャンセルされました。
- **結果:** ツール実行がキャンセルされたため、変更は適用されませんでした。
- **メモ:** 次のセッションでは、まず `findNodeInTree` 関数の追加から再開します。

---

## AIへの申し送り事項 (Handover to AI)

- **現在の状況:** `app/screen/note-list/` フォルダのリファクタリング計画が策定され、issueが作成されました。最初のステップである `findNodeInTree` 関数の追加がユーザーによってキャンセルされました。
- **次のアクション:** `app/screen/note-list/utils/treeUtils.ts` に `findNodeInTree` 関数を追加する作業を再開してください。
- **考慮事項/ヒント:** `findNodeInTree` 関数は、`TreeNode[]` を受け取り、`id` と `type` に基づいて再帰的に検索する実装が必要です。
