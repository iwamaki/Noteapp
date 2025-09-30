---
title: "ノートリストの長押し選択モードと一括操作機能の実装"
id: 26
status: new
priority: medium
attempt_count: 0
tags: [UI, feature, note-list, selection]
---

## 概要 (Overview)

ノートリスト画面において、ノートアイテムを長押しすることで選択モードに移行し、複数のノートを選択・操作できる機能を追加します。選択モード中はヘッダーに「コピー」と「削除」ボタンを表示し、選択されたノートに対してこれらの操作を実行できるようにします。

## 背景 (Background)

現在、ノートの操作は個別のノート編集画面からのみ可能です。複数のノートを一括で削除したり、複製したりする機能がないため、ユーザーは非効率な操作を強いられています。この機能を追加することで、ユーザーの利便性を向上させ、ノート管理の効率化を図ります。

## 受け入れ条件 (Acceptance Criteria)

- [ ] ノートリストのアイテムを長押しすると、選択モードに移行すること。
- [ ] 選択モード中は、長押しされたアイテムが選択状態になること。
- [ ] 選択モード中は、ヘッダーの右側に「コピー」ボタンと「削除」ボタンが表示されること。
- [ ] 選択モード中は、ヘッダーの左側に「キャンセル」ボタンが表示されること。
- [ ] 選択モード中は、ヘッダーのタイトルが「X件選択中」（Xは選択されたノートの数）と表示されること。
- [ ] 選択モード中にノートアイテムをタップすると、そのノートの選択/選択解除が切り替わること。
- [ ] 「キャンセル」ボタンをタップすると、選択モードが解除され、選択状態がクリアされること。
- [ ] 「削除」ボタンをタップすると、選択されたすべてのノートが削除されること。
- [ ] 「コピー」ボタンをタップすると、選択されたすべてのノートが複製され、新しいノートとしてリストに追加されること。
- [ ] 選択モードが解除されると、ヘッダーが通常の表示に戻ること。
- [ ] 選択されたノートがない状態で「削除」または「コピー」ボタンが押せない（または無効化されている）こと。

## 関連ファイル (Related Files)

- `src/features/note-list/NoteListScreen.tsx`
- `src/components/ListItem.tsx`
- `src/store/noteStore.ts`
- `src/components/CustomHeader.tsx`
- `src/navigation/types.ts`
- `src/services/storageService.ts`

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:**
    - `src/store/noteStore.ts`に選択モードに関する状態（`isSelectionMode`, `selectedNoteIds`）とアクション（`toggleSelectionMode`, `toggleNoteSelection`, `clearSelectedNotes`, `deleteSelectedNotes`, `copySelectedNotes`）を追加する準備として、既存の`noteStore.ts`の内容を分析した。
    - `src/components/ListItem.tsx`, `src/components/CustomHeader.tsx`, `src/navigation/types.ts`の既存コードを分析し、長押し選択モード機能の実装における関連性と必要な変更点を特定した。
- **結果:**
    - `noteStore.ts`に状態とアクションを追加する具体的な計画を立てた。
    - `ListItem.tsx`には`onLongPress`, `isSelected`, `isSelectionMode`プロパティの追加と、タップ挙動の変更が必要であることを確認した。
    - `CustomHeader.tsx`は既存の構造で動的なボタン表示とタイトル変更に対応可能であることを確認した。
    - `navigation/types.ts`は変更不要であることを確認した。
- **メモ:**
    - 次のステップとして、`src/store/noteStore.ts`に選択モード関連の状態とアクションを実装する。
    - その後、`src/components/ListItem.tsx`と`src/features/note-list/NoteListScreen.tsx`を順次修正していく。

---
