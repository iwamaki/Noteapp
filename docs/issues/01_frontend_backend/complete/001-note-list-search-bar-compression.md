---
title: "[B]_[001]_NoteListScreenの検索バーがヘッダーで圧縮される"
id: 001
status: resolved
priority: medium
attempt_count: 1
tags: [UI, navigation, bug, frontend]
---

## 概要 (Overview)

NoteListScreen において、検索バーがアクティブな際にヘッダーに表示されるが、その表示領域が左側に圧縮され、期待通りに広がらない。

## 背景 (Background)

検索バーのコンポーネント化と、アクティブ時のヘッダーレイアウト調整を試みたが、`react-navigation` のヘッダーの挙動により、検索バーが十分に広がらない問題が発生している。

## 実装方針 (Implementation Strategy)

`react-navigation` のヘッダーレイアウトの挙動を詳細に調査し、`headerTitle` がより広いスペースを占めるための適切な設定またはカスタムヘッダーの実装方法を検討する。

## 受け入れ条件 (Acceptance Criteria)

- [ ] 検索バーがアクティブな際に、ヘッダー内で視覚的に十分な幅を確保して表示されること。
- [ ] 検索バーの入力フィールドが、左右に不自然に圧縮されずに表示されること。
- [ ] キャンセルボタンが適切に表示され、機能すること。

## 関連ファイル (Related Files)

- `app/screen/note-list/NoteListScreen.tsx`
- `app/screen/note-list/components/NoteListSearchBar.tsx`
- `app/screen/note-list/hooks/useNoteListHeader.tsx`
- `app/components/CustomHeader.tsx`

## 制約条件 (Constraints)

- 既存の `react-navigation` のヘッダーシステムを可能な限り活用すること。
- UI/UXを損なわないこと。

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:** 検索バーをコンポーネント化し、`NoteListScreen.tsx` で `isSearchActive` が `true` の場合に `useNoteListHeader` に渡す `leftButtons` を空の配列にし、`rightButtons` はキャンセルボタンを含むようにした。`NoteListSearchBar` 内部の `paddingHorizontal` も `isSearchActive` に応じて調整した。
- **結果:** 型チェックとリンティングはパスしたが、検索バーはヘッダーの左側に圧縮されたままだった。
- **メモ:** `react-navigation` のヘッダーレイアウトの挙動が、`headerTitle` に割り当てるスペースを固定している可能性がある。

---

## AIへの申し送り事項 (Handover to AI)

- **現在の状況:** `NoteListScreen` の検索バーがヘッダーで左側に圧縮されて表示される問題が発生している。`NoteListSearchBar` のコンポーネント化とヘッダーの左右ボタンの調整を試みたが、問題は解決していない。
- **次のアクション:** `react-navigation` のヘッダーの `headerTitle` のレイアウトに関する詳細な調査を行い、検索バーが適切に表示されるように修正する。
- **考慮事項/ヒント:** `react-navigation` の `headerTitleContainerStyle` や `headerTitleAlign` などのオプション、または `CustomHeader` コンポーネントの `centerSection` の `flex` 設定が関連している可能性がある。