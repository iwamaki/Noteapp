---
filename: 025_optimize_fileedit_rendering
id: 25
status: new
priority: A:high
attempt_count: 0
tags: [performance, rendering, FileEditScreen, optimization]
---

## 概要 (Overview)

FileListからFileEdit画面への遷移時に発生する「一瞬だけちゃんとレンダリングされていない瞬間」を解消するため、FileEditScreen関連のフックにおける過剰な再レンダリングと不要な依存関係を最適化する。

## 背景 (Background)

FileEditScreenへの画面遷移時、以下2つの主要な問題が特定された：

### 問題1: useFileEditHeaderの過剰な再レンダリング

`useFileEditHeader.tsx`の`useLayoutEffect`が**18個の依存関係**を持っており、依存関係のいずれかが変わるたびにヘッダー全体が再構築される。

**現状コード** (`app/screen/file-edit/hooks/useFileEditHeader.tsx:120-139`):
```tsx
useLayoutEffect(() => {
  const handleToggleViewMode = () => { /* ... */ };
  const handleShowVersionHistory = () => { /* ... */ };
  const handleShowDiffView = () => { /* ... */ };
  // ... ヘッダー構築ロジック
}, [
  navigation, title, activeFileId, viewMode, isLoading, isEditable,
  isDirty, onTitleChange, onViewModeChange, onSave, onUndo, onRedo,
  canUndo, canRedo, createHeaderConfig, colors,
  originalFileContent, currentContent  // 18個！
]);
```

特に以下の依存関係は頻繁に変わる：
- `isDirty`: ユーザーが編集するたびに変わる
- `canUndo`, `canRedo`: Undo/Redoスタックが変わるたびに変わる
- `currentContent`: テキスト入力のたびに変わる

### 問題2: useFileEditChatContextの頻繁な再登録

`useFileEditChatContext.ts`の`useEffect`が`content`を依存配列に含んでおり、ユーザーがテキスト入力するたびにChatServiceへの登録/解除が発生している。

**現状コード** (`app/features/chat/hooks/useFileEditChatContext.ts:48-89`):
```tsx
useEffect(() => {
  const contextProvider = {
    getScreenContext: async () => ({
      fileContent: settings.sendFileContextToLLM ? content : '',
      // ...
    }),
  };
  ChatService.registerActiveContextProvider(contextProvider);
  return () => ChatService.unregisterActiveContextProvider();
}, [title, content, path, setContent, settings.sendFileContextToLLM]);
//         ^^^^^^^ これが問題！
```

これらの問題により：
1. FileEdit画面の初期レンダリングに時間がかかる
2. 編集中も頻繁に再レンダリングが発生する
3. 画面遷移アニメーション中にレイアウトが確定しない

## 実装方針 (Implementation Strategy)

### 解決策1: useFileEditHeaderのコールバックメモ化

`useCallback`と`useMemo`を活用して、依存配列を最小化する：

```tsx
// Before: useLayoutEffect内で関数を定義（依存関係が多い）
useLayoutEffect(() => {
  const handleToggleViewMode = () => { /* ... */ };
  // ...
}, [18個の依存関係]);

// After: useCallbackで事前にメモ化
const handleToggleViewMode = useCallback(() => {
  onViewModeChange(viewMode === 'edit' ? 'preview' : 'edit');
}, [viewMode, onViewModeChange]);

const handleShowVersionHistory = useCallback(() => {
  navigation.navigate('VersionHistory', { fileId: activeFileId || '' });
}, [navigation, activeFileId]);

const handleShowDiffView = useCallback(() => {
  navigation.navigate('DiffView', {
    mode: 'readonly',
    originalContent: originalFileContent,
    newContent: currentContent,
  });
}, [navigation, originalFileContent, currentContent]);

// ヘッダーボタンの設定をメモ化
const rightButtons = useMemo(() => {
  const buttons = [];
  if (!isLoading) {
    buttons.push(/* 保存アイコン */);
    buttons.push(/* オーバーフローメニュー */);
  }
  return buttons;
}, [isLoading, isDirty, colors, /* 必要最小限の依存 */]);

useLayoutEffect(() => {
  navigation.setOptions(
    createHeaderConfig({
      title: (
        <FileEditHeader
          title={title}
          onTitleChange={onTitleChange}
          editable={isEditable}
          onUndo={onUndo}
          onRedo={onRedo}
          canUndo={canUndo}
          canRedo={canRedo}
        />
      ),
      leftButtons: [/* ... */],
      rightButtons: rightButtons.map((button, index) => ({ /* ... */ })),
    })
  );
}, [
  navigation,
  title,
  isEditable,
  onTitleChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  rightButtons,
  createHeaderConfig,
  colors,
  // currentContentを削除！
]);
```

