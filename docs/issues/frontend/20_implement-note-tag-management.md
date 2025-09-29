---
title: "ノートのタグ管理機能の実装"
id: 20
status: new
priority: medium
attempt_count: 0
tags: [UI, data, organization]
---

## 概要 (Overview)

ノートにタグを付与し、管理するためのUIとロジックを実装します。これにより、ユーザーはノートをカテゴリ分けし、効率的に整理・検索できるようになります。

## 背景 (Background)

現在のノートアプリでは、ノートにタグを付与する機能がUIに存在しません。`Note`インターフェースには`tags`プロパティがあり、`noteStore`の検索機能でもタグが考慮されていますが、ユーザーがタグを操作する手段がないため、この機能が活用されていません。ノートの整理と検索性を向上させるために、タグ管理機能の実装が必要です。

## 受け入れ条件 (Acceptance Criteria)

- [ ] ノート編集画面（`NoteEditScreen`）に、タグの追加・編集・削除ができるUIが実装されていること。
- [ ] 既存のタグから選択したり、新しいタグを作成したりできること。
- [ ] ノート一覧画面（`NoteListScreen`）で、タグによるフィルタリングまたは検索ができること。
- [ ] タグ情報はノートデータと共に永続化され、正しく保存・読み込みができること。
- [ ] タグの入力は、視覚的に分かりやすく、使いやすいインターフェースであること（例: チップ形式の表示、オートコンプリート）。

## 関連ファイル (Related Files)

- `src/features/note-edit/NoteEditScreen.tsx`
- `src/features/note-list/NoteListScreen.tsx`
- `src/store/noteStore.ts`
- `src/services/storageService.ts`
- `src/types/note.ts`

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:**
- **結果:**
- **メモ:**

---
