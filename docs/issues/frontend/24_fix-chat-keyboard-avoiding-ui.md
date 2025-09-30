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

- **試みたこと:** (未着手)
- **結果:** (未着手)
- **メモ (後続のAI担当者へ):**
    - 前回のセッションで、チャット機能の大規模なリファクタリングを実施しました。`RootNavigator` から関連ロジックを分離し、`useChat` フックを作成、各画面 (`NoteListScreen`, `NoteEditScreen`) にチャットUIを統合済みです。
    - キーボードにUIが隠れる問題は、`ChatInputBar.tsx` 内部の `KeyboardAvoidingView` の設定が不十分なことに起因する可能性が高いです。`behavior` prop (`padding` vs `height`) や `keyboardVerticalOffset` の調整を検討してください。
    - もしくは、より堅牢なアプローチとして、`NoteListScreen` や `NoteEditScreen` のルートレベルで `KeyboardAvoidingView` を適用し、画面全体でキーボードを管理する方法も考えられます。その場合、`ChatInputBar` の `KeyboardAvoidingView` は不要になります。
    - UIの一貫性の問題は、`ChatInputBar.tsx` 内で `isChatPanelVisible` 状態に応じて `editable` や `disabled` が切り替わり、それに伴いスタイルが変化していることが原因です。フォーカスがあたっても見た目が大きく変わらないよう、スタイル定義を見直す必要があります。
    - まずは `ChatInputBar.tsx` の `KeyboardAvoidingView` の設定を見直すことから着手するのが効率的かと思われます。

---
