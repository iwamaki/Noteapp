---
title: "[B:medium]_001_画面共通のMainContainerコンポーネント導入"
id: 001
status: new
priority: B:medium
attempt_count: 0
tags: [UI, refactoring, component]
---

## 概要 (Overview)

アプリケーションの各画面で共通して使用されるレイアウトとスタイリングをカプセル化するための`MainContainer`コンポーネントを導入します。これにより、画面間のデザインの一貫性を保ち、コードの再利用性と保守性を向上させます。特に、既存のテーマシステム（`ThemeContext`）と共通スタイル（`commonStyles`）を最大限に活用し、背景色、ローディング表示、および基本的なレイアウトを一元管理します。

## 背景 (Background)

現在、`NoteEditScreen.tsx`や`NoteListScreen.tsx`など、多くの画面コンポーネントがそれぞれ独自のトップレベルの`View`コンテナを持ち、`flex: 1`や背景色の設定を行っています。また、ローディング状態の表示も各画面で個別に実装されています。この重複するコードは、デザインの一貫性を損なう可能性があり、将来的な変更や機能追加の際に手間を増やす原因となります。

プロジェクトには既に`app/design/theme/ThemeContext.tsx`による動的なテーマ管理と、`app/design/styles/commonStyles.ts`による共通スタイル定義が存在します。`MainContainer`を導入することで、これらの既存のデザインシステムを最大限に活用し、共通処理を一元化することで、開発効率とコード品質の向上を目指します。

## 実装方針 (Implementation Strategy)

1.  `app/components/MainContainer.tsx`として新しいコンポーネントを作成します。
2.  `MainContainer`は、`useTheme()`フックを使用して現在のテーマ（`colors`, `spacing`, `typography`など）にアクセスします。
3.  ルート要素として`View`（または必要に応じて`SafeAreaView`）を使用し、`flex: 1`を適用します。
4.  デフォルトの背景色として、テーマから取得した`colors.background`を適用します。ただし、`backgroundColor`プロパティを受け入れることで、画面固有の背景色（例: `colors.secondary`）を柔軟に設定できるようにします。
5.  `isLoading`プロパティを受け取り、`true`の場合には画面全体を覆う`ActivityIndicator`（テーマの`colors.primary`を使用）を表示する機能を追加します。
6.  `style`および`contentContainerStyle`プロパティを受け取り、画面固有のスタイルやコンテンツコンテナのスタイルを適用できるようにします。これにより、キーボードイベントによるパディング調整など、特定の画面のレイアウト要件に対応できます。
7.  既存の画面コンポーネント（例: `NoteEditScreen.tsx`, `NoteListScreen.tsx`, `DiffViewScreen.tsx`, `VersionHistoryScreen.tsx`）を`MainContainer`を使用するようにリファクタリングします。具体的には、各画面のトップレベルの`View`を`MainContainer`に置き換え、共通のスタイルやローディングロジックを削除します。

## 受け入れ条件 (Acceptance Criteria)

-   [ ] `app/components/MainContainer.tsx`が作成されていること。
-   [ ] `MainContainer`が`useTheme()`フックを利用してテーマにアクセスしていること。
-   [ ] `MainContainer`が`flex: 1`を適用し、デフォルトでテーマに応じた`colors.background`を背景色として持つこと。
-   [ ] `backgroundColor`プロパティを通じて、デフォルトの背景色をオーバーライドできること。
-   [ ] `MainContainer`が`isLoading`プロパティを受け取り、ローディング状態を適切に表示すること（テーマの`colors.primary`を使用）。
-   [ ] `MainContainer`が`style`および`contentContainerStyle`プロパティを通じてカスタムスタイルを適用できること。
-   [ ] `NoteEditScreen.tsx`、`NoteListScreen.tsx`、`DiffViewScreen.tsx`、`VersionHistoryScreen.tsx`が`MainContainer`を使用するようにリファクタリングされ、以前と同様に機能すること。
-   [ ] `MainContainer`の導入により、各画面コンポーネントのコード量が削減され、可読性が向上していること。
-   [ ] `commonStyles.ts`で定義されている`layout.container`の`flex: 1`の概念が`MainContainer`に適切に引き継がれていること。

## 関連ファイル (Related Files)

-   `app/components/MainContainer.tsx` (新規作成)
-   `app/App.tsx` (ルートナビゲーターのコンテキストで`MainContainer`を使用する可能性)
-   `app/screen/**/*.tsx` (既存の画面コンポーネント)
-   `app/design/theme/ThemeContext.tsx` (テーマの利用)
-   `app/design/styles/commonStyles.ts` (共通スタイルの参照)

## 制約条件 (Constraints)

-   既存の画面の機能やユーザー体験を損なわないこと。
-   `ChatInputBar`の表示や動作に影響を与えないこと。`MainContainer`は`ChatInputBar`の存在を考慮したレイアウトを提供しますが、`ChatInputBar`自体は`MainContainer`の内部には含めない方針とします。
-   `commonStyles.ts`の`layout.container`は`backgroundColor: colors.secondary`をデフォルトとしていますが、`MainContainer`ではより汎用的な`colors.background`をデフォルトとし、必要に応じてオーバーライド可能とします。

## 開発ログ (Development Log)

---
### 試行 #1

-   **試みたこと:** `MainContainer`コンポーネントの導入に関する分析とissueの作成。
-   **結果:** `MainContainer`の必要性、実装方針、受け入れ条件、関連ファイル、制約条件を明確にしたissueを作成。
-   **メモ:** なし

---

## AIへの申し送り事項 (Handover to AI)

-   **現在の状況:** `MainContainer`コンポーネントの導入に関する分析が完了し、詳細なissueが作成されました。`app/design`ディレクトリのファイルからの知見を反映し、実装方針と制約条件を更新しました。
-   **次のアクション:** 気合い入れて実装してください。
