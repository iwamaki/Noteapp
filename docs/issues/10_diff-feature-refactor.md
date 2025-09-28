---
title: "差分表示機能の独立化とバージョン履歴連携"
id: 10
status: new
priority: medium
attempt_count: 0
tags: [diff, version-history, refactor, feature]
---

## 概要 (Overview)

現在の`DiffViewScreen`に密結合している差分計算およびレンダリング機能を独立したモジュール/サービスとして切り出し、再利用可能な形にする。これにより、`NoteEditScreen`から直接差分表示機能を呼び出せるようにするとともに、将来的に実装予定の`VersionHistory`機能で過去バージョンとの差分表示にもこの機能を再利用できるようにする。

## 背景 (Background)

現在、保存前のデータと変更データを比較し、赤緑でレンダリングする差分表示のロジックは`DiffViewScreen`内に集約されています。しかし、ユーザーが編集中のノートの差分をより手軽に確認したい場合や、今後実装する`VersionHistory`機能で過去のバージョンとの差分を表示する際に、このロジックを再利用できる必要があります。

差分計算とレンダリングのロジックを分離し、独立したモジュールとして提供することで、以下のメリットが期待されます。

*   **再利用性の向上**: `DiffViewScreen`だけでなく、`NoteEditScreen`や`VersionHistoryScreen`など、複数の場所で差分表示機能を利用できるようになる。
*   **責務の分離**: 各コンポーネントやモジュールの責務が明確になり、コードの可読性と保守性が向上する。
*   **テスト容易性の向上**: 差分計算やレンダリングのロジックを単体でテストしやすくなる。

## 受け入れ条件 (Acceptance Criteria)

- [ ] 差分計算ロジック（`DiffUtils.generateDiff`に相当する機能）が`DiffViewScreen`から分離され、独立したユーティリティまたはサービスとして提供されていること。
- [ ] 差分レンダリング（赤緑表示）機能が独立したコンポーネントまたはユーティリティとして提供されていること。
- [ ] `NoteEditScreen`から、独立した差分表示機能（計算とレンダリング）を呼び出し、編集中の内容と保存済みの内容の差分をモーダルやインラインで表示できること。
- [ ] `DiffViewScreen`が、独立した差分計算・レンダリング機能を利用するようにリファクタリングされていること。
- [ ] `VersionHistory`機能（未実装）が、この独立した差分表示機能を再利用できる設計になっていること。

## 関連ファイル (Related Files)

-   `src/features/diff-view/DiffViewScreen.tsx`
-   `src/features/diff-view/components/DiffView.tsx`
-   `src/features/diff-view/utils/diffUtils.ts`
-   `src/features/diff-view/hooks/useDiff.ts`
-   `src/features/note-edit/NoteEditScreen.tsx`
-   `src/features/note-edit/hooks/useNoteEditor.ts`
-   `src/features/note-list/NoteListScreen.tsx`
-   `src/features/note-list/hooks/useNotes.ts`
-   `src/features/version-history/VersionHistoryScreen.tsx`
-   `src/store/noteStore.ts`
-   `src/types/note.ts`

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:** （実行した計画の要約）
- **結果:** （成功、失敗、発生したエラーなど）
- **メモ:** （次のセッションへの申し送り事項、気づきなど）

---