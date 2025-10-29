---
title: "ノート編集画面で別ノートのコンテンツが一瞬表示される"
id: 12
status: done
priority: high
attempt_count: 0
tags: [bug, UI, UX, screen-transition, data-display]
---

## 概要 (Overview)

ノート編集画面に遷移した際、直前に開いていた別のノートのコンテンツが一瞬表示されてしまう問題を修正します。

## 背景 (Background)

ノートを切り替える際、新しいノートのデータが非同期で読み込まれる前に、古いデータ（ストアに残っている `activeNote`）で画面が一時的に描画されてしまうことが原因です。これによりユーザーは混乱し、アプリケーションの品質が損なわれている印象を与えます。

これまでの試行では、`useNoteEditor` フック内で `noteId` と `activeNote.id` を比較してコンテンツのセットを制御したり、`FileEditor` コンポーネントがプロパティの変更を `useEffect` で受け取れるように修正しましたが、問題は解決していません。より根本的な状態管理や画面のライフサイクルに問題がある可能性があります。

## 受け入れ条件 (Acceptance Criteria)

- [X] ノートリストからノートを選択して編集画面に遷移した際、他のノートのコンテンツが一瞬でも表示されないこと。
- [X] 画面遷移中は、画面が空白であるか、ローディングインジケーターが表示されるなど、未完了の状態であることが明確であること。
- [X] データの読み込み完了後、選択したノートのコンテンツが正しく表示されること。

## 関連ファイル (Related Files)

- `src/features/note-edit/hooks/useNoteEditor.ts`
- `src/features/note-edit/NoteEditScreen.tsx`
- `src/features/note-edit/components/FileEditor.tsx`
- `src/store/noteStore.ts`

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:** `FileEditor`コンポーネントが、非同期で渡される`initialContent`プロパティを正しく表示できるよう、`useEffect`フックを追加して内部状態を更新するように修正した。
- **結果:** 失敗。ノートのコンテンツは表示されるようになったが、ノート切り替え時に古いコンテンツが一瞬表示される問題が発生した。
- **メモ:** `FileEditor`は`initialContent`の変更に追従するようになったが、親コンポーネントから渡される`initialContent`自体が、データロードのタイムラグによって古い情報のままレンダリングされている可能性がある。

---
### 試行 #2

- **試みたこと:** `useNoteEditor`フックを修正。`noteId`とストアの`activeNote.id`を比較し、IDが一致しない場合はタイトルとコンテンツを空にすることで、古い情報の表示を防ごうとした。
- **結果:** 失敗。問題は解消されなかった。
- **メモ:** `useEffect`の依存関係や実行順序の問題で、期待通りに状態がクリアされていない可能性がある。コンポーネントのレンダリングと状態更新のライフサイクルをより詳細に調査する必要がある。

---
