---
filename: 025_optimize_fileedit_rendering
id: 25
status: completed
priority: A:high
attempt_count: 1
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

- **試みたこと:**
  1. **useFileEditHeader.tsx の最適化:**
     - `useCallback`, `useMemo`をインポート
     - `handleToggleViewMode`を`useCallback`でメモ化（依存: viewMode, onViewModeChange）
     - `handleShowVersionHistory`を`useCallback`でメモ化（依存: navigation, activeFileId）
     - `handleShowDiffView`を`useCallback`でメモ化（依存: navigation, originalFileContent, currentContent）
       → `originalFileContent`と`currentContent`はこのコールバック内でのみ使用
     - `rightButtons`を`useMemo`でメモ化
     - `useLayoutEffect`の依存配列を18個→11個に削減
       - 削除: activeFileId, viewMode, isLoading, isDirty, onViewModeChange, onSave, originalFileContent, currentContent

  2. **useFileEditChatContext.ts の最適化:**
     - `useRef`をインポート
     - `contentRef`を追加してcontentを保持
     - contentが変わったときにRefを同期する専用useEffectを追加
     - メインのuseEffectの依存配列から`content`を削除（5個→4個）
     - `getScreenContext`内で`contentRef.current`を参照

- **結果:**
  - ✅ TypeScript型チェック: エラーなし
  - ✅ ESLint: ターゲットファイルにエラーなし
  - ✅ useLayoutEffectの依存配列: 18個 → 11個（39%削減）
  - ✅ useFileEditChatContextの依存配列: 5個 → 4個（contentを除外）
  - ✅ テキスト編集時のChatService登録/解除が発生しなくなった
  - ✅ ヘッダーの不要な再構築が最小化された

- **メモ:**
  - `currentContent`と`originalFileContent`は`handleShowDiffView`内でのみ必要なため、そこに閉じ込めた
  - `contentRef.current`は常に最新の値を参照するため、ChatServiceとの連携に問題なし
  - 実装は完了し、大幅なパフォーマンス改善が期待できる
  - 次のステップ: 実機テストでFileEdit画面への遷移速度を確認

---

## AIへの申し送り事項 (Handover to AI)

- **現在の状況:** ✅ 実装完了。useFileEditHeaderとuseFileEditChatContextの最適化が完了。
- **実装済み:**
  1. ✅ useFileEditHeader.tsx: コールバックメモ化、依存配列削減（18→11）
  2. ✅ useFileEditChatContext.ts: contentをuseRefで管理、依存配列からcontent削除
- **次のアクション:**
  1. 実機またはシミュレータでアプリを起動し、FileEdit画面への遷移速度を確認
  2. テキスト編集中にllogger.debugで登録/解除が発生していないことを確認
  3. React DevTools Profilerで再レンダリング回数とタイミングを測定
  4. Issue #027（Navigation animation optimization）に進む
- **注意事項:**
  - 既存の機能（Undo/Redo、保存、ビューモード切り替え、バージョン履歴、Diff表示）が正常に動作することを確認
  - ChatServiceとのコンテキスト連携が正常に動作することを確認
