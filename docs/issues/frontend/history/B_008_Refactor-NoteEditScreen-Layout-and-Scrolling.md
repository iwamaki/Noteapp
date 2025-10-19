---
title: "B_008_Refactor_NoteEditScreen_Layout_and_Scrolling"
id: 8
status: done
priority: medium
attempt_count: 0
tags: [UI, layout, scrolling, refactoring]
---

## 概要 (Overview)

`NoteEditScreen`におけるコンテンツのスクロールとレイアウト管理の責任を、個々のエディタコンポーネント（`FileEditor`, `TextEditor`, `MarkdownPreview`）から`NoteEditScreen`自体に一元化する。これにより、複雑なレンダリングの問題を解決し、保守性とコードの可読性を向上させる。

## 背景 (Background)

現在、`NoteEditScreen`内のコンテンツ（テキストエディタ、マークダウンプレビューなど）のスクロールとパディングの管理が、複数のネストされたコンポーネント（`FileEditor`, `TextEditor`, `MarkdownPreview`）に分散している。この分散した責任により、以下のような問題が発生している：
- 縦スクロールバーが正しく表示されない。
- ワードラップオフ時の横方向のパディングが適用されない、または時間差で消える。
- レイアウトの挙動が不安定で、デバッグが困難。
- コンポーネント間の依存関係が複雑になり、コードの可読性と保守性が低下している。
これらの問題を解決するため、スクロールとレイアウトの責任を`NoteEditScreen`に集約し、子コンポーネントをより純粋なレンダリングコンポーネントとして機能させる必要がある。

## 実装方針 (Implementation Strategy)

1.  **`TextEditor.tsx`の簡素化:**
    *   `TextEditor`内のすべての`ScrollView`実装と、`inputWidth`などの関連する状態管理を削除する。
    *   `TextEditor`は純粋な`TextInput`コンポーネントとして機能し、コンテンツのレンダリングと変更通知のみを担当する。
    *   `TextInput`のスタイルは、コンテンツのサイズに合わせて自然に拡張できるように調整する。
2.  **`MarkdownPreview.tsx`の簡素化:**
    *   `MarkdownPreview`内の`ScrollView`実装を削除する。
    *   `MarkdownPreview`は純粋な`Markdown`コンポーネントとして機能し、マークダウンコンテンツのレンダリングのみを担当する。
3.  **`FileEditor.tsx`の簡素化:**
    *   `FileEditor`内のすべての`ScrollView`実装を削除する。
    *   `FileEditor`は、`mode`プロップに基づいて`TextEditor`、`MarkdownPreview`、または単純な`Text`コンポーネントを条件付きでレンダリングするラッパーとして機能する。
    *   コンテンツとスタイリングプロップを子コンポーネントに渡す。
4.  **`NoteEditScreen.tsx`への一元化:**
    *   `FileEditor`コンポーネントをラップする単一の`ScrollView`を導入する。この`ScrollView`が、エディタコンテンツ全体の垂直および水平スクロールを管理する。
    *   `useKeyboardHeight`から取得した`chatBarOffset`（キーボード回避用）を、このメイン`ScrollView`の`contentContainerStyle`の`paddingBottom`に適用する。
    *   `NoteEditScreen.tsx`の`ScrollView`は、`wordWrap`の状態に応じて、垂直および水平の両方のスクロールを適切に処理できるように構成する。具体的には、`wordWrap`が`false`の場合に水平スクロールを有効にするためのロジックを組み込む。
    *   パディングは、このメイン`ScrollView`の`contentContainerStyle`またはその直接の子に適用し、一貫した表示を保証する。

## 受け入れ条件 (Acceptance Criteria)

- [ ] `TextEditor.tsx`からすべての`ScrollView`実装が削除されていること。
- [ ] `MarkdownPreview.tsx`から`ScrollView`実装が削除されていること。
- [ ] `FileEditor.tsx`からすべての`ScrollView`実装が削除されていること。
- [ ] `NoteEditScreen.tsx`が、エディタコンテンツ全体をラップする単一の`ScrollView`を保持していること。
- [ ] `wordWrap`が`true`の場合、`NoteEditScreen`の`ScrollView`がコンテンツの垂直スクロールを正しく処理し、スクロールバーが表示されること。
- [ ] `wordWrap`が`false`の場合、`NoteEditScreen`の`ScrollView`がコンテンツの水平スクロールを正しく処理し、スクロールバーが表示されること。
- [ ] `wordWrap`が`false`の場合、エディタコンテンツの左右に適切なパディングが適用され、消えることがないこと。
- [ ] `NoteEditScreen`の`ScrollView`が、キーボードの表示に合わせてコンテンツの`paddingBottom`を正しく調整すること。
- [ ] `NoteEditScreen`内のエディタコンテンツのレイアウトが安定しており、タップやフォーカス時にパディングが消えるなどの異常な挙動がないこと。
- [ ] 既存の機能（保存、Undo/Redo、ビューモード切り替えなど）が引き続き正しく動作すること。

