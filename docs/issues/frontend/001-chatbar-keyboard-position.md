---
title: "[A:high]_001_チャットバーがキーボードの上に配置されない問題"
id: 001
status: new
priority: high
attempt_count: 1
tags: [UI, keyboard, bug]
---

## 概要 (Overview)

チャットバーがキーボードの上に正しく配置されない問題。アプリをバックグラウンドからフォアグラウンドに戻した際に発生する。

## 背景 (Background)

ユーザーからの報告。アプリを切り替えて戻ってきた際に、チャットバーがキーボードの上に配置されなくなる。

## 実装方針 (Implementation Strategy)

問題の根本原因を再調査し、より堅牢な解決策を特定する。特に、React Native のキーボード回避動作と `SafeAreaInsets` の相互作用、およびアプリのライフサイクルイベントがレイアウトに与える影響について深く掘り下げる必要がある。

## 受け入れ条件 (Acceptance Criteria)

- [ ] アプリをバックグラウンドからフォアグラウンドに戻しても、チャットバーがキーボードの上に正しく配置されること。
- [ ] キーボードの表示/非表示に応じて、チャットバーがスムーズに移動すること。

## 関連ファイル (Related Files)

- `app/features/chat/layouts/useChatLayoutMetrics.ts`
- `app/features/chat/components/ChatInputBar.tsx`
- `app/features/chat/layouts/ChatLayout.tsx`
- `app/App.tsx`
- `app/navigation/RootNavigator.tsx`

## 制約条件 (Constraints)

- 既存のUI/UXを大きく変更しないこと。
- パフォーマンスに影響を与えないこと。

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:** `useChatLayoutMetrics.ts` に `AppState` リスナーと `Keyboard.metrics()` を追加し、アプリのフォアグラウンド/バックグラウンド遷移時にキーボードの可視性状態を正確に更新するようにした。
- **結果:** `npm run type-check` は成功したが、ユーザーからの報告によると現象は改善されなかった。
- **メモ:** `AppState` と `Keyboard.metrics()` を使用したアプローチでは不十分だった可能性がある。キーボードの表示状態の検出、またはレイアウトの再計算/再描画のトリガー方法に問題があるかもしれない。

---

## AIへの申し送り事項 (Handover to AI)

- **現在の状況:** `useChatLayoutMetrics.ts` に `AppState` と `Keyboard.metrics()` を使用した修正を適用したが、問題は解決していない。
- **次のアクション:** 問題の根本原因を再調査し、より堅牢な解決策を特定する。特に、React Native のキーボード回避動作と `SafeAreaInsets` の相互作用、およびアプリのライフサイクルイベントがレイアウトに与える影響について深く掘り下げる必要がある。
- **考慮事項/ヒント:**
    - `KeyboardAvoidingView` の使用を検討する。
    - `react-native-safe-area-context` の `insets` がアプリのライフサイクルイベントで正しく更新されているか確認する。
    - `Platform.OS === 'ios'` と `Platform.OS === 'android'` でのキーボードイベントの挙動の違いを再確認する。
    - `useChatLayoutMetrics.ts` の `chatInputBarBottomPadding` の計算ロジックを再検討する。
