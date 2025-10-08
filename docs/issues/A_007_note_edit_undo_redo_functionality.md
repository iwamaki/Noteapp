---
title: "A_007_ノート編集画面のUndo/Redo機能の正常化"
id: 7
status: new
priority: A:high
attempt_count: 1
tags: [note-edit, undo-redo, state-management, UI, critical-bug]
---

## 概要 (Overview)

ノート編集画面におけるUndo/Redo機能が正常に動作していない。テキスト入力時に意図しない挙動が発生し、編集体験が著しく損なわれている状態。

## 背景 (Background)

Undo/Redo機能の実装において、状態管理とレンダリングの設計に根本的な問題が存在する。現在、テキスト入力直後に内容が自動的に元に戻される現象が発生しており、通常の編集作業が不可能な状態となっている。

この問題は、複数のコンポーネント間での状態の同期、履歴管理の責任分担、Reactの状態更新サイクルの理解不足など、アーキテクチャ全体に関わる課題である。

## 受け入れ条件 (Acceptance Criteria)

- [ ] 新規ノート作成時、Undoボタンが無効化されている
- [ ] テキストを入力すると、入力内容が画面上にリアルタイムで正しく表示される
- [ ] テキスト入力後、Undoボタンが有効化される
- [ ] Undoボタンを押すと、エディタのテキストが前の状態に視覚的に即座に戻る
- [ ] Undo実行後、Redoボタンが有効化される
- [ ] Redoボタンを押すと、エディタのテキストが次の状態に視覚的に即座に進む
- [ ] 履歴の最も古い状態でUndoボタンが無効化される
- [ ] 履歴の最も新しい状態でRedoボタンが無効化される
- [ ] テキスト入力中に自動的に内容が巻き戻される現象が発生しない
- [ ] 保存せずにUndo/Redoを実行した場合でも、表示と内部状態が一致している
- [ ] 履歴操作が履歴自体を汚染しない（Undo/Redo実行が新たな履歴エントリを作成しない）

## 関連ファイル (Related Files)

- `app/features/note-edit/hooks/useNoteEditor.tsx`
- `app/features/note-edit/hooks/useContentHistory.tsx`
- `app/features/note-edit/NoteEditScreen.tsx`
- `app/features/note-edit/components/FileEditor.tsx`
- `app/features/note-edit/components/editors/TextEditor.tsx`
- `app/features/note-edit/components/NoteEditHeader.tsx`
- `app/features/note-edit/hooks/useNoteEditHeader.tsx`

## 制約条件 (Constraints)

- 既存のコンポーネント構造を大幅に変更する場合は、段階的な移行を行うこと
- React Nativeの標準的な状態管理パターンに従うこと
- パフォーマンスを考慮し、不要な再レンダリングを避けること
- デバウンス処理は維持すること（300ms）
- タイトルはUndo/Redo対象外とすること（コンテンツのみ対象）
- 履歴管理とReact状態管理の責任は明確に分離すること

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:**
  - 型エラーとlintエラーの修正
  - 差分表示メニュー項目の一時削除
  - `useContentHistory`フックの作成による責任分離
  - `FileEditor`を完全制御コンポーネントに変更
  - `isUndoRedoing`フラグによる履歴汚染防止の実装

- **結果:**
  - 型チェックとlintは通過
  - しかし、テキスト入力直後に内容が自動的に元に戻される致命的な不具合が発生
  - Undo/Redoボタンの有効/無効状態の制御も未確認
  - レンダリングと状態同期が完全に破綻している状態

- **メモ:**
  - 状態の流れが複雑に絡み合っており、単一の修正では解決困難
  - `useEffect`の依存配列、debounce処理、履歴への追加タイミングなど、複数の要因が絡んでいる可能性
  - コンポーネント間のデータフローを根本から見直す必要がある

---

## AIへの申し送り事項 (Handover to AI)

> **現在の状況:**
> Undo/Redo機能の実装において、状態管理の設計が破綻している。テキスト入力時に即座に内容が元に戻される現象が発生し、編集自体が不可能な状態。型チェックとlintは通過しているが、実行時の挙動が完全に異常。
>
> **次のアクション:**
> 1. まず、理想的な状態フロー（データの流れ）を明確に定義する
> 2. 現在の実装において、どの時点で状態が意図せず変更されているかをデバッグログで追跡する
> 3. `useEffect`の依存配列と実行タイミングを見直す（特に`content`と`contentHistory`の相互作用）
> 4. debounce処理と履歴追加のタイミングを再検証する
> 5. `isUndoRedoing`フラグが正しく機能しているか確認する
> 6. 必要に応じて、より単純な実装から段階的に構築し直す
>
> **考慮事項/ヒント:**
> - 「入力した瞬間にテキストが元に戻される」という現象は、おそらく`useEffect`が意図しないタイミングで`setContent`を呼び出している
> - `contentHistory.pushHistory(content)`と`setContent(prevContent)`が互いにトリガーし合っている可能性
> - 理想状態: ユーザー入力 → `setContent` → debounce後に`pushHistory` → Undo時: `contentHistory.undo()` → `setContent` → `pushHistory`はスキップ
> - `isUndoRedoing`フラグだけでは不十分な可能性。より堅牢なガード条件が必要かもしれない
> - 最悪の場合、`useContentHistory`と`useNoteEditor`の統合部分を完全に書き直す覚悟も必要

---
