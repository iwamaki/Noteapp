---
title: "チャット入力バーの高さの動的計算とレイアウト干渉の根本解決"
id: 0 # issueのユニークID
status: new # new | in-progress | blocked | pending-review | completed
priority: medium # high | medium | low
attempt_count: 0 # このissueへの挑戦回数。失敗のたびにインクリメントする
tags: [UI, layout, bug, refactoring]
---

## 概要 (Overview)

`NoteEditScreen` における `ChatInputBar` の高さがハードコードされた定数 (`CHAT_INPUT_HEIGHT`) で管理されているため、`FileEditor` と `ChatInputBar` の間に微妙なレイアウト干渉が発生する可能性がある。`ChatInputBar` の実際の高さを動的に取得し、それに基づいて `FileEditor` の下部パディングを調整することで、レイアウトの正確性と堅牢性を向上させる。

## 背景 (Background)

`NoteEditScreen` では、`FileEditor` のコンテンツが `ChatInputBar` に隠されないよう、`paddingBottom` を調整している。しかし、`ChatInputBar` の高さは内部のコンテンツ（`TextInput` の `multiline` や `padding` など）によって変動する可能性があり、現在の `CHAT_INPUT_HEIGHT` 定数ではその変動に対応しきれていない。これにより、特にプレビューモードで、`FileEditor` のコンテンツと `ChatInputBar` が微妙に重なる問題が報告された。暫定的に `CHAT_INPUT_HEIGHT` の値を調整することで干渉は解消されたが、これは根本的な解決ではない。

## 受け入れ条件 (Acceptance Criteria)

- [ ] `NoteEditScreen` は、`ChatInputBar` の実際の高さを動的に取得し、`FileEditor` の `paddingBottom` に適用すること。
- [ ] キーボードの表示・非表示に関わらず、`FileEditor` のコンテンツと `ChatInputBar` が重ならないこと。
- [ ] `ChatInputBar` のコンテンツ（例: `TextInput` の行数）が変化しても、レイアウト干渉が発生しないこと。
- [ ] iOSおよびAndroidの両プラットフォームで、レイアウトが正しく表示されること。

## 関連ファイル (Related Files)

- `app/features/note-edit/NoteEditScreen.tsx`
- `app/features/chat/ChatInputBar.tsx`
- `app/features/note-edit/components/FileEditor.tsx`
- `app/features/note-edit/components/editors/MarkdownPreview.tsx`

## 制約条件 (Constraints)

- 既存の `ChatInputBar` のキーボードによる位置調整ロジックは維持すること。
- パフォーマンスに大きな影響を与えないこと。

## 開発ログ (Development Log)

### 試行 #1

- **試みたこと:** `NoteEditScreen.tsx` の `CHAT_INPUT_HEIGHT` 定数を、iOS: `78` -> `80`、Android: `66` -> `90` に調整。
- **結果:** レイアウト干渉が解消された。
- **メモ:** これは暫定的な解決策であり、`CHAT_INPUT_HEIGHT` がハードコードされているため、`ChatInputBar` のデザイン変更やプラットフォームによる差異に弱い。動的な高さ計算を導入する必要がある。

### 試行 #2

- **試みたこと:** `NoteEditScreen.tsx` の `CHAT_INPUT_HEIGHT` 定数を、iOS: `80` -> `90`、Android: `90` -> `100` に調整。
- **結果:** レイアウト干渉が解消された。
- **メモ:** 暫定的な解決策として機能しているが、根本的な解決には動的な高さ計算が必要。
