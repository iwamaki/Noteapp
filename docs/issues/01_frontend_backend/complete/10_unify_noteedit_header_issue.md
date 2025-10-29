---
title: "NoteEditScreenにヘッダーボタンを統合し、FileEditorのヘッダーを削除する"
id: 10
status: done
priority: medium
attempt_count: 0
tags: [UI, refactor, usability]
---

## 概要 (Overview)

NoteEditScreenとFileEditorでヘッダー（操作ボタン）が二重表示されているため、画面全体の操作ボタンをNoteEditScreenのヘッダーに統合し、FileEditor側のヘッダー（ファイル名・ボタン部分）を削除する。

## 背景 (Background)

現在、NoteEditScreenのナビゲーションヘッダーとFileEditorの独自ヘッダーの両方に「保存」「閉じる」などの操作ボタンが存在し、UIが重複している。ユーザーが操作場所に迷う原因となっているため、操作ボタンをNoteEditScreenに集約し、FileEditor側は編集領域のみを表示するようにしたい。

## 受け入れ条件 (Acceptance Criteria)

- [x] FileEditor.tsxのヘッダー（ファイル名・ボタン部分）が削除されている
- [x] NoteEditScreen.tsxのヘッダーに必要な操作ボタン（保存・閉じる・編集/プレビュー切替等）が統合されている
- [x] UIがすっきりし、操作の重複がなくなっている
- [x] 既存の機能（保存・編集・プレビュー・履歴など）が問題なく動作する

## 関連ファイル (Related Files)

- `src/features/note-edit/NoteEditScreen.tsx`
- `src/features/note-edit/components/FileEditor.tsx`
- `src/components/CustomHeader.tsx`

## 開発ログ (Development Log)

---

### 試行 #1

- **試みたこと:** issueテンプレートに従い、UI重複解消のためのリファクタ案を作成
- **結果:** issue登録
- **メモ:** NoteEditScreenのヘッダー構成見直しとFileEditorの簡素化が必要

---