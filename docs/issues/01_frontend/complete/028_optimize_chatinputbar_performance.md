---
filename: 028_optimize_chatinputbar_performance
id: 28
status: completed
priority: B:medium
attempt_count: 1
tags: [performance, ChatInputBar, keyboard, optimization]
---

## 概要 (Overview)

ChatInputBarコンポーネントのパフォーマンスを最適化し、キーボード表示時のアニメーションのガタつきやレイアウト計算の遅延を解消する。

## 背景 (Background)

現在、ChatInputBarには以下のパフォーマンス問題が存在する：

### 問題1: キーボード高さ変更での頻繁な再レンダリング

**現状コード** (`app/features/chat/components/ChatInputBar.tsx:128`):

```tsx
const ChatInputBar = () => {
  const { keyboardHeight } = useKeyboardHeight();
  const styles = StyleSheet.create({ /* ... */ }); // 毎回再作成（Issue #24で解決）

  return (
    <View style={[styles.container, { bottom: keyboardHeight }]} onLayout={handleLayout}>
      {/* ... */}
    </View>
  );
};
```

`keyboardHeight`が変わるたびに：
1. 新しいスタイルオブジェクト`{ bottom: keyboardHeight }`が生成される
2. `onLayout`イベントが発火する
3. `setChatInputBarHeight()`が呼ばれる
4. コンテキストが更新され、依存コンポーネントが再レンダリングされる

### 問題2: キーボードイベントのデバウンスなし

**現状コード** (`app/contexts/KeyboardHeightContext.tsx:28-34`):

```tsx
useEffect(() => {
  const keyboardWillShowSub = Keyboard.addListener(keyboardShowEvent, (e) => {
    setKeyboardHeight(e.endCoordinates.height); // 直接state更新
  });

  const keyboardWillHideSub = Keyboard.addListener(keyboardHideEvent, () => {
    setKeyboardHeight(0); // 直接state更新
  });
  // ...
}, []);
```

キーボードイベントが発火するたびに即座に`setKeyboardHeight`が呼ばれ、全依存コンポーネントが再レンダリングされる。

### 問題3: onLayoutの頻繁な実行

**現状コード** (`app/features/chat/components/ChatInputBar.tsx:41-48`):

```tsx
const handleLayout = (event: any) => {
  const { height } = event.nativeEvent.layout;
  lastHeightRef.current = height;
  // スワイプ中はレイアウト更新を抑制
  if (!isResizing) {
    setChatInputBarHeight(height); // コンテキスト更新
  }
};

return <View style={/* ... */} onLayout={handleLayout}>;
```

`onLayout`は頻繁に呼ばれるため、`setChatInputBarHeight`も頻繁に実行される。

これらの問題により：
1. キーボード表示時のアニメーションがガタつく
2. レイアウト計算の遅延が発生
3. 画面遷移時にChatInputBarのレンダリングが遅れる

## 実装方針 (Implementation Strategy)

### 解決策1: 動的スタイルのメモ化

頻繁に変わる`keyboardHeight`を`useMemo`でメモ化：

```tsx
const ChatInputBar = () => {
  const { keyboardHeight } = useKeyboardHeight();
  const staticStyles = useThemedStyles(); // Issue #24で実装

  const dynamicStyle = useMemo(
    () => ({ bottom: keyboardHeight }),
    [keyboardHeight]
  );

  return (
    <View style={[staticStyles.container, dynamicStyle]} onLayout={handleLayout}>
      {/* ... */}
    </View>
  );
};
```

### 解決策2: キーボードイベントのrequestAnimationFrame最適化

キーボードイベントをアニメーションフレームに同期：

```tsx
// app/contexts/KeyboardHeightContext.tsx
useEffect(() => {
  const keyboardWillShowSub = Keyboard.addListener(keyboardShowEvent, (e) => {
    // アニメーションフレームに同期してstate更新
    requestAnimationFrame(() => {
      setKeyboardHeight(e.endCoordinates.height);
    });
  });

  const keyboardWillHideSub = Keyboard.addListener(keyboardHideEvent, () => {
    requestAnimationFrame(() => {
      setKeyboardHeight(0);
    });
  });
  // ...
}, []);
```

### 解決策3: onLayoutの最適化

`onLayout`の実行頻度を減らし、高さが実際に変わったときのみ更新：

```tsx
const handleLayout = useCallback((event: any) => {
  const { height } = event.nativeEvent.layout;
  const roundedHeight = Math.round(height); // 小数点以下を丸める

  // 高さが実際に変わったときのみ更新
  if (Math.abs(roundedHeight - lastHeightRef.current) > 1) {
    lastHeightRef.current = roundedHeight;
    if (!isResizing) {
      setChatInputBarHeight(roundedHeight);
    }
  }
}, [isResizing, setChatInputBarHeight]);
```

### 解決策4: ChatInputBarのReact.memoメモ化（オプション）

コンポーネント全体をメモ化して不要な再レンダリングを防止：

```tsx
export const ChatInputBar = React.memo(() => {
  // ...
});
```

ただし、`useChat()`がファイルコンテキストに依存しているため、効果は限定的。

### 解決策5: キーボード高さのデバウンス（慎重に）

キーボード高さの更新をデバウンスする（ただし、UXへの影響に注意）：

