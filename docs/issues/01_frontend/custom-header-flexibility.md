---
title: カスタムヘッダーの柔軟性向上
issue_number: (自動採番)
labels: ['enhancement', 'frontend', 'header']
assignees: []
---

## 概要

カスタムヘッダーコンポーネントが、ヘッダーセクションの分割数と幅比率を動的に設定できるようにする。

## 目的

`NoteListScreen`のような特定の画面で、ヘッダー内の要素（例: 検索バー）がより広いスペースを必要とする場合に、柔軟に対応できるようにするため。現在の固定された幅比率では、特定のUI要素が十分に表示されない、または最適なレイアウトにならないという問題がある。

## 現状の問題点

現在の`CustomHeader`は、左:中央:右のセクションが固定の`flex: 1:2:1`で分割されており、中央セクションの幅が制限されています。これにより、`NoteListSearchBar`のような要素が十分に表示されない場合や、他の画面でよりシンプルなヘッダー構成（例: 中央タイトルのみ）が必要な場合に、不要な左右のスペースが生じてしまう可能性があります。

## 提案される解決策

1.  **`CustomHeader`コンポーネントの改修**:
    *   `CustomHeader`コンポーネントを修正し、ヘッダーセクションの分割数とそれぞれの幅比率を、`createHeaderConfig`の引数として受け取れるようにする。
    *   例えば、`flexRatios: number[]`のような新しいプロパティを`HeaderConfig`に追加し、`[1, 3, 1]`（左:中央:右の比率）や`[0, 1, 0]`（中央のみ）といった形で柔軟な設定を可能にする。
    *   既存の`leftButtons`, `title`, `rightButtons`は、それぞれ対応するセクションに配置されるように、内部ロジックを調整する。
    *   `flexRatios`が指定されない場合は、現在のデフォルトである`[1, 2, 1]`が適用されるように、後方互換性を維持する。

2.  **型定義の更新**:
    *   `app/navigation/types.ts`内の`HeaderConfig`型に、新しい`flexRatios`プロパティを追加する。

## 受け入れ条件

*   `CustomHeader`コンポーネントが、動的なセクション分割数と幅比率の設定に対応できること。
*   `flexRatios`プロパティが指定されない場合、既存の`flex: 1:2:1`のレイアウトが維持されること。
*   既存の`useCustomHeader`を利用している全ての画面/カスタムフック（`NoteListScreen`, `NoteEditScreen`, `SettingsScreen`, `VersionHistoryScreen`, `DiffViewScreen`など）が、新しい`CustomHeader`の仕様に対応し、正しく表示されること。
*   特に`NoteListScreen`の検索バーが、必要に応じてより広い幅を使用できるようになること。
*   既存の機能が損なわれないこと。
*   新しいヘッダー設定が、アプリケーション全体のUI/UXガイドラインに沿っていること。

## 影響範囲

*   `app/components/CustomHeader.tsx`
*   `app/navigation/types.ts`
*   `useCustomHeader`を利用している全ての画面/カスタムフック:
    *   `app/screen/note-list/hooks/useNoteListHeader.tsx`
    *   `app/screen/note-edit/hooks/useNoteEditHeader.tsx`
    *   `app/settings/SettingsScreen.tsx`
    *   `app/screen/version-history/VersionHistoryScreen.tsx`
    *   `app/screen/diff-view/hooks/useDiffView.tsx`
