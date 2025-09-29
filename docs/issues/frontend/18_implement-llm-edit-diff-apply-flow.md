---
title: "LLM編集結果の差分表示・適用フロー実装"
id: 18
status: new
priority: high
attempt_count: 0
tags: [LLM, UI, diff, integration]
---

## 概要 (Overview)

LLMがノート内容を編集するコマンドを発行した場合に、その編集結果をユーザーが確認し、適用するかどうかを選択できる差分表示・適用フローを実装します。具体的には、LLMからの編集結果を`DiffViewScreen`に渡し、ユーザーが変更を承認するプロセスを構築します。

## 背景 (Background)

現在のLLMチャット機能は対話のみで、LLMが提案した編集内容を直接ノートに反映する仕組みがありません。仕様書「2.4. LLM連携チャット機能」では、LLMによる編集後に自動的に差分表示・適用画面が表示されることが要件として定義されており、ユーザーがLLMの提案を安全に統合するために不可欠な機能です。

## 受け入れ条件 (Acceptance Criteria)

- [ ] `ChatPanel`内でLLMがノート内容の編集を提案するコマンド（例: `edit_file`コマンド）を発行した場合、その編集内容が一時的に保持されること。
- [ ] LLMからの編集コマンド受信後、自動的に`DiffViewScreen`へ遷移し、現在のノート内容とLLMが提案した編集内容との差分が表示されること。
- [ ] `DiffViewScreen`では、ユーザーがLLMの提案した変更ブロックを選択的に適用できること。
- [ ] ユーザーが`DiffViewScreen`で「適用」を選択した場合、LLMによる変更がノートに反映され、保存されること。
- [ ] ユーザーが`DiffViewScreen`で「キャンセル」を選択した場合、LLMによる変更は破棄され、元のノート内容が維持されること。
- [ ] `ChatPanel`と`NoteEditScreen`、`DiffViewScreen`間のデータ連携がスムーズに行われること。

## 関連ファイル (Related Files)

- `src/features/chat/ChatPanel.tsx`
- `src/features/note-edit/NoteEditScreen.tsx`
- `src/features/diff-view/DiffViewScreen.tsx`
- `src/services/llmService.ts`
- `src/store/noteStore.ts`
- `src/navigation/types.ts`
- `docs/specifications/requirements.md`
- `docs/specifications/screen-transitions.md`

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:**
- **結果:**
- **メモ:**

---
