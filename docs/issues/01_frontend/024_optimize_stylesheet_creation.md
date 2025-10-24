---
filename: 024_optimize_stylesheet_creation
id: 24
status: new
priority: A:high
attempt_count: 0
tags: [performance, rendering, optimization, UI]
---

## 概要 (Overview)

画面遷移時に「一瞬だけちゃんとレンダリングされていない瞬間」が発生する主要因の一つとして、すべてのコンポーネントで`StyleSheet.create()`が毎レンダリング時に再作成されている問題を解決する。

## 背景 (Background)

現在、以下のコンポーネントで`StyleSheet.create()`がコンポーネント関数内で呼び出されており、テーマの`colors`や`typography`を参照するたびに新しいスタイルオブジェクトが生成されている：

- `ChatInputBar.tsx` (70-125行目)
- `FileEditScreen.tsx` (113-124行目)
- `SettingsScreen.tsx` (85-126行目)
- その他多数のコンポーネント

**現状のアンチパターン**:
```tsx
const ChatInputBar = () => {
  const { colors } = useTheme();

  // 毎回再作成される！
  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.secondary,
      // ...
    },
  });

  return <View style={styles.container} />;
};
```

この問題により：
1. 毎レンダリングで不要なオブジェクトが生成される
2. メモリ圧迫とガベージコレクション頻度の増加
3. 画面遷移時の初期レンダリングコストが高い
4. React Nativeのスタイル最適化が効かない

## 実装方針 (Implementation Strategy)

### アプローチ1: useMemoによるメモ化（推奨）

テーマが変わる場合のみスタイルを再作成する：

```tsx
const ChatInputBar = () => {
  const { colors, typography } = useTheme();

  const styles = useMemo(
    () => StyleSheet.create({
      container: {
        backgroundColor: colors.secondary,
        borderTopColor: colors.border,
        // ...
      },
      // ...
    }),
    [colors, typography] // テーマが変わったときのみ再作成
  );

  return <View style={styles.container} />;
};
```

### アプローチ2: カスタムフック化（大規模なスタイルの場合）

```tsx
// hooks/useThemedStyles.ts
const useThemedStyles = () => {
  const { colors, typography, spacing } = useTheme();

  return useMemo(
    () => StyleSheet.create({
      // すべてのスタイル定義
    }),
    [colors, typography, spacing]
  );
};

// Component
const ChatInputBar = () => {
  const styles = useThemedStyles();
  // ...
};
```

### アプローチ3: 動的スタイルの分離

頻繁に変わる値（`keyboardHeight`など）は、インラインスタイルとして分離：

```tsx
const ChatInputBar = () => {
  const { colors } = useTheme();
  const { keyboardHeight } = useKeyboardHeight();

  const staticStyles = useMemo(
    () => StyleSheet.create({
      container: {
        backgroundColor: colors.secondary,
        // 静的なスタイル
      },
    }),
    [colors]
  );

  const dynamicStyle = useMemo(
    () => ({ bottom: keyboardHeight }),
    [keyboardHeight]
  );

  return <View style={[staticStyles.container, dynamicStyle]} />;
};
```

## 受け入れ条件 (Acceptance Criteria)

- [ ] `ChatInputBar.tsx`のスタイルが`useMemo`でメモ化されている
- [ ] `FileEditScreen.tsx`のスタイルが`useMemo`でメモ化されている
- [ ] `SettingsScreen.tsx`のスタイルが`useMemo`でメモ化されている
- [ ] `FileListScreen.tsx`のスタイルが`useMemo`でメモ化されている
- [ ] その他の主要画面コンポーネントのスタイルが最適化されている
- [ ] 動的に変わる値（`keyboardHeight`など）は静的スタイルから分離されている
- [ ] 画面遷移時のレンダリング遅延が体感的に改善されている
- [ ] React DevToolsのProfilerで再レンダリング回数が減少していることを確認
- [ ] メモリプロファイリングでオブジェクト生成数が減少していることを確認

## 関連ファイル (Related Files)

### 最優先対象
- `app/features/chat/components/ChatInputBar.tsx` (70-125行目)
- `app/screen/file-edit/FileEditScreen.tsx` (113-124行目)
- `app/settings/SettingsScreen.tsx` (85-126行目)

### 二次対象（スタイル再作成が発生している可能性が高い）
- `app/screen/file-list/FileListScreen.tsx`
- `app/screen/diff-view/DiffViewScreen.tsx`
- `app/screen/version-history/VersionHistoryScreen.tsx`
- `app/components/MainContainer.tsx`
- その他、`useTheme()`を使用している全コンポーネント

## 制約条件 (Constraints)

- React Nativeの`StyleSheet.create()`のベストプラクティスに従うこと
- テーマ切り替え時には適切にスタイルが更新されること
- パフォーマンス改善を測定可能な形で検証すること（React DevTools Profiler使用）
- 既存のUIの見た目や動作に影響を与えないこと
- コードの可読性を維持すること（過度な最適化は避ける）

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:** （未着手）
- **結果:** （未着手）
- **メモ:** （未着手）

---

## AIへの申し送り事項 (Handover to AI)

- **現在の状況:** Issue作成完了。実装未着手。
- **次のアクション:**
  1. まず`ChatInputBar.tsx`から着手し、スタイルを`useMemo`でメモ化する
  2. 動的スタイル（`bottom: keyboardHeight`）を静的スタイルから分離する
  3. 同様の最適化を`FileEditScreen.tsx`、`SettingsScreen.tsx`に適用する
  4. React DevTools Profilerで改善効果を測定する
- **考慮事項/ヒント:**
  - `keyboardHeight`や`chatInputBarHeight`など頻繁に変わる値は、別の`useMemo`でメモ化すること
  - テーマが変更されたときにスタイルが正しく更新されることを確認すること
  - スタイルの依存配列には、実際に使用しているテーマの値のみを含めること（過剰な依存は避ける）
