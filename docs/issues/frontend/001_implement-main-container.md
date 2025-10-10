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

## 詳細実装計画 (Detailed Implementation Plan)

### 📊 現状分析 (Current State Analysis)

既存の画面コンポーネントの共通パターン：
- すべて `flex: 1` のルートViewを持つ
- ThemeContextから `colors` を取得して背景色を設定
- 独自のローディング表示（ActivityIndicator）を実装
- ChatInputBarを含む画面が多い（NoteEdit、NoteList）
- 背景色が2種類：`colors.background` と `colors.secondary`

### 🎯 実装アプローチ (Implementation Approach)

#### **Phase 1: MainContainerコンポーネントの作成**

**ファイル**: `app/components/MainContainer.tsx`

**型定義**:
```typescript
interface MainContainerProps {
  children: React.ReactNode;
  isLoading?: boolean;              // ローディング表示の制御
  backgroundColor?: string;          // 背景色のオーバーライド（デフォルト: colors.background）
  style?: ViewStyle;                 // ルートViewへの追加スタイル
  contentContainerStyle?: ViewStyle; // コンテンツコンテナへの追加スタイル
}
```

**実装の詳細**:
1. `useTheme()` フックでテーマ（colors, spacing, typography）にアクセス
2. ルート要素: `<View style={{ flex: 1, backgroundColor: backgroundColor || colors.background, ...style }}>`
3. コンテンツコンテナ: `<View style={[{ flex: 1 }, contentContainerStyle]}>`
4. ローディング時: 画面中央に `<ActivityIndicator size="large" color={colors.primary} />` を表示
5. ローディング中は children を非表示にし、完全にローディング表示のみを表示

**設計方針**:
- **シンプル版**を採用（ローディング時は全画面オーバーレイでchildrenを完全に隠す）
- 必要に応じて将来的に柔軟版（`loadingMode` プロップ）に拡張可能

#### **Phase 2: 各画面のリファクタリング**

##### **2.1 DiffViewScreen** (複雑度: ★☆☆☆☆)
**現状**: 最もシンプルな構造
- トップレベルViewを `<MainContainer>` に置き換え
- スタイル定義から `container` を削除

**変更例**:
```tsx
// Before
<View style={styles.container}>
  <DiffViewer ... />
</View>

// After
<MainContainer>
  <DiffViewer ... />
</MainContainer>
```

##### **2.2 VersionHistoryScreen** (複雑度: ★★☆☆☆)
**課題**:
- FlatListを直接返している構造
- ローディング、エラー、空状態の条件分岐が分散

**解決策**:
```tsx
<MainContainer
  backgroundColor={colors.secondary}
  isLoading={loading}
>
  {error ? (
    <View style={styles.centered}>
      <Text style={styles.errorText}>Error: {error}</Text>
    </View>
  ) : versions.length === 0 ? (
    <View style={styles.centered}>
      <Text style={styles.emptyText}>No version history found.</Text>
    </View>
  ) : (
    <FlatList
      data={versions}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
    />
  )}
</MainContainer>
```

- 早期リターンしていた loading と error をMainContainerで統一的に処理
- `styles.centered` は引き続き使用（MainContainerの中で中央配置）

##### **2.3 NoteListScreen** (複雑度: ★★★☆☆)
**課題**:
1. ローディング中もChatInputBarを表示する必要がある
2. FlatListのrefresh機能を使用している
3. 初回ローディングとリフレッシュローディングの区別

**解決策**:
```tsx
<MainContainer
  backgroundColor={colors.secondary}
  isLoading={loading.isLoading && notes.length === 0} // 初回ローディングのみ全画面表示
>
  {notes.length === 0 && !loading.isLoading ? (
    <NoteListEmptyState ... />
  ) : (
    <FlatList
      data={notes}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      onRefresh={fetchNotes}
      refreshing={loading.isLoading} // リフレッシュローディングはFlatListで表示
      contentContainerStyle={[styles.listContent, { paddingBottom: CHAT_INPUT_HEIGHT + spacing.xl }]}
    />
  )}
  <ChatInputBar />
  <NoteListFabButton ... />
</MainContainer>
```

