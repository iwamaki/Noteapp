---
title: "A_007_キーボード回避ロジックの修正（謎の空間バグの解消）"
id: 7
status: done
priority: high
attempt_count: 0
tags: [UI, keyboard, bug, chat, layout]
---

## 概要 (Overview)

現在の KeyboardAvoidingWrapper 実装により、キーボード表示時に「謎の下部空間」が挿入されるバグが発生している。参考実装 (simple-chat-input-screen.tsx) のパターンを採用し、シンプルで安定したキーボード回避ロジックに置き換える。

## 背景 (Background)

### 問題の発生状況
- チャット入力バーでキーボードを表示すると、画面下部に不要な空間が発生
- KeyboardAvoidingWrapper と ChatInputBar の animatedBottom ロジックが干渉している
- 二重のキーボード対応ロジックにより、レイアウトが不安定

### 現在のアーキテクチャ（問題あり）
```
App.tsx
└─ SafeAreaProvider
   └─ ThemeProvider
      └─ KeyboardAvoidingWrapper ← ★問題の根源★
         └─ AppContent
            └─ RootNavigator
               ├─ NavigationContainer + Stack.Navigator
               └─ ChatLayout (絶対位置 bottom:0)
                  └─ ChatInputBar (animatedBottom による位置調整)
```

### 参考実装の特徴（安定動作）
- KeyboardAvoidingView を使用せず、Keyboard イベントを直接リッスン
- marginBottom: keyboardHeight でシンプルに対応
- SafeAreaInsets で paddingBottom を適切に管理
- ScrollView に keyboardShouldPersistTaps="handled" を設定

## 実装方針 (Implementation Strategy)

### 基本戦略
1. **App.tsx から KeyboardAvoidingWrapper を削除**
   - 全体に影響する KeyboardAvoidingView を削除し、シンプルな構造に

2. **RootNavigator でキーボード対応を集中管理**
   - usePlatformInfo() から keyboardHeight を取得（既存実装を活用）
   - ChatLayout コンテナに marginBottom: keyboardHeight を適用

3. **ChatInputBar の簡素化**
   - animatedBottom ロジックを削除
   - insets.bottom で paddingBottom を設定（セーフエリア対応のみ）

4. **各スクリーンの最適化**
   - FlatList/ScrollView に keyboardShouldPersistTaps="handled" を追加
   - コンテンツの paddingBottom を調整してチャットバーと重ならないように

### 技術的アプローチ
- 既存の platformInfo.ts のキーボード高さトラッキングを活用
- 参考コード (simple-chat-input-screen.tsx) のパターンに準拠
- アニメーション処理は必要最小限に（Animated.Value は削除）

## 受け入れ条件 (Acceptance Criteria)

- [x] Issue ドキュメントを作成
- [ ] App.tsx から KeyboardAvoidingWrapper の import と使用を削除
- [ ] RootNavigator.tsx で usePlatformInfo() から keyboardHeight を取得し、ChatLayout に適用
- [ ] ChatInputBar.tsx から animatedBottom ロジックを削除し、paddingBottom: insets.bottom に変更
- [ ] NoteListScreen.tsx の FlatList に keyboardShouldPersistTaps="handled" を追加
- [ ] NoteEditScreen.tsx (FileEditor 内) の ScrollView 設定を確認・最適化
- [ ] キーボード表示時に謎の空間が発生しないことを確認
- [ ] チャット入力バーがキーボードの上に正しく表示されることを確認
- [ ] 各スクリーン（NoteList, NoteEdit）でキーボード表示時のスクロールが正常に動作することを確認

## 関連ファイル (Related Files)

### 主要な変更対象
- `app/App.tsx` - KeyboardAvoidingWrapper を削除
- `app/navigation/RootNavigator.tsx` - ChatLayout にキーボード対応を追加
- `app/features/chat/components/ChatInputBar.tsx` - animatedBottom を削除
- `app/screen/note-list/NoteListScreen.tsx` - FlatList の設定を最適化
- `app/screen/note-edit/NoteEditScreen.tsx` - ScrollView の設定を確認

### 参照するファイル
- `docs/issues/frontend/reference/simple-chat-input-screen.tsx` - 参考実装
- `app/utils/platformInfo.ts` - キーボード高さトラッキング（既存実装）
- `app/components/KeyboardAvoidingWrapper.tsx` - 削除対象（参考のため残す可能性あり）

## 制約条件 (Constraints)

- 既存の platformInfo.ts のキーボード高さトラッキングを活用すること
- SafeAreaProvider は App.tsx で保持すること（削除しない）
- ChatLayout の絶対位置（position: 'absolute', bottom: 0）は維持すること
- 各スクリーンのコンポーネント構造は最小限の変更にとどめること
- アニメーションは削除または最小化し、シンプルなレイアウト調整を優先すること

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:**
  - 現在のアーキテクチャを分析し、問題の根本原因を特定
  - 参考実装 (simple-chat-input-screen.tsx) のパターンを分析
  - Issue ドキュメントを作成

- **結果:**
  - Issue ドキュメント作成完了
  - 実装方針が明確化された

- **メモ:**
  - 次のステップで実装を開始
  - KeyboardAvoidingWrapper の削除から着手

---

## AIへの申し送り事項 (Handover to AI)

### 現在の状況
- Issue ドキュメントを作成完了
- 問題の根本原因を特定：KeyboardAvoidingWrapper と ChatInputBar の二重キーボード対応ロジックの干渉
- 参考実装のパターンを分析済み

### 次のアクション
1. App.tsx から KeyboardAvoidingWrapper を削除
2. RootNavigator.tsx で usePlatformInfo() から keyboardHeight を取得し、ChatLayout に marginBottom を適用
3. ChatInputBar.tsx から animatedBottom ロジックを削除
4. 各スクリーンの FlatList/ScrollView に keyboardShouldPersistTaps="handled" を追加

### 考慮事項/ヒント
- platformInfo.ts は既にキーボード高さをトラッキングしているので、新規実装は不要
- simple-chat-input-screen.tsx (line 328) の `style={{ marginBottom: keyboardHeight }}` パターンを参考にする
- ChatInputBar の container スタイルに `paddingBottom: insets.bottom` を設定する（line 205 参照）
- animatedBottom 関連のコード（ChatInputBar.tsx line 32-44, 81）を削除する
