---
title: "B_003_Refactor: ChatInputBarのキーボード位置調整ロジックを自己完結させる"
id: 003
status: done
priority: medium
attempt_count: 1
tags: [UI, refactor, keyboard]
---

## 概要 (Overview)

`ChatInputBar` コンポーネントのキーボード表示時の位置調整ロジックを、親コンポーネントである `RootNavigator` から `ChatInputBar` 自身に移動させ、コンポーネントの責任を明確化し、自己完結性を高める。

## 背景 (Background)

当初、`RootNavigator.tsx` が `ChatInputBar` を囲む `View` の `marginBottom` を `KeyboardHeightContext` から取得した `keyboardHeight` で動的に設定していた。この実装は、`ChatInputBar` の条件付きレンダリングと組み合わさった際に「Internal React error: Expected static flag was missing.」というReact内部エラーを引き起こす可能性があった。また、`ChatInputBar` の位置調整ロジックが親コンポーネントに分散しており、コンポーネントの責任が不明瞭であったため、`ChatInputBar` 自身がキーボードに応じた位置調整を行うように変更することで、コンポーネントの独立性と再利用性を向上させる。

## 実装方針 (Implementation Strategy)

1.  `RootNavigator.tsx` から `ChatInputBar` を囲む `View` の `marginBottom` スタイルおよび `styles.chatLayoutContainer` の `position`, `bottom`, `left`, `right`, `zIndex` スタイルを削除する。
2.  `ChatInputBar.tsx` 内で `useKeyboardHeight` から `keyboardHeight` を取得し、自身のコンテナ `View` の `bottom` スタイルに直接適用する。
3.  `ChatInputBar.tsx` のコンテナ `View` に `position: 'absolute'`, `left: 0`, `right: 0`, `zIndex: 1` を設定する。

## 受け入れ条件 (Acceptance Criteria)

- [ ] アプリケーション起動時に「Internal React error: Expected static flag was missing.」エラーが発生しないこと。
- [ ] キーボード表示時に `ChatInputBar` がキーボードの上に適切に表示され、入力が隠れないこと。
- [ ] キーボード非表示時に `ChatInputBar` が画面下部に適切に配置されること。
- [ ] `RootNavigator.tsx` が `ChatInputBar` の位置調整ロジックに直接関与していないこと。
- [ ] `ChatInputBar.tsx` が `keyboardHeight` を利用して自身の `bottom` スタイルを調整していること。

## 関連ファイル (Related Files)

- `app/navigation/RootNavigator.tsx`
- `app/features/chat/components/ChatInputBar.tsx`
- `app/contexts/KeyboardHeightContext.tsx`

## 制約条件 (Constraints)

- 既存の `KeyboardHeightContext` のAPIを変更しないこと。
- `ChatInputBar` の機能（メッセージ送信、履歴表示など）が損なわれないこと。
- UIの視覚的な整合性が保たれること。

## 開発ログ (Development Log)

---
### 試行 #1

-   **試みたこと:**
    1.  `RootNavigator.tsx` で `ChatInputBar` を囲む `View` の `marginBottom` を一時的に削除し、エラーが解消されるか確認。
    2.  エラーが解消されなかったため、変更を元に戻した。
    3.  `RootNavigator.tsx` で `ChatInputBar` を条件付きでレンダリングするように変更。
    4.  `ChatInputBar.tsx` から `visible` prop と `if (!visible) { return null; }` ロジックを削除。
    5.  `ChatInputBar.tsx` 内で `keyboardHeight` を直接利用し、自身の `bottom` スタイルを調整するように変更。
-   **結果:** 「Internal React error: Expected static flag was missing.」エラーが解消され、`ChatInputBar` の位置調整が正常に機能することを確認。
-   **メモ:** `ChatInputBar` の条件付きレンダリング方法の変更と、位置調整ロジックの自己完結化がエラー解消に繋がった。

---

## AIへの申し送り事項 (Handover to AI)

-   **現在の状況:** `ChatInputBar` のキーボード位置調整ロジックのリファクタリングが完了し、関連するReact内部エラーも解消されました。
-   **次のアクション:** このissueは完了としてクローズしてください。
-   **考慮事項/ヒント:** なし。
