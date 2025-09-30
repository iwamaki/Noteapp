---
title: "ファイルエディタとプレビュー画面にワードラップ切り替え機能を追加"
id: 22
status: new
priority: medium
attempt_count: 0
tags: [UI, feature, word-wrap]
---

## 概要 (Overview)

ファイルエディタ、プレビュー画面、差分表示画面において、テキストのワードラップ（折り返し）機能をオン/オフできる機能を追加します。この機能は、各表示モードのヘッダーに設置されるハンバーガーメニューから切り替え可能とします。

## 背景 (Background)

長い行のテキストを閲覧・編集する際に、画面幅に合わせて自動的に折り返すか、横スクロールで全体を表示するかをユーザーが選択できるようにすることで、視認性と操作性を向上させます。設定画面に移動することなく、各画面のヘッダーから直接切り替えられるようにすることで、利便性を高めます。

## 受け入れ条件 (Acceptance Criteria)

- [ ] ファイルエディタ画面 (`NoteEditScreen`) のヘッダーにハンバーガーメニューが設置されていること。
- [ ] プレビュー画面 (`FileEditor` の `preview` モード) のヘッダーにハンバーガーメニューが設置されていること。
- [ ] 差分表示画面 (`DiffViewScreen`) のヘッダーにハンバーガーメニューが設置されていること。
- [ ] 各画面のハンバーガーメニューをタップすると、ワードラップのオン/オフを切り替えるオプションが表示されること。
- [ ] ワードラップのオン/オフ状態が、各画面のテキスト表示に即座に反映されること。
- [ ] ワードラップの設定は、アプリを再起動しても保持されること（永続化）。
- [ ] ワードラップがオフの場合、長い行は横スクロールで表示されること。
- [ ] ワードラップがオンの場合、長い行は画面幅に合わせて自動的に折り返されること。

## 関連ファイル (Related Files)

- `src/features/note-edit/NoteEditScreen.tsx`
- `src/features/note-edit/components/FileEditor.tsx`
- `src/features/diff-view/DiffViewScreen.tsx`
- `src/features/diff-view/components/DiffViewer.tsx`
- `src/navigation/RootNavigator.tsx`
- `src/components/CustomHeader.tsx` (もしカスタムヘッダーを使用している場合)
- `src/store/settingsStore.ts`
- `src/features/settings/SettingsScreen.tsx`

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:** （実行した計画の要約）
- **結果:** （成功、失敗、発生したエラーなど）
- **メモ:** （次のセッションへの申し送り事項、気づきなど）

---
### 試行 #2

- ...
