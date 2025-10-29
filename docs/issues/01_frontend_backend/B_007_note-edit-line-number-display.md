---
title: "B_007_note-edit-line-number-display"
id: 7
status: new
priority: medium
attempt_count: 0
tags: [UI, note-edit, line-numbers]
---

## 概要 (Overview)

Note編集画面の編集エリアに、行番号を表示する機能を追加します。また、ヘッダーの縦三点リーダーボタンから行番号表示のON/OFFを切り替えられるようにします。

## 背景 (Background)

Note編集画面において、コードや構造化されたテキストを扱う際に、行番号が表示されることで視認性や編集効率の向上が期待されます。この機能は、ユーザーからの要望に基づき、より使いやすい編集体験を提供するために必要とされています。

## 実装方針 (Implementation Strategy)

カスタム実装アプローチを採用し、`TextEditor.tsx` 内で行番号とテキスト入力のレイアウトおよびスクロール同期を適切に管理します。具体的には、行番号表示用の `ScrollView` とテキスト入力用の `ScrollView` を並べ、両者のスクロール位置を同期させます。レイアウトの崩れを防ぐため、行番号表示エリアには固定幅を設定します。

## 受け入れ条件 (Acceptance Criteria)

- [ ] Note編集画面の編集エリアの左側に行番号が表示されること。
- [ ] 行番号とテキスト入力エリアのスクロールが垂直方向に同期していること。
- [ ] テキスト入力エリアのワードラップがOFFの場合、水平スクロールが行われ、行番号は固定されたまま垂直スクロールに同期すること。
- [ ] ヘッダーの縦三点リーダーボタン（または適切なUI要素）から行番号表示のON/OFFを切り替えられること。
- [ ] 行番号表示のON/OFFを切り替えても、画面レイアウトが崩れないこと。
- [ ] `npm run type-check` および `npm run lint` がエラーなく通過すること。

## 関連ファイル (Related Files)

- `app/screen/note-edit/components/TextEditor.tsx` (行番号表示とテキスト入力の実装)
- `app/screen/note-edit/NoteEditScreen.tsx` (TextEditorコンポーネントの使用箇所)
- `app/screen/note-edit/hooks/useNoteEditHeader.ts` (ヘッダーの縦三点リーダーボタンの制御)
- `app/screen/note-edit/types.ts` (必要に応じて新しい型定義を追加)
- `app/design/theme/ThemeContext.tsx` (スタイルの調整が必要な場合)

## 制約条件 (Constraints)

- 新しい外部ライブラリは導入しないこと。
- 既存のUI/UXデザインガイドラインを遵守すること。
- パフォーマンスに大きな影響を与えないこと。

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:** `TextEditor.tsx` に `useRef`、`handleScroll`、`lineNumberScrollViewRef`、`textInputScrollViewRef` を追加し、`lineNumberContainer` に固定幅を設定してレイアウトを調整。
- **結果:** レイアウトが崩れる問題が発生し、変更を破棄。
- **メモ:** スクロール同期とレイアウト管理の複雑さを再認識。より段階的かつ慎重なアプローチが必要。

---

## AIへの申し送り事項 (Handover to AI)

- **現在の状況:** 行番号表示機能の実装に着手したが、レイアウトの問題により変更を破棄した。現在は元の状態に戻っている。
- **次のアクション:** 上記の「実装方針」と「改訂された計画 (Custom Implementation - Step-by-Step)」に基づき、`TextEditor.tsx` の修正を段階的に進める。まず、必要なインポートの追加から開始する。
- **考慮事項/ヒント:**
    - `TextEditor.tsx` の `styles` オブジェクトの調整は特に慎重に行うこと。
    - `TextInput` の `lineHeight` と行番号の `lineHeight` が一致するように調整が必要になる可能性がある。
    - `wordWrap` のON/OFFによる水平スクロールの挙動を注意深くテストすること。
