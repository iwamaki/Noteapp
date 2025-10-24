---
filename: 027_optimize_navigation_animation
id: 27
status: new
priority: A:high
attempt_count: 0
tags: [performance, navigation, animation, UX, optimization]
---

## 概要 (Overview)

画面遷移時に「一瞬だけちゃんとレンダリングされていない瞬間」が見えてしまう問題を解消するため、React Navigationのアニメーション設定を最適化し、スムーズな画面遷移を実現する。

## 背景 (Background)

現在、`RootNavigator.tsx`の`Stack.Navigator`には最小限の設定しか行われておらず、デフォルトのアニメーション設定が使用されている。

**現状コード** (`app/navigation/RootNavigator.tsx:48-59`):

```tsx
<Stack.Navigator
  initialRouteName="FileList"
  screenOptions={{
    headerTintColor: colors.text, // これだけ！
  }}
>
  <Stack.Screen name="FileList" component={FileListScreen} options={{ title: 'Files' }} />
  <Stack.Screen name="FileEdit" component={FileEditScreen} options={{ title: 'Edit File' }} />
  <Stack.Screen name="DiffView" component={DiffViewScreen} options={{ title: 'View Diff' }} />
  <Stack.Screen name="VersionHistory" component={VersionHistoryScreen} options={{ title: 'Version History' }} />
  <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
</Stack.Navigator>
```

この実装により、以下の問題が発生：
1. デフォルトのアニメーション設定が使用される（最適化されていない）
2. 画面のレンダリング準備ができる前にアニメーションが始まる
3. 前の画面が長時間メモリに残り、パフォーマンスに影響
4. アニメーション中にレイアウトシフトが発生する

特に以下の遷移で顕著：
- FileList → FileEdit（編集画面への遷移）
- FileList → Settings（設定画面への遷移）

## 実装方針 (Implementation Strategy)

### 解決策1: カスタムアニメーション設定の追加

React Navigationの`screenOptions`を拡張し、以下の最適化を実装：

```tsx
import { CardStyleInterpolators, TransitionSpecs } from '@react-navigation/stack';

<Stack.Navigator
  initialRouteName="FileList"
  screenOptions={{
    headerTintColor: colors.text,

    // アニメーションを有効化
    animationEnabled: true,

    // iOSスタイルの水平スライドアニメーション（最も高速）
    cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,

    // アニメーション時間を短縮（デフォルトは300ms）
    transitionSpec: {
      open: {
        animation: 'timing',
        config: {
          duration: 250, // 250ms（デフォルトより50ms短縮）
        },
      },
      close: {
        animation: 'timing',
        config: {
          duration: 200, // 閉じる時はさらに短く
        },
      },
    },

    // 前の画面を早めにデタッチしてメモリ解放
    detachPreviousScreen: true,

    // 画面の背景色を設定してちらつき防止
    cardStyle: {
      backgroundColor: colors.secondary,
    },

    // ヘッダーのアニメーションを無効化（ちらつき防止）
    headerMode: 'screen',
  }}
>
  {/* ... */}
</Stack.Navigator>
```

### 解決策2: 画面ごとのカスタムアニメーション

特定の画面には異なるアニメーションを適用：

```tsx
// Settings画面はモーダルスタイル（下から上）
<Stack.Screen
  name="Settings"
  component={SettingsScreen}
  options={{
    title: 'Settings',
    cardStyleInterpolator: CardStyleInterpolators.forModalPresentationIOS,
    gestureDirection: 'vertical',
  }}
/>

// DiffView画面はフェードイン（軽量）
<Stack.Screen
  name="DiffView"
  component={DiffViewScreen}
  options={{
    title: 'View Diff',
    cardStyleInterpolator: CardStyleInterpolators.forFadeFromBottomAndroid,
  }}
/>
```

### 解決策3: ジェスチャーハンドリングの最適化

スワイプバックジェスチャーの設定を調整：

```tsx
screenOptions={{
  // ...

  // ジェスチャー設定
  gestureEnabled: true,
  gestureResponseDistance: 50, // スワイプの反応距離を調整
  gestureVelocityImpact: 0.3, // 速度の影響を調整

  // ジェスチャー中のアニメーション
  gestureDirection: 'horizontal',
}}
```

