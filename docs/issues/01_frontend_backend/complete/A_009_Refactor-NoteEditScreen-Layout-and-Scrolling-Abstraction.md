---
title: "A_009_Refactor_NoteEditScreen_Layout_and_Scrolling_Abstraction"
id: 9
status: done
priority: high
attempt_count: 0
tags: [architecture, UI, layout, scrolling, refactoring]
---

## 概要 (Overview)

`NoteEditScreen`におけるUIコンポーネントのレイアウトとスクロール管理の責任を、関心事の分離の原則に基づき再構築する。個々のコンテンツ表示コンポーネント（`TextEditor`, `MarkdownPreview`）からレイアウト・スクロールの責任を完全に分離し、`NoteEditScreen`がその責任を一元的に担うことで、UIの柔軟性、安定性、保守性を飛躍的に向上させる。

## 背景 (Background)

現在の実装では、`FileEditor`、`TextEditor`、`MarkdownPreview`といったコンテンツ表示コンポーネントが、自身のコンテンツレンダリングロジックと、レイアウト（パディング、サイズ調整）およびスクロール管理のロジックを混在させている。この関心事の混在は、以下の深刻な問題を引き起こしている：

-   **密結合と脆弱性:** コンポーネントが特定のレイアウトやスクロール動作に強く依存しており、一方の変更が予期せず他方に影響を与え、連鎖的なバグ（例: パディングの消失、スクロールバーの不表示、レイアウトの崩れ）を引き起こす。
-   **低い構成可能性と再利用性:** コンポーネントが自身のレイアウト制約を持つため、異なるコンテキストやレイアウトで再利用することが困難である。
-   **デバッグの複雑性:** レイアウトやスクロールの問題の原因が複数のコンポーネントに分散しているため、問題の特定と解決が非常に困難である。
-   **コードの可読性と保守性の低下:** ロジックが分散し、コンポーネントの役割が不明確であるため、コードの理解や変更が困難である。

これらの問題を根本的に解決するため、UIコンポーネントの責任を明確に分離し、より抽象度の高いアーキテクチャを導入する必要がある。

## 実装方針 (Implementation Strategy)

UIコンポーネントを「コンテンツコンポーネント」と「レイアウト/コンテナコンポーネント」に明確に分離する。

1.  **「コンテンツのみ」コンポーネントの定義と実装:**
    *   **`TextEditor.tsx`:**
        *   純粋な`TextInput`コンポーネントとして再構築する。
        *   自身の`ScrollView`実装を完全に削除する。
        *   コンテンツのレンダリング（`value`, `onChangeText`）と、`wordWrap`プロパティに応じた`TextInput`の**固有のサイズ調整**（特に`wordWrap: false`時の水平方向の幅）のみに責任を持つ。
        *   `onContentSizeChange`などのメカニズムを利用して、コンテンツの幅/高さに基づいて`TextInput`が適切に拡張するようにする。
        *   パディングや背景色などのスタイリングは、プロップとして受け取るか、自身のスタイルシートで定義するが、親のレイアウトに影響を与えるような`flex`プロパティは持たない。
    *   **`MarkdownPreview.tsx`:**
        *   純粋な`Markdown`レンダリングコンポーネントとして再構築する。
        *   自身の`ScrollView`実装を完全に削除する。
        *   マークダウンコンテンツのレンダリングのみに責任を持つ。
        *   コンテンツのサイズに合わせて自然に拡張するようにする。
    *   **`FileEditor.tsx`:**
        *   「モードスイッチャー」としての役割に特化する。
        *   自身の`ScrollView`実装を完全に削除する。
        *   `mode`プロップに基づいて、`TextEditor`、`MarkdownPreview`、または単純な`Text`コンポーネントのいずれかをレンダリングする。
        *   コンテンツとスタイリングプロップを子コンポーネントに透過的に渡す。

