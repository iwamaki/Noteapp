---
title: "A_023_ChatInputBar is positioned too high when keyboard is visible"
id: 023
status: open
priority: high
attempt_count: 5
tags: [UI, bug, keyboard, layout]
---

### Title: `ChatInputBar`がキーボード表示時に過剰に持ち上がる

### 概要 (Overview)

`ChatInputBar`の入力欄をタップしてキーボードを表示させると、`ChatInputBar`がキーボードのすぐ上ではなく、それよりも高い位置に表示されてしまう。

### 再現手順 (Steps to Reproduce)

1.  `NoteList` または `NoteEdit` スクリーンを開く。
2.  画面下部にある `ChatInputBar` のテキスト入力エリアをタップする。
3.  キーボードが表示される。

### 観測される結果 (Observed Result)

`ChatInputBar`がキーボードにぴったりと接する位置ではなく、それよりも高く持ち上がり、`ChatInputBar`とキーボードの間に不自然な空白のスペースができてしまう。

### 期待される結果 (Expected Result)

`ChatInputBar`がキーボードのすぐ上にぴったりと配置され、不要な空白が表示されない。

### 関連ファイル (Related Files)

*   `app/App.tsx`
*   `app/navigation/RootNavigator.tsx`
*   `app/contexts/KeyboardContext.tsx`
*   `app/features/chat/components/ChatInputBar.tsx`
*   `app/screen/note-edit/NoteEditScreen.tsx`
*   `app/screen/note-list/NoteListScreen.tsx`
*   `app/components/MainContainer.tsx`
*   `app/design/constants.ts`
