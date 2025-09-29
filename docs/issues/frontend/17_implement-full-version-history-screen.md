---
title: "バージョン履歴画面の全機能実装"
id: 17
status: new
priority: high
attempt_count: 0
tags: [UI, versioning, data]
---

## 概要 (Overview)

アプリケーションのバージョン履歴画面（`VersionHistoryScreen`）に、ノートの過去バージョン一覧表示、選択したバージョンとの差分表示、および過去バージョンへの復元機能を実装します。

## 背景 (Background)

現在の`VersionHistoryScreen`はプレースホルダーであり、ユーザーはノートの編集履歴を確認したり、過去の状態に戻したりすることができません。これはユーザーが安心して編集作業を進める上で不可欠な機能であり、ユーザー物語「4. 過去のバージョンへの復元」で明確に要求されています。

## 受け入れ条件 (Acceptance Criteria)

- [ ] `VersionHistoryScreen`で、選択されたノートの全バージョンが時系列順に表示されること。
- [ ] 各バージョンについて、作成日時、更新日時、簡単な内容プレビューなどが表示されること。
- [ ] ユーザーが特定のバージョンを選択すると、現在のノート内容とそのバージョンとの差分が`DiffViewScreen`で表示されること。
- [ ] `DiffViewScreen`で差分を確認後、ユーザーが選択したバージョンにノートを復元できること。
- [ ] 復元操作が成功した後、`NoteEditScreen`に復元された内容が反映されて表示されること。
- [ ] バージョン管理のデータが`storageService`または専用のサービスで適切に管理されていること。

## 関連ファイル (Related Files)

- `src/features/version-history/VersionHistoryScreen.tsx`
- `src/navigation/RootNavigator.tsx`
- `src/navigation/types.ts`
- `src/store/noteStore.ts`
- `src/services/storageService.ts` (バージョン履歴の取得・管理ロジック)
- `src/services/diffService.ts`
- `src/features/diff-view/DiffViewScreen.tsx`
- `docs/specifications/requirements.md`
- `docs/specifications/screen-transitions.md`
- `docs/specifications/user-stories.md`

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:**
- **結果:**
- **メモ:**

---