2.  **`NoteEditScreen.tsx`における「スクロール可能なコンテンツコンテナ」の実装:**
    *   `NoteEditScreen.tsx`を、エディタコンテンツ全体の**主要なレイアウトおよびスクロールマネージャー**として機能させる。
    *   `FileEditor`コンポーネントをラップする**単一の柔軟な`ScrollView`**を導入する。
    *   この`ScrollView`は以下の責任を負う：
        *   `useKeyboardHeight`から取得した`chatBarOffset`を利用し、キーボードの表示に合わせてコンテンツの`paddingBottom`を動的に調整する。
        *   コンテンツの周囲に一貫したパディングと背景色を提供する。
        *   `wordWrap`の状態と、内部のコンテンツコンポーネントの固有のサイズに基づいて、**垂直および水平の両方のスクロール**を適切に有効化・管理する。
        *   コンテンツがオーバーフローした際に、スクロールバーが常に可視であることを保証する。
        *   `wordWrap: false`の場合の水平スクロールは、`ScrollView`の`horizontal`プロップと、`contentContainerStyle`内の`flexDirection: 'row'`および`alignItems: 'flex-start'`（または`flexGrow: 1`）の組み合わせで実現する。

## 受け入れ条件 (Acceptance Criteria)

- [ ] `TextEditor.tsx`、`MarkdownPreview.tsx`、`FileEditor.tsx`の各コンポーネントから、`ScrollView`およびレイアウト管理（`flex`プロパティ、`minWidth`など）のロジックが完全に削除されていること。
- [ ] `TextEditor.tsx`は、`wordWrap`が`false`の場合に、`onContentSizeChange`を利用してコンテンツの幅に合わせて正確に水平方向に拡張すること。
- [ ] `NoteEditScreen.tsx`が、エディタコンテンツ全体をラップする単一の`ScrollView`を保持し、その`ScrollView`が画面の利用可能な領域を適切に占有していること。
- [ ] `wordWrap`が`true`の場合、`NoteEditScreen`の`ScrollView`がコンテンツの垂直スクロールを正しく処理し、スクロールバーが常に可視であること。
- [ ] `wordWrap`が`false`の場合、`NoteEditScreen`の`ScrollView`がコンテンツの水平スクロールを正しく処理し、スクロールバーが常に可視であること。
- [ ] `wordWrap`が`false`の場合、エディタコンテンツの左右に適切なパディングが適用され、タップやフォーカス時にパディングが消失するなどの異常な挙動がないこと。
- [ ] `NoteEditScreen`の`ScrollView`が、キーボードの表示に合わせてコンテンツの`paddingBottom`を動的に調整し、コンテンツがキーボードに隠れないこと。
- [ ] `NoteEditScreen`内のエディタコンテンツのレイアウトが安定しており、異常なレンダリングの問題が発生しないこと。
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

- **現在の状況:** `NoteEditScreen`内のエディタコンテンツのスクロールとレイアウト管理が複数のコンポーネントに分散しており、複雑なレンダリングの問題を引き起こしている。これまでの個別の修正では根本的な解決に至っていない。ユーザーは、このissueドキュメントに記載された抽象度の高いリファクタリング戦略の実行を期待している。
- **次のアクション:** 上記の「実装方針」セクションに記載された戦略に基づき、`NoteEditScreen.tsx`にスクロールとレイアウトの責任を一元化するリファクタリング計画を実行する。
- **考慮事項/ヒント:**
    *   まず、`TextEditor.tsx`、`MarkdownPreview.tsx`、`FileEditor.tsx`から`ScrollView`関連のロジックを削除し、純粋なレンダリングコンポーネントにすることから始める。
    *   `TextEditor`の`TextInput`のコンテンツベースの幅調整は、`onContentSizeChange`を使用し、`useState`で幅を管理することで実現する。この際、`TextInput`の`paddingHorizontal`も考慮に入れる必要がある。
    *   その後、`NoteEditScreen.tsx`にメインの`ScrollView`を導入し、キーボード回避ロジックと`wordWrap`に応じたスクロール挙動を実装する。
    *   `NoteEditScreen`の`ScrollView`の`contentContainerStyle`に`flexDirection: 'row'`と`alignItems: 'flex-start'`を適用することで、`wordWrap: false`時の水平スクロールとパディングを適切に処理できる可能性がある。
