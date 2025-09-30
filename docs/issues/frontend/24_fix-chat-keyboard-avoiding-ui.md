---
title: "チャット入力欄のキーボード追従とUI一貫性の改善"
id: 24
status: new
priority: high
attempt_count: 0
tags: [UI, bug, chat, keyboard]
---

## 概要 (Overview)

> このIssueは、チャット機能におけるユーザーエクスペリエンスの向上を目的とします。具体的には、テキスト入力時にソフトウェアキーボード（IME）が表示された際、入力欄がキーボードに隠れてしまう問題を解決し、入力欄フォーカス前後でのUIの見た目の一貫性を確保します。

## 背景 (Background)

> 現在の実装では、`NoteListScreen` および `NoteEditScreen` のチャット入力欄（`ChatInputBar`）が、キーボード表示時に適切にリサイズまたは移動されず、結果として入力中のテキストがキーボードに隠れてしまいます。これにより、ユーザーは自身が何を入力しているか確認できず、UXが著しく低下しています。
> また、入力欄をタップする（フォーカスする）前後で、入力欄と隣のボタン（非入力時は「チャット」、入力時は「送信」）のスタイルやレイアウトが変動してしまい、視覚的な一貫性が損なわれています。これらの問題を解決し、スムーズなチャット操作を実現する必要があります。

## 受け入れ条件 (Acceptance Criteria)

> - [ ] チャット入力欄にフォーカスし、キーボードが表示された際、入力欄がキーボードの直上に表示されること。
> - [ ] 入力中のテキストが常に画面に表示され、キーボードに隠れないこと。
> - [ ] チャット入力欄へのフォーカス前後で、入力欄と「チャット/送信」ボタンのレイアウトやスタイルが大きく変化しないこと。
> - [ ] 上記の修正が `NoteListScreen` と `NoteEditScreen` の両方の画面で適用されていること。

## 関連ファイル (Related Files)

> - `src/features/chat/components/ChatInputBar.tsx`
> - `src/features/note-list/NoteListScreen.tsx`
> - `src/features/note-edit/NoteEditScreen.tsx`
> - `src/utils/commonStyles.ts`

## 開発ログ (Development Log)

> このissueに関する作業の履歴を時系列で記録します。
> セッションをまたいで作業する際の引き継ぎ情報となります。

---
### 試行 #1

- **試みたこと:**
    - `ChatInputBar.tsx` から `KeyboardAvoidingView` を削除。
    - `NoteListScreen.tsx` と `NoteEditScreen.tsx` のルート要素を `KeyboardAvoidingView` でラップし、キーボード制御を各画面に委譲した。
    - `ChatInputBar.tsx` から `editable` と `disabled` 属性を削除し、UIの一貫性を図った。
- **結果:** 失敗。
    - キーボード追従の問題は解決しなかった。チャット入力欄は依然としてキーボードに隠れたままだった。
    - UIの一貫性も改善されなかった。
- **メモ:**
    - `ChatInputBar.tsx` が `position: 'absolute'` で絶対配置されているため、親コンポーネントの `KeyboardAvoidingView` がレイアウト計算の対象として認識できていない可能性が高い。これが失敗の根本原因と考えられる。

---
### 試行 #2

- **計画:**
    - **根本原因の解消:** `ChatInputBar.tsx` のスタイルから `position: 'absolute'` を削除する。
    - **レイアウトの再構築:** `NoteListScreen.tsx` と `NoteEditScreen.tsx` のJSX構造を見直す。メインのコンテンツエリア（`FlatList`や`FileEditor`）が利用可能なスペース全体を占めるように(`flex: 1`)し、その**下**に`ChatInputBar`を通常のコンポーネントとして配置する。
    - これにより、`KeyboardAvoidingView`が画面内のすべての要素を正しく認識し、キーボード表示時に`ChatInputBar`を適切に押し上げることが期待される。
    - まずは `ChatInputBar.tsx` のスタイル変更から着手する。

---
