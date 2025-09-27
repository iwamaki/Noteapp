---
title: "バージョン履歴画面 (VersionHistoryScreen) の実装"
id: 3
status: new
priority: medium
attempt_count: 0
tags: [UI, feature, version-control]
---

## 概要 (Overview)

> バージョン履歴画面 (`VersionHistoryScreen`) の実装を行います。

## 背景 (Background)

> 現在、`VersionHistoryScreen` はプレースホルダーであり、機能が実装されていません。
> 要件定義書 (`requirements.md`) および画面遷移 (`screen-transitions.md`) に基づき、ノートの編集履歴表示、過去バージョンの選択、復元機能の実装が必要です。

## 受け入れ条件 (Acceptance Criteria)

> このissueが「完了」と見なされるための具体的な条件をチェックリスト形式で記述します。
>
> - [ ] `NoteEditScreen` または `NoteListScreen` から `VersionHistoryScreen` へ遷移できること。
> - [ ] `VersionHistoryScreen` にノートの過去バージョンが一覧表示されること。
> - [ ] ユーザーが過去のバージョンを選択できること。
> - [ ] 過去バージョンを選択し、復元を試みる際に `DiffViewScreen` が表示され、現在のノート内容と復元対象のバージョンとの差分を確認できること。
> - [ ] `DiffViewScreen` で変更内容を確認し、「適用」ボタンをタップすることで、ノートのバージョンが変更され、`NoteEditScreen` に戻ること。

## 関連ファイル (Related Files)

> このissueに関連すると思われるファイルやディレクトリのリストです。
> LLMがコード分析を始める際のヒントになります。
>
> - `src/features/version-history/VersionHistoryScreen.tsx`
> - `src/navigation/RootNavigator.tsx`
> - `src/navigation/types.ts`
> - `src/features/diff-view/DiffViewScreen.tsx`
> - `src/services/api.ts` (バージョン履歴取得のため)
> - `server/src/routers/notes.py` (バックエンドAPI)
> - `server/src/services/version_service.py` (バックエンドサービス)

## 開発ログ (Development Log)

> このissueに関する作業の履歴を時系列で記録します。
> セッションをまたいで作業する際の引き継ぎ情報となります。

---
### 試行 #1

- **試みたこと:** （実行した計画の要約）
- **結果:** （成功、失敗、発生したエラーなど）
- **メモ:** （次のセッションへの申し送り事項、気づきなど）

---
### 試行 #2

- ...

---