## 関連ファイル (Related Files)

- `app/screen/note-edit/NoteEditScreen.tsx`
- `app/screen/note-edit/components/FileEditor.tsx`
- `app/screen/note-edit/components/TextEditor.tsx`
- `app/screen/note-edit/components/MarkdownPreview.tsx`
- `app/design/theme/ThemeContext.tsx` (スタイリング関連)
- `app/contexts/KeyboardHeightContext.tsx` (キーボード回避関連)

## 制約条件 (Constraints)

- 既存の`useNoteEditor`フックのロジックは可能な限り維持すること。
- `useKeyboardHeight`からの`keyboardHeight`と`chatInputBarHeight`を利用して、キーボード回避のロジックを維持すること。
- UIデザインガイドラインに沿ったパディングとスクロールバーの表示を維持すること。
- パフォーマンスに悪影響を与えないこと。

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:** `TextEditor.tsx`内の`ScrollView`の`showsVerticalScrollIndicator`と`showsHorizontalScrollIndicator`を明示的に`true`に設定。`styles.scrollViewContainer`から`flex: 1`を削除。`styles.textEditor`から`flex: 1`と`minWidth: '1000%'`を削除。`wordWrap = false`時の`TextInput`の背景を`transparent`に設定（診断用）。`wordWrap = true`時の垂直`ScrollView`に`style={{ flexGrow: 1 }}`を追加。
- **結果:** 縦スクロールバー（ワードラップON時）は表示されたが、横方向のパディング（ワードラップOFF時）が機能せず、縦スクロールバー（ワードラップOFF時）も表示されない。`TextInput`の背景を`transparent`にした診断は、パディングが隠れているわけではないことを示唆。
- **メモ:** 個々のコンポーネントでの`ScrollView`管理が複雑化し、問題が連鎖している。根本的なアプローチの見直しが必要。

---
### 試行 #2

- **試みたこと:** `TextEditor.tsx`の`wordWrap = false`時の`ScrollView`構造を、`View`でラップする形式から、`TextInput`を直接子として持ち、`contentContainerStyle`でパディングを適用する形式に戻した。`TextEditor.tsx`の`styles.textEditor`から`flex: 1`を完全に削除。`TextEditor.tsx`の`wordWrap = false`時の`TextInput`の背景を`transparent`に設定した診断変更を元に戻した。`TextEditor.tsx`の`wordWrap = true`時の垂直`ScrollView`から`style={{ flexGrow: 1 }}`を削除した。
- **結果:** `wordWrap = false`時、右側のパディングがなくなり、入力欄をタップすると左側も時間差で消えるというレンダリングの異常が発生。
- **メモ:** `TextInput`の動的な幅調整が必要な可能性が高い。しかし、根本的な責任の分散が問題であるというユーザーの指摘が最も重要。

---

## AIへの申し送り事項 (Handover to AI)

- **現在の状況:** `NoteEditScreen`内のエディタコンテンツのスクロールとレイアウト管理が複数のコンポーネントに分散しており、複雑なレンダリングの問題を引き起こしている。これまでの個別の修正では根本的な解決に至っていない。
- **次のアクション:** 上記の「実装方針」セクションに記載された戦略に基づき、`NoteEditScreen.tsx`にスクロールとレイアウトの責任を一元化するリファクタリング計画を実行する。
- **考慮事項/ヒント:**
    *   まず、`TextEditor.tsx`、`MarkdownPreview.tsx`、`FileEditor.tsx`から`ScrollView`関連のロジックを削除し、純粋なレンダリングコンポーネントにすることから始める。
    *   その後、`NoteEditScreen.tsx`にメインの`ScrollView`を導入し、キーボード回避ロジックと`wordWrap`に応じたスクロール挙動を実装する。
    *   `TextInput`のコンテンツベースの幅調整は、`onContentSizeChange`を使用するなど、`TextEditor`内で適切に処理する必要がある。
