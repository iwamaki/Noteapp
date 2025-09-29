---
title: "差分表示の不適切な行処理とブロック管理の修正"
id: 14
status: new
priority: high
attempt_count: 0
tags: [UI, diff, bug, logic]
---

## 概要 (Overview)

> 差分表示機能において、文字レベルの変更が不適切に行分割されて表示される問題と、行番号の整合性が取れない問題を修正する。

## 背景 (Background)

> 現在の差分表示では以下の問題が発生している：
> 1. 同一行内の変更（「あいうえお」→「あいうえ」）が別々の行として表示される
> 2. 行番号が飛んだり整合性が取れない表示になる
> 3. 削除・追加の文脈が失われ、直感的でない差分表示になる
>
> 根本原因は、diff-match-patchの文字レベル差分を無理やり行単位で分割している点と、描画系での行番号処理が不適切な点にある。

## 受け入れ条件 (Acceptance Criteria)

### 標準的なGit Diff形式への準拠
> - [ ] Git Unified Diff形式に準拠した行番号表示（`@@ -開始行,行数 +開始行,行数 @@`）
> - [ ] 標準的な行プレフィックス（` ` コンテキスト、`-` 削除、`+` 追加）
> - [ ] 同一行内の変更は削除行と追加行の組み合わせで表現（「あいうえお」→「あいうえ」は `-あいうえお` + `+あいうえ`）
> - [ ] デフォルト3行のコンテキスト行表示

### UI・UXの改善
> - [ ] 行番号が適切に表示され、整合性が保たれる（旧ファイル行番号・新ファイル行番号の両方）
> - [ ] 削除・追加・変更の文脈が視覚的に分かりやすく表示される
> - [ ] ハンク（変更ブロック）の境界が明確に区別される

### 技術的要件
> - [ ] changeBlockIdが適切に生成され、ブロック選択機能が正常動作する
> - [ ] diff-match-patchの出力を標準的なUnified Diff形式に正しく変換する
> - [ ] 既存のテストが通り、新しいテストケースでカバレッジを向上させる
> - [ ] パフォーマンスが現状と同等以上を維持する

## 関連ファイル (Related Files)

> - `src/services/diffService.ts` - 差分計算ロジック（主要な修正対象）
> - `src/features/diff-view/components/DiffViewer.tsx` - 描画系の行番号処理
> - `src/features/diff-view/DiffViewScreen.tsx` - 差分表示画面
> - `src/__tests__/diffService.test.ts` - 差分サービスのテスト

## 開発ログ (Development Log)

> このissueに関する作業の履歴を時系列で記録します。

---
### 試行 #1

- **試みたこと:** 問題の分析と課題の特定
- **結果:** ロジックレベル（diffService.ts）と描画レベル（DiffViewer.tsx）の両方に問題があることを確認
- **メモ:**
  - diffService.tsで文字レベル差分を無理やり行分割している
  - DiffViewer.tsxで未生成のchangeBlockIdに依存している
  - 行番号表示処理（`line.originalLineNumber || line.newLineNumber`）が不適切

---