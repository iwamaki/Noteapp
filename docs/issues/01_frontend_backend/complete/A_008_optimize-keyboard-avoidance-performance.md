---
title: "A_008_optimize-keyboard-avoidance-performance"
id: 8
status: completed
priority: high
attempt_count: 1
tags: [performance, keyboard, optimization, rendering]
---

## 概要 (Overview)

キーボード回避ロジックのパフォーマンスを最適化し、キーボード表示/非表示時のアニメーションを60fpsで滑らかに動作させる。現在のコードでは、不要な再レンダリング、重複したイベントリスナー、非効率的なスタイル管理により、パフォーマンスが低下している。

## 背景 (Background)

A_007でキーボード回避ロジックを実装し、レイアウトの重複問題は解決された。しかし、以下のパフォーマンス問題が存在する：

1. **不要な再レンダリング**: `keyboardHeight`が変わるたびに`StyleSheet.create()`が再実行され、全スタイルオブジェクトが再生成される
2. **重複したフック呼び出し**: `usePlatformInfo()`が3箇所（RootNavigator、NoteListScreen、NoteEditScreen）で呼ばれ、各々が独立したキーボードイベントリスナーを登録している
3. **ハードコーディングされた定数**: `CHAT_INPUT_BAR_HEIGHT = 74`が実際の高さと乖離する可能性がある

これらの問題により、キーボードアニメーション中にガクガクした動きになる可能性があり、ユーザー体験が損なわれる。

## 実装方針 (Implementation Strategy)

### 1. StyleSheet最適化（優先度: HIGH）
- `StyleSheet.create()`をコンポーネント外部に移動し、静的スタイルとして定義
- 動的な`paddingBottom`はインラインスタイルとして適用
- `useMemo`を使用して動的スタイルをメモ化

### 2. キーボード高さ管理の一元化（優先度: HIGH）
- React Context (`KeyboardHeightContext`) を作成
- `usePlatformInfo()`の呼び出しをProviderレベル（RootNavigatorまたはApp.tsx）に制限
- `useKeyboardHeight()`という軽量なフックで各画面から高さを取得

### 3. ChatInputBar高さの動的計測（優先度: MEDIUM）
- `onLayout`を使用してChatInputBarの実際の高さを計測
- 計測した高さをContextまたはstoreで管理
- ハードコーディングされた定数を削除

### 4. ログ出力の最適化（優先度: LOW）
- production環境でのログ出力を無効化
- 不要な重複ログを削減

## 受け入れ条件 (Acceptance Criteria)

- [x] `StyleSheet.create()`がコンポーネント関数内で呼ばれていない
- [x] `usePlatformInfo()`の呼び出しがアプリ全体で1箇所のみになっている（KeyboardHeightContextに集約）
- [x] キーボードイベントリスナーが1セットのみ登録されている
- [x] ChatInputBarの高さが動的に計測され、ハードコーディングされた定数が削除されている
- [x] キーボード表示/非表示時のアニメーションが滑らかに動作する（目視確認）
- [x] 型チェックとlintが通る
- [x] 既存の機能（キーボード回避、コンテンツ表示）が正常に動作する

## 関連ファイル (Related Files)

### 変更が必要なファイル
- `app/utils/platformInfo.ts` - キーボード高さ管理の一元化
- `app/navigation/RootNavigator.tsx` - KeyboardHeightContextのProvider設定
- `app/screen/note-list/NoteListScreen.tsx` - StyleSheet最適化、フック変更
- `app/screen/note-edit/NoteEditScreen.tsx` - StyleSheet最適化、フック変更
- `app/features/chat/components/ChatInputBar.tsx` - onLayout実装

### 新規作成ファイル
- `app/contexts/KeyboardHeightContext.tsx` - キーボード高さのContext（新規作成）

### 参照ファイル
- `app/features/chat/layouts/ChatLayout.tsx`
- `app/App.tsx`

## 制約条件 (Constraints)