- 初回ローディング（`notes.length === 0`）: MainContainerの `isLoading` を使用
- リフレッシュローディング: FlatListの `refreshing` プロップを使用
- 以前の早期リターンを削除し、条件分岐を統一

##### **2.4 NoteEditScreen** (複雑度: ★★★★☆)
**課題**:
1. キーボード対応のAnimated.Viewが存在
2. `paddingBottomAnim` でキーボードの高さに応じて動的にパディングを変更
3. ChatInputBarとの共存

**解決策**:
```tsx
<MainContainer isLoading={isLoading}>
  <Animated.View style={[{ flex: 1 }, { paddingBottom: paddingBottomAnim }]}>
    <FileEditor
      filename={title}
      initialContent={content}
      mode={viewMode}
      onModeChange={setViewMode}
      onContentChange={setContent}
    />
  </Animated.View>
  <ChatInputBar />
  <CustomModal ... />
</MainContainer>
```

- MainContainerの内部でAnimated.Viewを使用（推奨アプローチ）
- `isLoading` が `true` の場合、MainContainerがローディング表示を行い、Animated.Viewは非表示
- 既存のローディングロジック（`loadingContainer`スタイル）を削除

### ⚠️ 潜在的な課題と対策 (Potential Issues and Solutions)

#### **1. ChatInputBarの配置**
**課題**: issueでは「MainContainerの内部には含めない」とあるが、実際の画面構造ではMainContainer内に配置する必要がある

**対策**: MainContainerは単純なレイアウトコンテナとして設計し、ChatInputBarも含めて柔軟に配置できるようにする。制約条件を「ChatInputBarの表示や動作に影響を与えないこと」と解釈し、MainContainerはChatInputBarを特別扱いせず、childrenとして受け入れる。

#### **2. Animated.Viewとの互換性**
**課題**: NoteEditScreenのキーボード対応アニメーションをどう扱うか

**対策**: MainContainerの内部でAnimated.Viewを使用する方式を採用。MainContainerの `contentContainerStyle` を使用しないことで、Animated.Viewの完全な制御を維持。

#### **3. FlatListのcontentContainerStyle**
**課題**: NoteListScreenとVersionHistoryScreenはFlatListの `contentContainerStyle` でパディングを設定している

**対策**: MainContainerの `contentContainerStyle` はFlatListには直接影響しないため、FlatList側で引き続き `contentContainerStyle` を設定。MainContainerは外側のコンテナのみを提供。

#### **4. 条件分岐の統一**
**課題**: VersionHistoryScreenの早期リターン（loading, error）をどう扱うか

**対策**: 早期リターンを削除し、すべての状態をMainContainer内で条件分岐で処理。これにより、コードの一貫性が向上。

### 📝 実装順序 (Implementation Order)

1. ✅ **MainContainer.tsx** の作成
   - 基本的なコンポーネント構造
   - Props定義（children, isLoading, backgroundColor, style, contentContainerStyle）
   - useTheme()フックの統合
   - ローディング表示ロジック

2. ✅ **DiffViewScreen** のリファクタリング（最もシンプル、リスク最小）
   - トップレベルViewをMainContainerに置き換え
   - スタイル定義の削減
   - 動作確認

3. ✅ **VersionHistoryScreen** のリファクタリング
   - MainContainerの導入
   - 早期リターンの削除と条件分岐の統一
   - FlatListのスタイル調整
   - 動作確認

4. ✅ **NoteEditScreen** のリファクタリング（Animated対応が必要）
   - MainContainerの導入
   - Animated.Viewの配置
   - ローディングロジックの削除
   - キーボードアニメーションの動作確認

5. ✅ **NoteListScreen** のリファクタリング（ローディング処理が複雑）
   - MainContainerの導入
   - 初回ローディングとリフレッシュローディングの分離
   - 早期リターンの削除
   - FlatListとの統合確認

6. ✅ **最終確認とコードレビュー**
   - すべての画面の動作確認
   - コード量の削減を確認
   - 受け入れ条件の達成を確認

### 🎨 設計判断 (Design Decisions)

