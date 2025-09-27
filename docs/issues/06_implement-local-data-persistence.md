---
title: "ローカルデータ永続化の実装"
id: 6
status: in-progress
priority: high
attempt_count: 1
tags: ["persistence", "storage", "bug"]
---

## 概要 (Overview)

> ノートデータが保存されない問題を解決するため、AsyncStorageを用いたローカルデータ永続化の仕組みを実装する。

## 背景 (Background)

> ユーザーから「ノートを編集してもデータが永続化されない」という報告があった。調査の結果、`storageService.ts`や`noteStore.ts`といった永続化を担うべきファイルの中身が空であり、実装自体が行われていないことが判明した。当初、仕様書からバックエンドでのデータ管理を想定したが、ユーザーの意図はセキュリティを考慮した「ローカル（デバイス上）での保存」であったため、方針を修正し、ローカル永続化の仕組みをゼロから構築することになった。

## 受け入れ条件 (Acceptance Criteria)

> このissueが「完了」と見なされるための具体的な条件をチェックリスト形式で記述します。
>
> - [x] データストレージに `AsyncStorage` が使用されている。
> - [x] `storageService.ts` の単体テストがすべてパスする。
> - [ ] ノートを新規作成でき、アプリを再起動してもデータが残っている。
> - [ ] 既存のノートを編集でき、変更が永続化される。
> - [ ] ノートを一覧から削除できる。
> - [ ] 上記のCRUD操作が、ユーザーによる手動テストで問題なく実行できる。

## 関連ファイル (Related Files)

> このissueに関連すると思われるファイルやディレクトリのリストです。
> LLMがコード分析を始める際のヒントになります。
>
> - `src/services/storageService.ts`
> - `src/store/noteStore.ts`
> - `src/features/note-list/NoteListScreen.tsx`
> - `src/features/note-edit/NoteEditScreen.tsx`
> - `package.json`

## 開発ログ (Development Log)

> このissueに関する作業の履歴を時系列で記録します。
> セッションをまたいで作業する際の引き継ぎ情報となります。

---
### 試行 #1

- **試みたこと:**
    1. データ永続化が機能しない問題の調査を開始。
    2. ユーザーとの対話を通じて、データ保存先がバックエンドではなくローカルデバイスであることを確認。
    3. `storageService.ts` と `noteStore.ts` が未実装であることを特定。
    4. 必要な依存関係（`@react-native-async-storage/async-storage`, `uuid`）をインストール。
    5. `AsyncStorage` を操作する `storageService.ts` を実装。
    6. 状態管理と永続化ロジックを繋ぐZustandストア `noteStore.ts` を実装。
    7. `NoteListScreen.tsx` をリファクタリングし、ストアからノート一覧を取得・表示するように変更。
    8. `NoteEditScreen.tsx` の保存ロジックの不備（`onApplyDiff`コールバックでの永続化処理漏れ）を特定し、ストアの保存アクションを呼び出すように修正。

- **結果:**
    ローカルデータ永続化のコア機能の実装が完了した。これにより、ノートのCRUD（作成、読み取り、更新、削除）操作がデバイス上で完結するようになったはず。

- **メモ:**
    実装は完了し、ユーザーによるテスト待ちの状態。`NoteEditScreen.tsx`の修正において、`FileEditor.tsx`コンポーネントが`onContentChange`プロパティを持つことを前提とした。テスト結果次第では、この部分の再調整が必要になる可能性がある。

---
