---
title: "A_023_Unnecessary space appears between ChatInputBar and keyboard"
id: 023
status: in-progress
priority: high
attempt_count: 4
tags: [UI, bug, keyboard, layout]
---

## 概要 (Overview)

`ChatInputBar`の入力欄をタップしてキーボードを表示させると、`ChatInputBar`とキーボードの間に不自然な空白領域が表示される問題を解決します。

## 再現手順 (Steps to Reproduce)

1.  `NoteList` または `NoteEdit` スクリーンを開きます。
2.  画面下部にある `ChatInputBar` のテキスト入力エリアをタップします。
3.  キーボードが表示されます。

## 観測される結果 (Observed Result)

`ChatInputBar`がキーボードの高さ以上に押し上げられ、`ChatInputBar`とキーボードの間に空白のスペースができてしまいます。

## 期待される結果 (Expected Result)

`ChatInputBar`がキーボードのすぐ上にぴったりと配置され、不要な空白が表示されない状態。

## 実装方針案 (Potential Implementation Strategy)

この問題は、キーボードの高さを取得し、`ChatInputBar`の位置を調整するロジックに起因する可能性が高いです。`RootNavigator.tsx`内で`useKeyboard`フックから得られる`keyboardHeight`を用いて`ChatInputBar`の`bottom`スタイルを更新している部分が、意図しない挙動を引き起こしていると推測されます。

考えられるアプローチは以下の通りです。

1.  **`KeyboardAvoidingView`の活用:**
    *   `RootNavigator.tsx`での手動の`bottom`スタイル調整をやめ、代わりに`KeyboardAvoidingView`コンポーネントで`ChatInputBar`をラップすることを検討します。
    *   `KeyboardAvoidingView`の`behavior`プロパティ(`padding`, `height`, `position`)と`keyboardVerticalOffset`を適切に設定することで、React Nativeの標準的な方法でキーボードを回避します。

2.  **レイアウト計算の見直し:**
    *   現在の`bottom: keyboardHeight`というスタイル適用の計算が正しいか、他のコンポーネントのレイアウト（セーフエリアなど）と干渉していないかを再調査します。

## 関連ファイル (Potentially Related Files)

- `app/navigation/RootNavigator.tsx`
- `app/features/chat/components/ChatInputBar.tsx`
- `app/contexts/KeyboardContext.tsx`

## AIへの申し送り事項 (Handover to AI)

- **問題:** `ChatInputBar`をタップすると、キーボードとの間に予期せぬ空白が表示されます。
- **次のアクション:** `app/navigation/RootNavigator.tsx`の実装を確認し、`ChatInputBar`のキーボード回避ロジックを修正してください。現在の`bottom`スタイルを手動で設定する方法から、`KeyboardAvoidingView`を使用する方法への切り替えが有効な解決策となる可能性があります。