**採用する設計**: シンプル版（Option A）
- ローディング表示は常に全画面オーバーレイ
- `isLoading === true` の場合、childrenを完全に非表示
- 将来的にオーバーレイモード（半透明背景で子要素も表示）が必要になった場合は、`loadingMode` プロップを追加可能

**背景色のデフォルト**: `colors.background`
- より汎用的なデフォルト値として設定
- `colors.secondary` が必要な画面（NoteList, VersionHistory）では明示的に指定

**contentContainerStyleの用途**:
- 主にNoteEditScreenのAnimated.View用
- FlatListには直接影響しない（FlatList自身の `contentContainerStyle` を使用）

### ✅ 受け入れ条件の達成見込み (Acceptance Criteria Feasibility)

| 受け入れ条件 | 達成見込み | 備考 |
|------------|----------|------|
| `MainContainer.tsx`の作成 | ⭐⭐⭐⭐⭐ | 技術的障壁なし |
| `useTheme()`の利用 | ⭐⭐⭐⭐⭐ | ThemeContextが既に存在 |
| `flex: 1`と`colors.background` | ⭐⭐⭐⭐⭐ | 標準的な実装 |
| `backgroundColor`でオーバーライド | ⭐⭐⭐⭐⭐ | Props経由で簡単に実装 |
| `isLoading`でローディング表示 | ⭐⭐⭐⭐⭐ | ActivityIndicatorで実装 |
| `style`と`contentContainerStyle` | ⭐⭐⭐⭐⭐ | 標準的なReact Nativeパターン |
| 4つの画面のリファクタリング | ⭐⭐⭐⭐☆ | 一部調整が必要だが実現可能 |
| コード量削減と可読性向上 | ⭐⭐⭐⭐⭐ | 重複コードが大幅に削減される |
| `commonStyles.ts`との整合性 | ⭐⭐⭐⭐⭐ | `layout.container`の概念を継承 |

### 🚀 総合評価 (Overall Assessment)

**実装可能性**: ⭐⭐⭐⭐⭐ (5/5)
- 技術的な障壁はなし
- 既存のアーキテクチャとの整合性が高い
- ThemeContextとの統合が自然

**推定工数**: 2-3時間
- MainContainer実装: 30分
- 各画面リファクタリング: 各30分 × 4画面 = 2時間
- テストと調整: 30分

**リスク**: 低
- 既存機能を損なわない設計が可能
- 段階的なリファクタリングで安全に実装できる
- 各画面の複雑度に応じた順序で実装することでリスクを最小化

**期待される効果**:
- コード量: 各画面で約10-20行削減
- 保守性: 共通レイアウトロジックの一元化
- 一貫性: すべての画面で統一されたローディング表示とレイアウト
- 拡張性: 将来的な機能追加（SafeAreaView対応、カスタムローディング表示など）が容易

## 開発ログ (Development Log)

---
### 試行 #1

-   **試みたこと:** `MainContainer`コンポーネントの導入に関する分析とissueの作成。
-   **結果:** `MainContainer`の必要性、実装方針、受け入れ条件、関連ファイル、制約条件を明確にしたissueを作成。
-   **メモ:** なし

---

### 試行 #2

-   **試みたこと:** 既存コードベースの詳細分析と具体的な実装計画の策定。
-   **結果:** 4つの画面コンポーネント（DiffViewScreen, NoteEditScreen, NoteListScreen, VersionHistoryScreen）を分析し、各画面の複雑度とリファクタリング方針を明確化。潜在的な課題（ChatInputBarの配置、Animated.Viewとの互換性、FlatListのスタイリング）を特定し、対策を策定。詳細実装計画セクションを追加。
-   **メモ:** すべての画面で実装可能と判断。リスクは低く、段階的なリファクタリングで安全に実装できる。

---

## AIへの申し送り事項 (Handover to AI)

-   **現在の状況:** `MainContainer`コンポーネントの導入に関する分析が完了し、詳細なissueが作成されました。`app/design`ディレクトリのファイルからの知見を反映し、実装方針と制約条件を更新しました。
-   **次のアクション:** 気合い入れて実装してください。
