---
title: "選択モード終了後にFABボタンが表示されない問題"
id: 28
status: done
priority: high
attempt_count: 0
tags: [UI, fab-button, selection-mode, bug]
---

## 概要 (Overview)

FAB（フローティングアクションボタン）が表示されなくなる問題が発生している。

## 背景 (Background)

issue #26「ノートリストの長押し選択モードと一括操作機能の実装」の実装完了後、以下の動作が確認された：
1. 通常モード時：FABボタンが正常に表示される
2. 選択モード時：FABボタンが非表示になる（期待動作）
3. 選択モード終了後：FABボタンが再表示されない（問題）

ユーザーが新しいノートを作成できない状態となっている。

## 受け入れ条件 (Acceptance Criteria)

- [x] 通常モード時にFABボタンが表示されること
- [x] 選択モード時にFABボタンが非表示になること
- [x] 選択モードを終了（キャンセルボタン押下）した後にFABボタンが再表示されること
- [x] 一括削除・コピー実行後にFABボタンが再表示されること

## 関連ファイル (Related Files)

- `src/features/note-list/NoteListScreen.tsx`
- `src/components/FabButton.tsx`
- `src/store/noteStore.ts`
- `src/features/chat/ChatInputBar.tsx`

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:**
  - デバッグログの追加により動作確認
  - `isSelectionMode: false`, `shouldShow: true`が確認されたが、FABボタンは表示されない
  - コンソールログ: `LOG  NoteListScreen render: {"isSelectionMode": false, "selectedCount": 0}` `LOG  FAB render check: {"isSelectionMode": false, "shouldShow": true}`
- **結果:** 条件的には表示されるはずだが、視覚的にFABボタンが確認できない状態
- **メモ:** ChatInputBarによる重なりまたはz-indexの問題の可能性あり

---