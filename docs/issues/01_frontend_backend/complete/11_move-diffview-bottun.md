---
title: "差分確認モードの操作ボタンをフッターからヘッダーへ移動"
id: 1
status: done
priority: medium
attempt_count: 0
tags: [UI, consistency, diff-mode]
---

## 概要 (Overview)

差分確認モード画面の「適用」「キャンセル」「全選択」操作ボタンを、現在のフッター配置からヘッダーへ移動し、UIの一貫性を向上させる。

## 背景 (Background)

現状、差分確認モードの主要操作ボタンがフッターに配置されているが、他の画面では主要な操作ボタンがヘッダーに配置されている。画面ごとに操作ボタンの配置が異なることで、ユーザー体験やアプリケーション全体のデザイン原則に一貫性がなくなっている。主要操作ボタンをヘッダーに統一することで、操作性とデザインの一貫性を向上させる必要がある。

## 受け入れ条件 (Acceptance Criteria)

- [X] 「適用」「キャンセル」「全選択」ボタンがヘッダーに表示される
- [X] フッターからこれらのボタンが削除されている
- [X] 他画面のヘッダー操作ボタンとデザイン・配置が統一されている
- [X] ボタンの動作（イベントハンドラ）が正しく機能する
- [X] UIのレイアウト崩れや副作用が発生していない

## 関連ファイル (Related Files)

- `src/features/diff-view/DiffViewScreen.tsx`
- `src/features/diff-view/components/DiffViewer.tsx`
- `src/components/CustomHeader.tsx`
- `src/components/HeaderButton.tsx`
- `src/hooks/useDiffManager.ts`

## 開発ログ (Development Log)

---

### 試行 #1

- **試みたこと:** 関連ファイルの特定と現状のUI配置の調査
- **結果:** 差分確認モードの操作ボタンがフッターに配置されていることを確認。他画面ではヘッダーに主要操作ボタンがある。
- **メモ:** 次はヘッダーへのボタン追加方法とイベントハンドラの移動を検討する。

---