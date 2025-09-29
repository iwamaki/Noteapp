title: "差分表示機能の不具合：変更されていない行がハイライトされる"
id: 0
status: new
priority: high
attempt_count: 0
tags: [bug, UI, diff]

## 概要 (Overview)

ノート保存時に表示される差分画面において、変更されていない行が差分として誤ってハイライト表示される不具合が発生しています。特に、編集箇所の直下の行が、実際には変更されていないにも関わらず差分として表示されることがあります。

## 背景 (Background)

ユーザーがノートを保存する際に表示される差分画面で、変更内容を正確に把握できないという問題が報告されました。現在の差分表示では、変更されていない行や、編集箇所の直下の行が誤って差分としてハイライトされるため、ユーザーが混乱し、変更内容の確認が困難になっています。

## 受け入れ条件 (Acceptance Criteria)

- [ ] 変更された行のみが差分としてハイライト表示されること。
- [ ] 変更されていない行は、差分としてハイライト表示されないこと。
- [ ] 可能であれば、変更があったテキストの範囲も、行のハイライトよりも強い色でハイライト表示されること。

## 関連ファイル (Related Files)

- `src/features/diff-view/DiffViewScreen.tsx`
- `src/features/diff-view/components/DiffViewer.tsx`
- `src/services/diffService.ts`
- `src/hooks/useDiffManager.ts`
- `shared/types/diff.ts`
- `shared/types/note.ts`
- `server/src/services/diff_service.py`

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:** 差分計算ロジックの問題を特定するため、`src/services/diffService.ts` の `generateDiff` 関数に対するJestテストを作成し、実行を試みた。
- **結果:** Jestテストの実行時に `ReferenceError: You are trying to \includegraphics a file outside of the scope of the test code.` というエラーが発生し、テストが失敗した。
- **メモ:** Jestのモジュール解決に関する設定、特にExpoプロジェクトとの連携に問題がある可能性がある。次回はJestの設定を見直すか、別の方法で `generateDiff` のデバッグを行う必要がある。

---
