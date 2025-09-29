---
title: "差分適用時にテキストデータが不正に変換される問題"
id: 15
status: new
priority: high
attempt_count: 0
tags: [diff, data-corruption, save-logic, bug]
---

## 概要 (Overview)

差分表示画面で変更を選択し保存ボタンをタップした際に、テキストデータが意図しない箇所で改行されたり文字が分割されたりする問題が発生している。

## 背景 (Background)

issue 14の差分表示ロジック修正作業中に発見された問題。差分表示自体は正常に動作しているが、差分を適用してテキストを保存する際に、元のテキストとは異なる形でデータが変換されてしまう。具体的には、編集後の保存ボタンをタップしたときに、何らかのデータ変更処理が入ってしまっている状況。

## 受け入れ条件 (Acceptance Criteria)

- [ ] 差分適用時に元のテキスト内容が保持される
- [ ] 意図しない改行が挿入されない
- [ ] 文字が不正に分割されない
- [ ] 行番号とテキスト内容の対応が正しく保たれる
- [ ] 元のテキスト形式（改行位置、文字配置等）が維持される

## 関連ファイル (Related Files)

- `src/hooks/useDiffManager.ts` - generateSelectedContent関数
- `src/services/diffService.ts` - 差分計算ロジック
- `src/features/diff-view/components/DiffViewer.tsx` - 差分表示コンポーネント
- `src/screens/DiffViewScreen.tsx` - 保存処理フロー
- `docs/issues/frontend/diff_edit_test.md` - 実際のエラー事例

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:** issue 14の差分表示修正作業中に、SVGの仕様に基づいてテストを実行
- **結果:** 差分表示は正常だが、保存時にテキストデータが以下のように不正変換される：
  - 「あいうえお」→「あいうえ\nお」（意図しない改行挿入）
  - 行番号と内容の不整合
  - 元のテキスト構造の破損
- **メモ:** diff-match-patchライブラリの問題ではなく、保存時のロジック（generateSelectedContent関数またはその処理フロー）に問題があると推定される

---