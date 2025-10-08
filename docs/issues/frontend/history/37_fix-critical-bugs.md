---
title: "重大なバグの修正：データ永続化と差分画面の不整合"
id: 37
status: done
priority: critical
tags: [bug, critical, persistence, state-management]
---

## 概要 (Overview)

Issue #36のリファクタリング後の検証フェーズで発見された、2つの重大なバグを修正する。
1.  ノートへの変更が永続化されないバグ。
2.  差分表示画面で変更を破棄した際に、編集画面の状態が不整合になるバグ。

## 背景 (Background)

`NoteService`へのリファクタリング後、アプリケーションの基本的な動作に問題があることが判明した。特にデータが永続化されない問題は、ノートアプリとしての根幹を揺るがす致命的なバグであり、最優先での対応が求められる。

## 受け入れ条件 (Acceptance Criteria)

### データ永続化のバグ
- [ ] 1. ノートを新規作成し、アプリを完全に終了してから再起動しても、そのノートが存在する。
- [ ] 2. 既存ノートの内容を編集して保存し、アプリを再起動しても、変更が維持されている。
- [ ] 3. ノートを削除し、アプリを再起動しても、そのノートが復元されていない。

### 差分画面のバグ
- [ ] 4. 編集画面でノートに変更を加える。
- [ ] 5. 差分表示画面に遷移し、「適用」せずに編集画面に戻る。
- [ ] 6. 編集画面のテキストが、差分表示画面に遷移する前の状態に完全に戻っている。
- [ ] 7. その状態で「保存」を試みると、「変更がありません」と正しく通知される。

## 関連ファイル (Related Files)

- `app/services/NoteService.ts` (永続化ロジックの中心)
- `app/services/storageService.ts` (低レベルのストレージAPI)
- `app/features/note-edit/hooks/useNoteEditor.tsx` (編集画面の状態管理)
- `app/features/diff-view/DiffViewScreen.tsx` (差分表示画面)
- `docs/issues/frontend/36_centralize-note-logic-to-service.md` (先行したリファクタリングIssue)
