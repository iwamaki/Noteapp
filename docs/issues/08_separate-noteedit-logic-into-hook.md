---
title: "NoteEditScreenのロジックをカスタムフックに分離する"
id: 8
status: new
priority: medium
attempt_count: 0
tags: [refactoring, hooks, state-management]
---

## 概要 (Overview)

`NoteEditScreen.tsx` に集中している状態管理とイベントハンドラのロジックを、再利用可能なカスタムフック `useNoteEditor.ts` に分離します。これにより、コンポーネントの責務がUIのレンダリングに集中し、コードの可読性、保守性、テスト容易性が向上します。

## 背景 (Background)

現在の `NoteEditScreen.tsx` は、ノートの読み込み、タイトルの状態管理、コンポーネントのライフサイクルに合わせた副作用（`useEffect`, `useLayoutEffect`）、ナビゲーションヘッダーの設定、保存処理へのディスパッチなど、多くの責務を抱えています。`docs/アドバイスbyclaude.md` でも指摘されているように、この複雑さがコンポーネントの見通しを悪くしています。ロジックをカスタムフックにカプセル化することで、関心の分離を実現し、よりクリーンなアーキテクチャを目指します。

## 受け入れ条件 (Acceptance Criteria)

- [ ] `src/hooks/useNoteEditor.ts` ファイルが作成される。
- [ ] `NoteEditScreen.tsx` 内の、ノートの状態管理（`activeNote`, `draftNote`）、タイトル管理（`title`）、コンテンツ管理（`content`）に関するロジックが `useNoteEditor.ts` に移動される。
- [ ] `NoteEditScreen.tsx` 内の `handleGoToDiff` やヘッダー設定などのロジックが `useNoteEditor.ts` から提供される関数や状態を利用する形にリファクタリングされる。
- [ ] `NoteEditScreen.tsx` はリファクタリング後も、以前と同様にノートの編集、保存（差分表示への遷移）ができる。
- [ ] アプリケーションが正常にビルドされ、関連する機能が正しく動作する。

## 関連ファイル (Related Files)

- `src/features/note-edit/NoteEditScreen.tsx`
- `src/hooks/useNoteEditor.ts`
- `src/store/noteStore.ts`
- `src/navigation/types.ts`

## 開発ログ (Development Log)

> このissueに関する作業の履歴を時系列で記録します。
> セッションをまたいで作業する際の引き継ぎ情報となります。

---
### 試行 #1

- **試みたこと:** （実行した計画の要約）
- **結果:** （成功、失敗、発生したエラーなど）
- **メモ:** （次のセッションへの申し送り事項、気づきなど）

---
