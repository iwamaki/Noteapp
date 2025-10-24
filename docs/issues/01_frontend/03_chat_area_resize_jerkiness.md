---
filename:  03_chat_area_resize_jerkiness # "[id]_[issueのタイトル]"
id: 3 # issueのユニークID
status: new # new | in-progress | blocked | pending-review | done
priority: medium # A:high | B:medium | C:low
attempt_count: 0 # このissueへの挑戦回数。失敗のたびにインクリメントする
tags: [UI, performance, bug] # 例: [UI, navigation, bug]
---

## 概要 (Overview)

チャットエリアの高さ変更時に、スワイプ操作中にUIがカクつく問題を解決します。スワイプ中のレイアウト同期計算を最適化し、スムーズなアニメーションを実現します。

## 背景 (Background)

現在、チャットエリアの高さ変更は `PanResponder` と `Animated` API を使用して実装されています。チャットバーおよびチャットエリアは、リスト画面や編集画面の上にオーバーレイ表示されます。これらの下層画面は、チャットバーとキーボードの高さに応じて自身のレイアウトを調整し、UI要素が重複しないように設計されています。しかし、スワイプ中に `ChatInputBar` の `onLayout` イベントが頻繁に発火し、その結果 `KeyboardHeightContext` の `chatInputBarHeight` が連続的に更新されています。このコンテキストの連続的な更新が、`useKeyboardHeight` を利用している下層画面を含む他のコンポーネントの冗長な再レンダリングやレイアウト計算をトリガーし、UIのカクつきの原因となっていると考えられます。ユーザーはスワイプ中にリアルタイムな視覚的フィードバックを望んでいますが、現在の実装ではパフォーマンス上の問題が発生しています。

## 実装方針 (Implementation Strategy)

1.  **スワイプ中のレイアウト更新の抑制**:
    *   チャットエリアの高さ変更を伴うスワイプジェスチャー中に、レイアウトの再計算が連続的に発生しないようにします。
    *   UIの視覚的なフィードバックは維持しつつ、レイアウトの確定はジェスチャー終了まで延期するアプローチを検討します。

2.  **ジェスチャー終了後のレイアウト確定**:
    *   スワイプジェスチャーが完了した時点で、チャットエリアの最終的な高さを計算し、一度だけレイアウトを更新します。
    *   この更新がスムーズに行われるように、必要に応じてアニメーションを適用することを検討します。

## AIへの申し送り事項 (Handover to AI)

-   **現在の状況**: チャットエリアのリサイズ時のカクつき問題について、原因分析と解決策の方向性を特定しました。特に、スワイプ中のレイアウト同期計算が問題の根源であると判断しています。
-   **次のアクション**: 上記「実装方針」に基づき、スワイプ中のレイアウト更新を抑制し、ジェスチャー終了後にレイアウトを確定させる具体的な実装方法を検討し、パフォーマンス問題を解決してください。
-   **考慮事項/ヒント**: スワイプ中にUIがカクつかないように、レイアウトの再計算を最小限に抑えることを最優先してください。

## 受け入れ条件 (Acceptance Criteria)

-   [ ] チャットエリアの高さが、指の動きに合わせてスワイプ中にスムーズに変化すること。
-   [ ] スワイプ中にUIがカクつく、またはスタッターするアニメーションが発生しないこと。
-   [ ] `KeyboardHeightContext` の `chatInputBarHeight` が、スワイプジェスチャー中に連続的に更新されないこと。
-   [ ] スワイプ終了後、チャットエリアが正しい高さに調整されること。

## 関連ファイル (Related Files)

-   `app/features/chat/hooks/useChat.ts`
-   `app/features/chat/components/ChatInputBar.tsx`
-   `app/features/chat/components/ChatHistory.tsx`
-   `app/contexts/KeyboardHeightContext.tsx`

## 制約条件 (Constraints)

-   スワイプ中にチャットエリアの高さがリアルタイムで視覚的にフィードバックされること。
-   既存の `Animated` API の利用を維持し、可能な限りネイティブパフォーマンスを追求すること。

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:** （実行した計画の要約）
- **結果:** （成功、失敗、発生したエラーなど）
- **メモ:** （次のセッションへの申し送り事項、気づきなど）

---

## AIへの申し送り事項 (Handover to AI)

-   **現在の状況:** チャットエリアのリサイズ時のカクつき問題について、原因分析と解決策の方向性を特定しました。特に、`PanResponder` と `Animated` の連携、および `KeyboardHeightContext` への冗長な更新が問題の根源であると判断しています。
-   **次のアクション:** 上記「実装方針」に記載された内容に基づき、`useChat.ts` の `PanResponder` ロジックの最適化と、`KeyboardHeightContext` への `chatInputBarHeight` 更新の最適化を実装してください。
-   **考慮事項/ヒント:** `setChatInputBarHeight` のデバウンス/スロットリングには、`lodash.debounce` や `lodash.throttle` のようなユーティリティ関数、またはカスタムフックの利用を検討してください。