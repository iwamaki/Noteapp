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
- `app/screen/note-edit/NoteEditScreen.tsx`
- `app/screen/note-list/NoteListScreen.tsx`

## 制約条件 (Constraints)

- 既存のUI/UXを大きく変更しないこと。
- パフォーマンスに影響を与えないこと。

