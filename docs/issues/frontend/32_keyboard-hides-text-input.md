---
title: "NoteEditScreenでキーボードがテキスト入力を隠す問題"
id: 32
status: new
priority: high
attempt_count: 0
tags: [UI, bug, keyboard]
---

## 概要 (Overview)

`NoteEditScreen`において、テキスト入力中にソフトウェアキーボードが表示されると、入力中のテキストエリアがキーボードに覆われてしまい、ユーザーが入力内容を確認できなくなる問題を解決します。

## 背景 (Background)

`NoteEditScreen`は、メインのテキストエディタ(`TextEditor`)と、チャット入力用のUI(`ChatInputBar`)という、2つの異なるテキスト入力コンポーネントを同一画面内に含んでいます。

`ChatInputBar`は、キーボードの表示・非表示に合わせて自身の位置をアニメーションで調整する自己完結したロジックを持っています。当初、画面全体を`KeyboardAvoidingView`で囲むことで問題解決を試みましたが、このアプローチは`ChatInputBar`が持つ独自のキーボード処理ロジックと競合し、意図しないレイアウト崩れを引き起こしました。

その後、`TextEditor`コンポーネントのみに`KeyboardAvoidingView`を適用する局所的な修正を試みましたが、ユーザーからのフィードバックによると問題は解決していません。このことから、より根本的な原因調査と対策が必要であると判断しました。

## 受け入れ条件 (Acceptance Criteria)

> このissueが「完了」と見なされるための具体的な条件をチェックリスト形式で記述します。
>
> - [ ] `NoteEditScreen`でメインのテキストエディタを編集中、キーボードが表示されても入力中の行が隠れない。
> - [ ] `ChatInputBar`は、キーボードが表示された際に、その直上に正しく配置される。
> - [ ] 上記2つのコンポーネントのキーボード対応ロジックが互いに干渉しない。

## 関連ファイル (Related Files)

> このissueに関連すると思われるファイルやディレクトリのリストです。
>
> - `app/features/note-edit/NoteEditScreen.tsx`
> - `app/features/note-edit/components/editors/TextEditor.tsx`
> - `app/features/chat/ChatInputBar.tsx`
> - `app/features/note-edit/components/FileEditor.tsx`

## 制約条件 (Constraints)

> このissueを解決する際に守るべき制約やルール、考慮すべき技術的・運用的な条件を記述します。
>
> - `ChatInputBar`が持つ既存のキーボード連動アニメーションロジックは、可能な限り尊重し、変更しないこと。

## 開発ログ (Development Log)

> このissueに関する作業の履歴を時系列で記録します。

---
### 試行 #1

- **試みたこと:** `NoteEditScreen.tsx`のルート要素を`KeyboardAvoidingView`でラップし、同時に`ChatInputBar.tsx`から内部のキーボード関連アニメーションロジックを削除しました。
- **結果:** 失敗。`ChatInputBar`がキーボードの上に追従せず、画面下部に隠れてしまう問題が発生しました。
- **メモ:** グローバルな`KeyboardAvoidingView`の適用は、独自のキーボード処理を持つ子コンポーネントの挙動を破壊してしまうことが確認されました。

---
### 試行 #2

- **試みたこと:** 試行#1の変更をすべて元に戻した上で、`app/features/note-edit/components/editors/TextEditor.tsx`内の`TextInput`コンポーネントのみを`KeyboardAvoidingView`でラップしました。
- **結果:** 失敗。ユーザーからのフィードバックにより、レイアウトに変化がなく問題が解決していないことが報告されました。
- **メモ:** `TextEditor`への局所的な`KeyboardAvoidingView`の適用だけでは、問題の解決には不十分であることが示唆されました。コンポーネントの階層構造や、Flexboxレイアウトと`KeyboardAvoidingView`の相互作用など、より広範な観点からの調査が必要です。

---
