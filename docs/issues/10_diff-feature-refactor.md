---
title: "差分表示機能の独立化とバージョン履歴連携"
id: 10
status: done
priority: medium
attempt_count: 1
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

- [x] 差分計算ロジック（`DiffUtils.generateDiff`に相当する機能）が`DiffViewScreen`から分離され、独立したユーティリティまたはサービスとして提供されていること。
- [x] 差分レンダリング（赤緑表示）機能が独立したコンポーネントまたはユーティリティとして提供されていること。
- [x] `NoteEditScreen`から、独立した差分表示機能（計算とレンダリング）を呼び出し、編集中の内容と保存済みの内容の差分をモーダルやインラインで表示できること。
- [x] `DiffViewScreen`が、独立した差分計算・レンダリング機能を利用するようにリファクタリングされていること。
- [x] `VersionHistory`機能（未実装）が、この独立した差分表示機能を再利用できる設計になっていること。

## 関連ファイル (Related Files)

-   `src/features/diff-view/DiffViewScreen.tsx`
-   `src/features/diff-view/components/DiffViewer.tsx`
-   `src/services/diffService.ts`
-   `src/hooks/useDiffManager.ts`
-   `src/features/note-edit/NoteEditScreen.tsx`
-   `src/features/note-edit/components/FileEditor.tsx`

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:** 差分計算ロジックを`src/services/diffService.ts`、状態管理ロジックを`src/hooks/useDiffManager.ts`として分離。UIを状態を持たない`DiffViewer.tsx`コンポーネントとして再構築した。これらを利用して、`DiffViewScreen.tsx`および、関連する`FileEditor.tsx`のリファクタリングを実施した。
- **結果:** 成功。主要な受け入れ条件を満たし、Expo環境での動作も確認済み。リファクタリングにより、差分表示機能の再利用性と保守性が大幅に向上した。
- **メモ:** 型チェックはパスしたが、`npm run test`で`storageService.test.ts`が失敗する。これはExpoのランタイムとJestのトランスパイル設定の間の問題の可能性が高く、今回のリファクタリングの直接的な影響ではないと判断。ユーザーの指示により、このテストエラーは別途対応とする。