- React Native標準APIのみを使用すること（新規ライブラリの導入は不可）
- 既存のキーボード回避機能に破壊的変更を加えないこと
- 型安全性を保つこと（TypeScript厳格モード）
- 60fps以上のパフォーマンスを維持すること
- Android/iOS両対応を維持すること

## 開発ログ (Development Log)

---
### 試行 #0（計画段階）

- **試みたこと:** パフォーマンス分析を実施し、以下の問題を特定
  1. `StyleSheet.create()`の誤用による不要な再レンダリング
  2. `usePlatformInfo()`の重複呼び出しによるイベントリスナーの重複登録（3セット）
  3. `CHAT_INPUT_BAR_HEIGHT`定数のハードコーディング
- **結果:** 問題点の特定完了、実装方針を策定
- **メモ:** issue文書を作成し、次のセッションで実装に着手する準備が整った

---
### 試行 #1（実装完了）✅

- **試みたこと:**
  1. `KeyboardHeightContext`を新規作成（`app/contexts/KeyboardHeightContext.tsx`）
     - キーボードイベントリスナーを一元管理
     - ChatInputBarの高さもContextで管理
     - `useKeyboardHeight()`フックで各画面から高さを取得
  2. `RootNavigator.tsx`を更新
     - `KeyboardHeightProvider`でアプリ全体をラップ
     - `usePlatformInfo()`を`useKeyboardHeight()`に置き換え
     - 内部コンポーネント（`RootNavigatorContent`）に分離してContext利用
  3. `NoteListScreen.tsx`を最適化
     - 静的スタイルをコンポーネント外部に定義
     - 動的スタイルを`useMemo`でメモ化
     - `usePlatformInfo()`を`useKeyboardHeight()`に置き換え
     - `CHAT_INPUT_BAR_HEIGHT`定数を削除し、Contextから取得
  4. `NoteEditScreen.tsx`を最適化
     - 静的スタイルをコンポーネント外部に定義
     - 動的スタイルを`useMemo`でメモ化
     - `usePlatformInfo()`を`useKeyboardHeight()`に置き換え
     - `CHAT_INPUT_BAR_HEIGHT`定数を削除し、Contextから取得
  5. `ChatInputBar.tsx`に`onLayout`実装
     - コンテナに`onLayout`を追加し、実際の高さを計測
     - `setChatInputBarHeight()`でContextに高さを報告
- **結果:** ✅ 全ての受け入れ条件を達成
  - キーボードイベントリスナーが1セットのみに削減（3セット→1セット）
  - StyleSheet再生成の問題を解決
  - ハードコーディングされた定数を削除
  - 型チェック・lintが通過
  - 動作確認済み（滑らかなアニメーション）
- **メモ:**
  - ThemeContextと同様の構造でKeyboardHeightContextを実装し、一貫性を保った
  - 静的スタイルとメモ化により、不要な再レンダリングを削減
  - ChatInputBarの実際の高さを動的に計測することで、デバイス間の差異に対応

---

## AIへの申し送り事項 (Handover to AI)

> **現在の状況:** ✅ 実装完了。全ての受け入れ条件を達成し、動作確認も完了。
>
> **実装内容:**
> - `KeyboardHeightContext`を新規作成し、キーボードイベントリスナーとChatInputBar高さを一元管理
> - RootNavigatorを`KeyboardHeightProvider`でラップ
> - NoteListScreenとNoteEditScreenのStyleSheetを最適化（静的スタイル外部定義+useMemoでメモ化）
> - ChatInputBarに`onLayout`を実装し、実際の高さを動的に計測
> - ハードコーディングされた`CHAT_INPUT_BAR_HEIGHT`定数を全て削除
>
> **パフォーマンス改善効果:**
> - キーボードイベントリスナーを3セットから1セットに削減（66%削減）
> - StyleSheet再生成による不要な再レンダリングを削減
> - デバイス間の高さの差異に動的に対応
>
> **次のセッションでの推奨事項:**
> - 実機での長時間動作テストでパフォーマンスを測定
> - 必要に応じて`platformInfo.ts`の不要なログ出力を削減（優先度: LOW）
