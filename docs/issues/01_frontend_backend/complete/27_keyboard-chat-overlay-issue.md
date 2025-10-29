---
title: "キーボード/チャット入力欄によるコンテンツのオーバーレイ問題の解消"
id: 27
status: done
priority: high
attempt_count: 0
tags: [UI, keyboard, chat, bug]
---

## 概要 (Overview)

`NoteEditScreen` および `NoteListScreen` において、キーボード表示時やチャット入力欄展開時に、コンテンツの最下部がキーボードまたはチャット入力バーによって隠れてしまう問題を解決します。これにより、ユーザーが常にコンテンツ全体にアクセスできるようにします。

## 背景 (Background)

`ChatInputBar` コンポーネントは、キーボードの表示/非表示イベントをリッスンし、`Animated.View` の `bottom` スタイルを動的に調整することで、キーボードの高さに合わせて入力バー自体を画面上へ移動させています。しかし、`NoteEditScreen` と `NoteListScreen` では、`ChatInputBar` の上に表示されるコンテンツ（エディタやリスト）の `paddingBottom` が `CHAT_INPUT_HEIGHT` という固定値で設定されています。この固定値はチャット入力バーの概算の高さであり、キーボード表示時の動的な移動量と正確に一致しないため、コンテンツの最下部がキーボードやチャット入力バーの下に隠れてしまい、ユーザー体験を損なっています。

## 受け入れ条件 (Acceptance Criteria)

- [x] `NoteEditScreen` でキーボードが表示された際、エディタの最下部がキーボードによって隠れないこと。
- [x] `NoteListScreen` でキーボードが表示された際、リストの最下部がキーボードによって隠れないこと。
- [x] `NoteEditScreen` でチャット入力欄が展開された際、エディタの最下部がチャット入力バーによって隠れないこと。
- [x] `NoteListScreen` でチャット入力欄が展開された際、リストの最下部がチャット入力バーによって隠れないこと。
- [x] キーボードやチャット入力欄が非表示/折りたたまれた際に、不必要な余白が生じないこと。

## 関連ファイル (Related Files)

- `src/features/chat/ChatInputBar.tsx`
- `src/features/note-edit/NoteEditScreen.tsx`
- `src/features/note-list/NoteListScreen.tsx`
- `src/utils/commonStyles.ts`

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:** （実行した計画の要約）
- **結果:** （成功、失敗、発生したエラーなど）
- **メモ:** （次のセッションへの申し送り事項、気づきなど）

---
### 試行 #2

- ...
