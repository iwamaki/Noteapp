---
title: "アーキテクチャ改善：ノート管理ロジックをNoteServiceに集約"
id: 36 # 仮のID
status: new
priority: high
attempt_count: 0
tags: [architecture, refactoring, service-layer]
---

## 概要 (Overview)

現在、複数のファイルに分散しているノート管理関連のビジネスロジックを、新しく作成する単一の`NoteService`に集約するリファクタリングを行います。これにより、アーキテクチャを単純化し、コードの追跡可能性と保守性を向上させ、将来の機能開発を容易にすることを目的とします。

## 背景 (Background)

現状のノート関連ロジックは、`useNoteOperations`フック、`commandExecutor`サービス、`NoteActionService`サービスなど、複数のファイルにまたがって実装されています。

このアーキテクチャは、アンドゥ・リドゥ機能のためのコマンドパターン、一部の処理のための直接的なサービス呼び出し、状態更新のためのイベントバス通知など、複数の設計パターンが混在しており、データフローの全体像を把握することが困難になっています。

この複雑さを解消し、「UI」と「ロジック/データ」の関心を明確に分離したクリーンなアーキテクチャを実現するため、全てのノート関連ビジネスロジックを`NoteService`に集約する本リファクタリングが必要となりました。

## 受け入れ条件 (Acceptance Criteria)

> このissueが「完了」と見なされるための具体的な条件をチェックリスト形式で記述します。
>
> - [ ] `app/services/NoteService.ts`が作成されている
> - [ ] `useNoteOperations.ts`, `commandExecutor.ts`, `NoteActionService.ts`に分散していたノート関連のビジネスロジックが、すべて`NoteService.ts`に移行されている
> - [ ] `NoteService`が、内部でストレージ操作、状態更新、アンドゥ・リドゥのコマンド履歴管理の責務を担っている
> - [ ] `useNoteListLogic`や`useNoteEditor`といった画面固有のフックが、`NoteService`をシンプルに呼び出す形にリファクタリングされている
> - [ ] 不要になった`commandExecutor.ts`と`NoteActionService.ts`がプロジェクトから削除されている
> - [ ] ノートのCRUD操作やアンドゥ・リドゥを含む既存の全機能が、リファクタリング後も問題なく動作する

## 関連ファイル (Related Files)

> このissueに関連すると思われるファイルやディレクトリのリストです。
>
> - `app/hooks/useNoteOperations.ts` (リファクタリング対象)
> - `app/services/commandExecutor.ts` (削除対象)
> - `app/services/NoteActionService.ts` (削除対象)
> - `app/services/NoteService.ts` (新規作成)
> - `app/features/note-list/hooks/useNoteListLogic.ts` (リファクタリング対象)
> - `app/features/note-edit/hooks/useNoteEditor.ts` (リファクタリング対象)
> - `app/hooks/useLLMCommandHandler.ts` (要確認の関連ファイル)
> - `app/store/note/` (関連するデータ層)
> - `app/services/storageService.ts` (関連するストレージ層)
> - `app/services/eventBus.ts` (関連するイベント層)

## 制約条件 (Constraints)

> このissueを解決する際に守るべき制約やルール、考慮すべき技術的・運用的な条件を記述します。
>
> - 既存のアンドゥ・リドゥ機能は完全に維持すること
> - リスクを最小化するため、段階的なリファクタリングを行うこと
> - 既存のUI/UXへの変更は加えないこと

## 開発ログ (Development Log)

> このissueに関する作業の履歴を時系列で記録します。
> セッションをまたいで作業する際の引き継ぎ情報となります。

---
### 試行 #1

- **試みたこと:** (実行した計画の要約)
- **結果:** (成功、失敗、発生したエラーなど)
- **メモ:** (次のセッションへの申し送り事項、気づきなど)

---

## AIへの申し送り事項 (Handover to AI)

> 次のセッションでAIがこのissueを引き続き担当する際に、何をすべきかを具体的に記述します。
>
> - **現在の状況:** アーキテクチャの分析は完了し、ノート関連のビジネスロジックを`NoteService`に集約するという明確なリファクタリング計画について合意済み。
> - **次のアクション:**
>   1. `app/services/NoteService.ts`の雛形ファイルを作成する。
>   2. `useNoteOperations.ts`から、コマンドパターンを使用していない単純なメソッド（例: `bulkDeleteNotes`）を`NoteService`に移行することから始める。
>   3. 呼び出し元のフックを、新しい`NoteService`のメソッドを呼ぶように修正する。
>   4. 全てのロジックが移行され、古いファイルが削除されるまで、このプロセスを段階的に繰り返す。
> - **考慮事項/ヒント:** 各ステップで既存機能が壊れていないか確認しながら、慎重に作業を進めること。最終的に`NoteService`は、`NoteStorageService`、コマンド履歴、`eventBus`、状態ストアへの依存をすべて内部にカプセル化することを目指す。
