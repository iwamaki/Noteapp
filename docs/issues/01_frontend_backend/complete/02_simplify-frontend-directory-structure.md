---
title: "フロントエンドのディレクトリ構造をシンプルな形に見直す"
id: 2
status: done
priority: high
tags: [refactoring, architecture, frontend]
---

## 概要 (Overview)

現在のフロントエンドのディレクトリ構造は、アプリの規模に対して複雑すぎるため、よりシンプルでメンテナンスしやすい機能ベース（feature-based）の構造に見直します。

## 背景 (Background)

現状の `screens`, `hooks`, `store` などに役割で分割された構造は、責務が細かくなりすぎており、少しの修正でも複数ファイルを変更する必要があるなど、開発効率を下げている可能性があります。ファイル数が少ない今のうちに、将来の拡張性も保ちつつ、より直感的な構造に修正したいという経緯です。

## 受け入れ条件 (Acceptance Criteria)

- [x] 機能ベース（feature-based）の新しいディレクトリ構造を定義する。
- [x] `docs/specifications/frontend-directory-structure.md` を新しい構造に合わせて更新する。
- [x] `src` ディレクトリ内の既存のファイルを、新しい構造に従って移動・リファクタリングする。
- [x] リファクタリング後、アプリケーションが正常に動作することを確認する。

## 関連ファイル (Related Files)

- `docs/specifications/frontend-directory-structure.md`
- `docs/specifications/requirements.md`
- `docs/specifications/user-stories.md`
- `docs/specifications/screen-transitions.md`
- `src/`

## 開発ログ (Development Log)

> このissueに関する作業の履歴を時系列で記録します。
> セッションをまたいで作業する際の引き継ぎ情報となります。

---
### 完了

- **実施したこと:**
  - 機能ベースの新しいディレクトリ構造を定義し、ドキュメントを更新。
  - `src` ディレクトリ内のファイルを新しい構造に従って移動し、インポートパスを修正。
  - `NoteEditScreen`で発生していたコンポーネントのインポートエラーを修正 (`ChatComponent` -> `ChatPanel`)。
  - アプリケーションが正常にビルド・実行できることを確認。
- **結果:** リファクタリングが完了し、Issueの受け入れ条件をすべて満たした。
---
### 試行 #1

- **試みたこと:** 
- **結果:** 
- **メモ:** 

---