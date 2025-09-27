---
title: "DiffViewScreen の画面遷移の改善"
id: 5
status: new
priority: high
attempt_count: 0
tags: [UI, navigation, bug]
---

## 概要 (Overview)

> `DiffViewScreen` から `NoteEditScreen` への画面遷移の挙動を改善し、ユーザー体験を向上させます。

## 背景 (Background)

> `DiffViewScreen` から `NoteEditScreen` への遷移に `navigation.navigate` が使用されており、新しい `NoteEdit` 画面がスタックに積まれるため、ユーザー体験が期待と異なる可能性があります。
> 仕様書 (`screen-transitions.md`) には「ノートが保存され、`NoteEditScreen` に戻る」とありますが、現在の実装では「戻る」というよりは「新しい `NoteEditScreen` を開く」に近い状態です。

## 受け入れ条件 (Acceptance Criteria)

> このissueが「完了」と見なされるための具体的な条件をチェックリスト形式で記述します。
>
> - [ ] `DiffViewScreen` からの差分適用後、元の `NoteEditScreen` に適切に戻ることで、ユーザーが違和感なく編集を継続できること。
> - [ ] 画面遷移の挙動が、ユーザーが期待する「戻る」または「更新された画面に遷移する」体験と一致すること。

## 関連ファイル (Related Files)

> このissueに関連すると思われるファイルやディレクトリのリストです。
> LLMがコード分析を始める際のヒントになります。
>
> - `src/features/diff-view/DiffViewScreen.tsx`
> - `src/navigation/RootNavigator.tsx`
> - `src/navigation/types.ts`

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