### 解決策4: アニメーション中のインタラクション制御

アニメーション完了まで次のアクションをブロック：

```tsx
screenOptions={{
  // ...

  // アニメーション中の操作を制限
  freezeOnBlur: true, // 非アクティブ画面の再レンダリングを停止
}}
```

### 解決策5: プラットフォーム別の最適化

iOSとAndroidで異なるアニメーション設定：

```tsx
import { Platform } from 'react-native';

screenOptions={{
  // ...

  cardStyleInterpolator: Platform.select({
    ios: CardStyleInterpolators.forHorizontalIOS,
    android: CardStyleInterpolators.forFadeFromBottomAndroid,
  }),

  transitionSpec: {
    open: Platform.select({
      ios: TransitionSpecs.TransitionIOSSpec,
      android: TransitionSpecs.FadeInFromBottomAndroidSpec,
    }),
    close: Platform.select({
      ios: TransitionSpecs.TransitionIOSSpec,
      android: TransitionSpecs.FadeOutToBottomAndroidSpec,
    }),
  },
}}
```

## 受け入れ条件 (Acceptance Criteria)

- [ ] `RootNavigator.tsx`の`Stack.Navigator`に`cardStyleInterpolator`が設定されている
- [ ] `transitionSpec`でアニメーション時間が250ms以下に設定されている
- [ ] `detachPreviousScreen: true`が設定されている
- [ ] `cardStyle`で背景色が設定されている
- [ ] Settings画面にモーダルスタイルのアニメーションが適用されている（オプション）
- [ ] FileListからFileEditへの遷移がスムーズで、「ちらつき」が最小化されている
- [ ] FileListからSettingsへの遷移がスムーズで、「ちらつき」が最小化されている
- [ ] スワイプバックジェスチャーが正常に動作している
- [ ] アニメーション中の画面がぼやけたり、変に歪んだりしていない
- [ ] iOSとAndroidの両方で動作確認が取れている

## 関連ファイル (Related Files)

### 主要対象ファイル
- `app/navigation/RootNavigator.tsx` (48-59行目)

### 参考ファイル
- React Navigation公式ドキュメント: https://reactnavigation.org/docs/stack-navigator/#animations
- `@react-navigation/stack`のCardStyleInterpolators
- `@react-navigation/stack`のTransitionSpecs

## 制約条件 (Constraints)

- アニメーションが不自然にならないこと（滑らかさを保つ）
- アクセシビリティ設定（アニメーション無効化）を尊重すること
- パフォーマンスが低いデバイスでも動作すること
- 既存のナビゲーション動作（戻るボタン、スワイプバックなど）に影響を与えないこと
- プラットフォームごとのUI/UX慣習に従うこと（iOSはスライド、Androidはフェードなど）

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
  1. `app/navigation/RootNavigator.tsx`を開く
  2. `@react-navigation/stack`から`CardStyleInterpolators`と`TransitionSpecs`をインポート
  3. `Stack.Navigator`の`screenOptions`に以下を追加：
     - `animationEnabled: true`
     - `cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS`
     - `transitionSpec`で`duration: 250`と`duration: 200`を設定
     - `detachPreviousScreen: true`
     - `cardStyle: { backgroundColor: colors.secondary }`
  4. FileListからFileEditへ遷移して、スムーズさを確認
  5. FileListからSettingsへ遷移して、スムーズさを確認
  6. スワイプバックジェスチャーが正常に動作することを確認
- **考慮事項/ヒント:**
  - `CardStyleInterpolators.forHorizontalIOS`は最も高速なアニメーション
  - アニメーション時間を短くしすぎると不自然になるので、250msが最適
  - `detachPreviousScreen`はメモリ使用量削減に重要
  - `cardStyle`の背景色は、テーマの`colors.secondary`を使用すること
  - Settings画面のモーダルスタイルはオプションなので、まずは基本設定から実装
  - 実機でテストすることを推奨（シミュレータは実機よりパフォーマンスが良いため）