### 解決策2: useFileEditChatContextの依存最適化

`content`を`useRef`で管理し、依存配列から削除する：

```tsx
// Before: contentが変わるたびに再登録
useEffect(() => {
  const contextProvider = {
    getScreenContext: async () => ({
      fileContent: settings.sendFileContextToLLM ? content : '',
      // ...
    }),
  };
  ChatService.registerActiveContextProvider(contextProvider);
  return () => ChatService.unregisterActiveContextProvider();
}, [title, content, path, setContent, settings.sendFileContextToLLM]);

// After: useRefで最新の値を参照
const contentRef = useRef(content);

useEffect(() => {
  contentRef.current = content;
}, [content]);

useEffect(() => {
  const contextProvider = {
    getScreenContext: async () => ({
      fileContent: settings.sendFileContextToLLM ? contentRef.current : '',
      // ...
    }),
  };
  ChatService.registerActiveContextProvider(contextProvider);
  return () => ChatService.unregisterActiveContextProvider();
}, [title, path, setContent, settings.sendFileContextToLLM]);
// contentを依存配列から削除！
```

### 解決策3: FileEditHeaderコンポーネントのメモ化

FileEditHeaderコンポーネント自体を`React.memo`でメモ化する（オプション）：

```tsx
export const FileEditHeader = React.memo(({
  title,
  onTitleChange,
  editable,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}) => {
  // ...
});
```

## 受け入れ条件 (Acceptance Criteria)

- [ ] `useFileEditHeader.tsx`内の全コールバック関数が`useCallback`でメモ化されている
- [ ] `useFileEditHeader.tsx`の`useLayoutEffect`依存配列が10個以下に削減されている
- [ ] `currentContent`が`useLayoutEffect`の依存配列から削除されている
- [ ] `useFileEditChatContext.ts`で`content`を`useRef`で管理している
- [ ] `useFileEditChatContext.ts`の`useEffect`依存配列から`content`が削除されている
- [ ] テキスト編集中にChatServiceの登録/解除が発生しないことをログで確認
- [ ] FileListからFileEditへの画面遷移が体感的にスムーズになっている
- [ ] React DevTools Profilerでレンダリング回数が削減されていることを確認
- [ ] 既存の機能（Undo/Redo、保存、ビューモード切り替え）が正常に動作している

## 関連ファイル (Related Files)

### 主要対象ファイル
- `app/screen/file-edit/hooks/useFileEditHeader.tsx` (57-139行目)
- `app/features/chat/hooks/useFileEditChatContext.ts` (48-89行目)

### 関連ファイル
- `app/screen/file-edit/FileEditScreen.tsx` (29-100行目) - フックの呼び出し元
- `app/screen/file-edit/components/FileEditHeader.tsx` - ヘッダーコンポーネント本体
- `app/screen/file-edit/hooks/useFileEditor.tsx` - FileEditorストアの統合フック

### 参考ファイル
- `app/components/CustomHeader.tsx` - ヘッダー構築ロジック

## 制約条件 (Constraints)

- 既存のFileEdit画面の機能（編集、保存、Undo/Redo、ビューモード切り替え、バージョン履歴、Diff表示）に影響を与えないこと
- ChatServiceとのコンテキスト連携が正常に動作すること
- テキスト編集中のパフォーマンスも改善されること
- ヘッダーのリアルタイム更新（保存アイコンの色変更など）が維持されること
- React Hooksのルールに違反しないこと

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
  1. `useFileEditHeader.tsx`を開き、`handleToggleViewMode`、`handleShowVersionHistory`、`handleShowDiffView`を`useCallback`でメモ化する
  2. `rightButtons`の構築ロジックを`useMemo`でメモ化する
  3. `useLayoutEffect`の依存配列から`currentContent`、`originalFileContent`を削除（Diff表示ボタンのコールバック内で使用されている場合はそこにのみ含める）
  4. `useFileEditChatContext.ts`を開き、`contentRef`を追加し、`content`を依存配列から削除する
  5. FileEdit画面を開いて、画面遷移のスムーズさを確認する
  6. React DevTools Profilerで改善効果を測定する
- **考慮事項/ヒント:**
  - `useLayoutEffect`は同期的に実行されるため、依存配列の最適化が特に重要
  - `createHeaderConfig`や`colors`はテーマが変わらない限り変わらないので、依存配列に含めてもパフォーマンス影響は小さい
  - `contentRef.current`は常に最新の値を参照するため、ChatServiceの`getScreenContext`内で使用しても問題ない
  - デバッグログ（`logger.debug`）を活用して、ChatServiceの登録/解除頻度を確認すること
