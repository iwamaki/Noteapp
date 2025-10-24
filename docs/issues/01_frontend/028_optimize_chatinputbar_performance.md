---
filename: 028_optimize_chatinputbar_performance
id: 28
status: new
priority: B:medium
attempt_count: 0
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

- **試みたこと:** （未着手）
- **結果:** （未着手）
- **メモ:** （未着手）

---

## AIへの申し送り事項 (Handover to AI)

- **現在の状況:** Issue作成完了。実装未着手。Issue #24の完了後に着手することを推奨。
- **次のアクション:**
  1. Issue #24（StyleSheet最適化）を先に完了させる
  2. `app/contexts/KeyboardHeightContext.tsx`を開き、キーボードイベントハンドラに`requestAnimationFrame`を追加
  3. `app/features/chat/components/ChatInputBar.tsx`を開き、動的スタイルを`useMemo`でメモ化
  4. `handleLayout`を`useCallback`でメモ化し、高さ変更判定ロジックを追加
  5. キーボードを表示/非表示して、スムーズさを確認
  6. React DevTools Profilerで改善効果を測定
- **考慮事項/ヒント:**
  - `requestAnimationFrame`はブラウザのAPIだが、React Nativeでも使用可能
  - キーボード高さのデバウンスは慎重に実装すること（UXへの影響が大きい）
  - `handleLayout`の高さ変更判定では、小数点以下の微妙な変動を無視すること（閾値1px）
  - iOSでは`keyboardWillShow`、Androidでは`keyboardDidShow`が使用されるため、プラットフォーム差異に注意
  - スワイプリサイズ中（`isResizing === true`）は、既存の抑制ロジックが正しく動作することを確認