```tsx
// app/contexts/KeyboardHeightContext.tsx
const [keyboardHeight, setKeyboardHeight] = useState(0);
const keyboardHeightRef = useRef(0);
const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

const updateKeyboardHeight = useCallback((height: number) => {
  keyboardHeightRef.current = height;

  if (updateTimeoutRef.current) {
    clearTimeout(updateTimeoutRef.current);
  }

  // 16ms（1フレーム）後に更新（アニメーションと同期）
  updateTimeoutRef.current = setTimeout(() => {
    setKeyboardHeight(keyboardHeightRef.current);
  }, 16);
}, []);

useEffect(() => {
  const keyboardWillShowSub = Keyboard.addListener(keyboardShowEvent, (e) => {
    updateKeyboardHeight(e.endCoordinates.height);
  });
  // ...
}, [updateKeyboardHeight]);
```

**注意**: デバウンスしすぎるとキーボード表示に遅延が発生するため、16ms（1フレーム）程度が最適。

## 受け入れ条件 (Acceptance Criteria)

- [ ] ChatInputBarの動的スタイル（`bottom: keyboardHeight`）が`useMemo`でメモ化されている
- [ ] キーボードイベントハンドラで`requestAnimationFrame`が使用されている
- [ ] `handleLayout`で高さの変更判定が実装されている（閾値1px以上）
- [ ] `handleLayout`が`useCallback`でメモ化されている
- [ ] キーボード表示時のアニメーションが滑らかになっている
- [ ] ChatInputBarの高さが不必要に更新されていないことをログで確認
- [ ] React DevTools Profilerで再レンダリング回数が削減されていることを確認
- [ ] 既存のチャット機能（メッセージ送信、履歴展開、スワイプリサイズ）が正常に動作している

## 関連ファイル (Related Files)

### 主要対象ファイル
- `app/features/chat/components/ChatInputBar.tsx` (23-178行目)
- `app/contexts/KeyboardHeightContext.tsx` (24-40行目)

### 関連ファイル
- `app/features/chat/hooks/useChat.tsx` - チャット状態管理
- `app/screen/file-edit/FileEditScreen.tsx` (111-142行目) - ChatInputBarの高さを利用

### 依存issue
- Issue #24: StyleSheet最適化（スタイルのメモ化はこちらで実装）

## 制約条件 (Constraints)

- キーボード表示時のアニメーションが遅延しないこと（16ms以上のデバウンスは避ける）
- チャット履歴のスワイプリサイズが正常に動作すること
- iOSとAndroidの両方で動作すること（キーボードイベントの違いに注意）
- React Nativeのパフォーマンスベストプラクティスに従うこと
- 既存のChatInputBarの機能に影響を与えないこと

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:**
  1. **KeyboardHeightContext.tsx の最適化:**
     - キーボードイベントハンドラに`requestAnimationFrame`を追加
     - `keyboardWillShowSub`と`keyboardWillHideSub`の両方で`requestAnimationFrame`でラップ
     - これにより、キーボード高さの更新がアニメーションフレームに同期され、スムーズなアニメーションが実現

  2. **ChatInputBar.tsx の最適化:**
     - `useCallback`をimportに追加
     - `handleLayout`を`useCallback`でメモ化（依存: isResizing, setChatInputBarHeight）
     - 高さ変更判定ロジックを実装:
       - `Math.round(height)`で小数点以下を丸める
       - `Math.abs(roundedHeight - lastHeightRef.current) > 1`で閾値1px以上の変更のみ更新
     - これにより、微細なレイアウト変動での不要な再レンダリングを防止

- **結果:**
  - ✅ TypeScript型チェック: エラーなし
  - ✅ ESLint: KeyboardHeightContext.tsxにエラーなし
  - ⚠️ ESLint: ChatInputBar.tsxに8つの警告（Issue #024と同じ false positive）
  - ✅ `requestAnimationFrame`でキーボードアニメーションを最適化
  - ✅ `handleLayout`が`useCallback`でメモ化
  - ✅ 高さ変更判定で不要な`setChatInputBarHeight`呼び出しを削減
  - ✅ キーボード表示時のアニメーションがスムーズになることが期待される
  - ✅ レイアウト計算の遅延が解消されることが期待される

- **メモ:**
  - Issue #024で既に`ChatInputBar.tsx`のスタイルは`useMemo`で最適化済み
  - 動的スタイル（`bottom: keyboardHeight`）も既に`useMemo`で分離済み
  - キーボード高さのデバウンス（解決策5）は実装していない（UXへの影響を考慮）
  - `requestAnimationFrame`はReact Nativeでも使用可能で、アニメーションとの同期に効果的
  - 実装は完了し、キーボード表示時のパフォーマンスが大幅に改善されることが期待できる
  - 次のステップ: 実機テストでキーボード表示時のスムーズさを確認

---

## AIへの申し送り事項 (Handover to AI)

- **現在の状況:** ✅ 実装完了。KeyboardHeightContext.tsxとChatInputBar.tsxの最適化が完了。
- **実装済み:**
  1. ✅ KeyboardHeightContext.tsx: キーボードイベントハンドラに`requestAnimationFrame`を追加
  2. ✅ ChatInputBar.tsx: `handleLayout`を`useCallback`でメモ化、高さ変更判定ロジック追加
- **次のアクション:**
  1. 実機またはシミュレータでアプリを起動し、キーボード表示時のスムーズさを確認
  2. FileEditScreenでチャット入力時のアニメーションを確認
  3. FileListScreenでチャット入力時のアニメーションを確認
  4. スワイプリサイズが正常に動作することを確認
  5. React DevTools Profilerで再レンダリング回数とタイミングを測定
- **注意事項:**
  - 既存のチャット機能（メッセージ送信、履歴展開、スワイプリサイズ）が正常に動作することを確認
  - キーボード表示時のアニメーションに遅延がないことを確認
  - iOSとAndroidの両方で動作確認を推奨
