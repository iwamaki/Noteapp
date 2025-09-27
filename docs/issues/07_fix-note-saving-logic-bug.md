---
title: "ノート保存ロジックのバグ修正"
id: 7
status: in-progress
priority: high
attempt_count: 1
tags: ["bug", "persistence", "navigation"]
---

## 概要 (Overview)

> 既存ノートを保存しようとすると「保存に失敗しました」というエラーが表示され、コンソールに "Non-serializable values" 警告と "Note with id ... not found" エラーが出力される問題を修正する。

## 背景 (Background)

> ローカルデータ永続化の実装 (issue #6) 後、ユーザーによるテストで新たなバグが発見された。既存ノートの編集・保存時にエラーが発生する。エラーログから、React Navigation のパラメータにシリアライズ不可能な値（コールバック関数 `onApplyDiff`）を渡していることによる警告と、`storageService` 内で存在しないIDのノートを更新しようとしているエラーが確認された。根本的な原因は、`NoteEditScreen` から `DiffViewScreen` を経由して `saveNote` アクションを呼び出す際のデータフローにあり、特に更新対象のノートIDが正しく渡っていない可能性が高い。

## 受け入れ条件 (Acceptance Criteria)

> このissueが「完了」と見なされるための具体的な条件をチェックリスト形式で記述します。
>
> - [x] 既存ノートの編集・保存時に "Non-serializable values" 警告が出力されない。
> - [ ] 既存ノートを保存した際に「保存に失敗しました」エラーが表示されない。
> - [ ] 既存ノートの変更が正しく永続化され、一覧画面に反映される。
> - [ ] 新規ノートの作成も引き続き正常に動作する。
> - [ ] 保存後、ノート一覧画面に遷移し、ナビゲーションスタックがリセットされる（「戻る」で編集画面に戻らない）。

## 関連ファイル (Related Files)

> このissueに関連すると思われるファイルやディレクトリのリストです。
> LLMがコード分析を始める際のヒントになります。
>
> - `src/features/note-edit/NoteEditScreen.tsx`
> - `src/store/noteStore.ts`
> - `src/services/storageService.ts`
> - `src/features/diff-view/DiffViewScreen.tsx`

## 開発ログ (Development Log)

> このissueに関する作業の履歴を時系列で記録します。
> セッションをまたいで作業する際の引き継ぎ情報となります。

---
### 試行 #1

- **試みたこと:**
    1. "Non-serializable value" 警告と "Note not found" エラーを分析。
    2. 根本原因が、画面遷移のパラメータとしてコールバック関数を渡していることによる、不安定なデータフローにあると仮定。
    3. 画面遷移パラメータに依存せず、状態管理ストア(`noteStore`)を唯一の信頼できる情報源とするデータフローへのリファクタリングを計画。
    4. `noteStore.ts` を修正し、編集中の内容を一時的に保持する `draftNote` 状態を追加。`saveNote` アクションも `draftNote` を参照するように変更。
    5. `NoteEditScreen.tsx` を修正し、保存時に `draftNote` を設定してから `DiffViewScreen` に遷移するように変更。
    6. `DiffViewScreen.tsx` を修正し、ストアから `activeNote` と `draftNote` を読み込んで差分を生成するように変更。「適用」ボタンでストアの `saveNote` アクションを直接呼び出すようにした。

- **結果:**
    クラッシュやエラーモーダルは解消されたが、新たに以下の問題が発生した。
    1. 保存後の画面遷移で、新しい画面がスタックに積まれてしまい、「戻る」を押すと編集画面に戻ってしまう。
    2. 保存した内容が一覧画面で即座に正しく表示されないことがある。

- **メモ:**
    `DiffViewScreen` での保存後の画面遷移処理に問題がある。`navigation.navigate()` の代わりに `navigation.reset()` を使い、スタックをリセットする必要がある。

---
