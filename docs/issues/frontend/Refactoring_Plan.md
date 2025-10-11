# チャット機能疎結合化 実装計画書

**Issue ID:** 001
**タイトル:** チャット機能の疎結合化とLLM連携強化
**作成日:** 2025-10-11

---

## 📋 目次

1. [目標](#目標)
2. [現状分析](#現状分析)
3. [実装ステップ](#実装ステップ)
4. [受け入れ条件の達成確認](#受け入れ条件の達成確認)
5. [注意事項とリスク](#注意事項とリスク)
6. [ファイル変更一覧](#ファイル変更一覧)
7. [実装順序](#実装順序)
8. [テスト項目](#テスト項目)

---

## 🎯 目標

チャット機能を特定の画面から疎結合化し、アプリケーション全体で利用可能なグローバルオーバーレイUIとして再構築する。

**具体的な達成目標:**
- チャットUIを`RootNavigator`レベルでグローバルに配置
- キーボードハンドリングをアプリケーション全体で一元管理
- `CHAT_INPUT_HEIGHT`などの定数を一元管理
- 既存のLLM連携機能を維持しながらUI層のみをリファクタリング

---

## 📊 現状分析

### 現在の問題点

#### 1. `ChatInputBar`の重複配置
- **`NoteEditScreen.tsx:136`**: `<ChatInputBar />`をレンダリング
- **`NoteListScreen.tsx:109`**: `<ChatInputBar />`をレンダリング
- 各画面に`CHAT_INPUT_HEIGHT`定数が分散
  - `NoteEditScreen:17` → `Platform.OS === 'ios' ? 90 : 100`
  - `NoteListScreen:18` → `Platform.OS === 'ios' ? 78 : 66`

#### 2. キーボードハンドリングの重複
- **`ChatInputBar.tsx:39-70`**: チャットバー自体のキーボード対応
  - `Keyboard.addListener`で`keyboardWillShow`/`keyboardWillHide`を監視
  - `positionAnimation`で`bottom`位置を動的に変更
- **`NoteEditScreen.tsx:63-92`**: 画面側でもキーボードリスナーを設定
  - `paddingBottomAnim`でコンテンツの`paddingBottom`を調整
- 両方で`Animated.Value`と`Keyboard.addListener`を重複使用

#### 3. コンテキスト管理は良好（変更不要）
- `useNoteEditChatContext`と`useNoteListChatContext`は既にChatServiceに登録する形で疎結合化されている
- LLMへのコンテキスト提供は適切に機能している
- **この部分は変更不要**

---

## 🛠 実装ステップ

### フェーズ1: 定数ファイルの作成と集約

**ファイル:** `/home/iwash/02_Repository/Noteapp/app/design/constants.ts` (**新規作成**)

**内容:**
```typescript
/**
 * @file constants.ts
 * @summary アプリケーション全体で使用される定数を定義
 */
import { Platform } from 'react-native';

/**
 * チャット入力バーの高さ（概算）
 * iOS/Androidのセーフエリアを考慮した高さ
 */
export const CHAT_INPUT_HEIGHT = Platform.OS === 'ios' ? 90 : 100;
```

**理由:**
- `NoteEditScreen`と`NoteListScreen`で異なる値が使われているため、統一が必要
- より大きい値（90/100）を採用して十分な余白を確保

---

### フェーズ2: グローバルキーボードコンテキストの作成

**ファイル:** `/home/iwash/02_Repository/Noteapp/app/contexts/KeyboardContext.tsx` (**新規作成**)

**目的:**
- キーボードの高さをアプリケーション全体で共有
- 各画面が個別にリスナーを設定する必要をなくす

**実装内容:**
```typescript
/**
 * @file KeyboardContext.tsx
 * @summary グローバルなキーボード状態管理を提供
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Keyboard, Platform, KeyboardEvent } from 'react-native';

interface KeyboardContextValue {
  /** 現在のキーボードの高さ */
  keyboardHeight: number;
  /** キーボードが表示されているか */
  isKeyboardVisible: boolean;
}

const KeyboardContext = createContext<KeyboardContextValue>({
  keyboardHeight: 0,
  isKeyboardVisible: false,
});

export function KeyboardProvider({ children }: { children: ReactNode }) {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const handleKeyboardShow = (e: KeyboardEvent) => {
      setKeyboardHeight(e.endCoordinates.height);
      setIsKeyboardVisible(true);
    };

    const handleKeyboardHide = () => {
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
    };

    const showSubscription = Keyboard.addListener(showEvent, handleKeyboardShow);
    const hideSubscription = Keyboard.addListener(hideEvent, handleKeyboardHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return (
    <KeyboardContext.Provider value={{ keyboardHeight, isKeyboardVisible }}>
      {children}
    </KeyboardContext.Provider>
  );
}

export function useKeyboard() {
  return useContext(KeyboardContext);
}
```

---

### フェーズ3: `ChatInputBar`のリファクタリング

**ファイル:** `/home/iwash/02_Repository/Noteapp/app/features/chat/ChatInputBar.tsx`

**変更内容:**

1. **インポートの追加**
```typescript
import { useKeyboard } from '../../contexts/KeyboardContext';
import { CHAT_INPUT_HEIGHT } from '../../design/constants';
```

2. **キーボードハンドリングの削除**
   - **削除:** 36-37行目の`positionAnimation`の定義
   - **削除:** 38-70行目のキーボードイベントリスナー全体の`useEffect`
   - **追加:** グローバルな`useKeyboard`フックの使用

3. **コンポーネント内の変更**
```typescript
export const ChatInputBar: React.FC = () => {
  const { colors, typography } = useTheme();
  const { keyboardHeight } = useKeyboard(); // 追加
  const {
    messages,
    isLoading,
    sendMessage,
    resetChat,
    chatAreaHeight,
    panResponder,
  } = useChat();
  const [inputText, setInputText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  // positionAnimationの定義を削除

  // 38-70行目のキーボードリスナーのuseEffectを削除

  // ... 既存のhandleSendMessage、canSendMessage、stylesは変更なし

  return (
    <View style={[styles.container, { bottom: keyboardHeight }]}> {/* Animated.Viewから通常のViewに変更、positionAnimationの代わりにkeyboardHeightを使用 */}
      {/* 既存のJSX（変更なし） */}
    </View>
  );
};
```

4. **スタイルの確認（変更不要）**
   - `container`スタイルは既に`position: 'absolute'`と`bottom: 0`を持っている
   - インラインスタイルで`{ bottom: keyboardHeight }`を上書き

---

### フェーズ4: `RootNavigator`へのグローバルチャットUI配置

**ファイル:** `/home/iwash/02_Repository/Noteapp/app/navigation/RootNavigator.tsx`

**変更内容:**

1. **インポートの追加**
```typescript
import { ChatInputBar } from '../features/chat/ChatInputBar';
```

2. **グローバルチャットUIの配置**
```typescript
function RootNavigator() {
  const navigationRef = useNavigationContainerRef();

  return (
    <View style={styles.container}>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator initialRouteName="NoteList">
          <Stack.Screen name="NoteList" component={NoteListScreen} options={{ title: 'Notes' }} />
          <Stack.Screen name="NoteEdit" component={NoteEditScreen} options={{ title: 'Edit Note' }} />
          <Stack.Screen name="DiffView" component={DiffViewScreen} options={{ title: 'View Diff' }} />
          <Stack.Screen name="VersionHistory" component={VersionHistoryScreen} options={{ title: 'Version History' }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
        </Stack.Navigator>
      </NavigationContainer>

      {/* グローバルチャットUI */}
      <ChatInputBar />
    </View>
  );
}
```

**ポイント:**
- `ChatInputBar`を`NavigationContainer`の**外側**、最上位の`View`内に配置
- `ChatInputBar`内部で既に`position: 'absolute'`と`zIndex: 999`が設定されているため、追加スタイル不要

---

### フェーズ5: `App.tsx`への`KeyboardProvider`追加

**ファイル:** `/home/iwash/02_Repository/Noteapp/app/App.tsx`

**変更内容:**

1. **インポートの追加**
```typescript
import { KeyboardProvider } from './contexts/KeyboardContext';
```

2. **プロバイダーの追加**
```typescript
export default function App() {
  const { loadSettings } = useSettingsStore();

  useEffect(() => {
    // アプリのログカテゴリを'chat'のみに設定
    logger.setCategories(['chat', 'llm']);

    // ユーザー設定を読み込み
    loadSettings();
  }, []);

  return (
    <ThemeProvider>
      <KeyboardProvider>
        <RootNavigator />
      </KeyboardProvider>
    </ThemeProvider>
  );
}
```

**ポイント:**
- `ThemeProvider`の内側、`RootNavigator`の外側に配置
- これによりアプリケーション全体でキーボード状態が共有される

---

### フェーズ6: `NoteEditScreen`のリファクタリング

**ファイル:** `/home/iwash/02_Repository/Noteapp/app/screen/note-edit/NoteEditScreen.tsx`

**変更内容:**

1. **インポートの変更**
```typescript
// 削除
import { ChatInputBar } from '../../features/chat/ChatInputBar';

// 追加
import { useKeyboard } from '../../contexts/KeyboardContext';
import { CHAT_INPUT_HEIGHT } from '../../design/constants';
```

2. **定数の削除**
   - **削除:** 17-18行目の`CHAT_INPUT_HEIGHT`定数定義

3. **状態とロジックの変更**
```typescript
function NoteEditScreen() {
  const route = useRoute<NoteEditScreenRouteProp>();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { noteId } = route.params || {};
  const { keyboardHeight } = useKeyboard(); // 追加

  const {
    note,
    title,
    content,
    setContent,
    isLoading,
    handleSave,
    handleTitleChange,
    undo,
    redo,
    canUndo,
    canRedo,
    isDirty,
  } = useNoteEditor(noteId);

  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [isConfirmModalVisible, setConfirmModalVisible] = useState(false);
  const [nextAction, setNextAction] = useState<any>(null);
  // paddingBottomAnimの定義を削除

  // beforeRemoveリスナーのuseEffectはそのまま維持（45-60行目）

  // 63-92行目のキーボードリスナーのuseEffectを削除

  // ... 以下、既存のロジック（変更なし）
```

4. **JSXの変更**
```typescript
  // 動的なpaddingBottomを計算
  const contentPaddingBottom = CHAT_INPUT_HEIGHT + keyboardHeight;

  return (
    <MainContainer isLoading={isLoading}>
      <View style={[styles.animatedContainer, { paddingBottom: contentPaddingBottom }]}> {/* Animated.Viewから通常のViewに変更 */}
        <FileEditor
          filename={title}
          initialContent={content}
          mode={viewMode}
          onModeChange={setViewMode}
          onContentChange={setContent}
        />
      </View>
      {/* ChatInputBarを削除 */}
      <CustomModal
        isVisible={isConfirmModalVisible}
        title="変更を破棄しますか？"
        message="保存されていない変更があります。本当に破棄してよろしいですか？"
        buttons={[
          {
            text: 'キャンセル',
            style: 'cancel',
            onPress: () => setConfirmModalVisible(false),
          },
          {
            text: '破棄',
            style: 'destructive',
            onPress: () => {
              setConfirmModalVisible(false);
              if (nextAction) {
                navigation.dispatch(nextAction);
              }
            },
          },
        ]}
        onClose={() => {
          setConfirmModalVisible(false);
          setNextAction(null);
        }}
      />
    </MainContainer>
  );
}
```

5. **スタイルの変更（必要に応じて）**
   - `animatedContainer`スタイルはそのまま維持
   - `Animated.View`を通常の`View`に変更するため、アニメーション関連のインポートは不要になる可能性あり

---

### フェーズ7: `NoteListScreen`のリファクタリング

**ファイル:** `/home/iwash/02_Repository/Noteapp/app/screen/note-list/NoteListScreen.tsx`

**変更内容:**

1. **インポートの変更**
```typescript
// 削除
import { ChatInputBar } from '../../features/chat/ChatInputBar';

// 追加
import { CHAT_INPUT_HEIGHT } from '../../design/constants';
```

2. **定数の削除**
   - **削除:** 18行目の`CHAT_INPUT_HEIGHT`定数定義

3. **JSXの変更**
```typescript
function NoteListScreen() {
  const { colors, spacing } = useTheme();

  const {
    notes,
    loading,
    isSelectionMode,
    selectedNoteIds,
    handleSelectNote,
    handleLongPressNote,
    handleCancelSelection,
    handleDeleteSelected,
    handleCopySelected,
    handleCreateNote,
    fetchNotes,
  } = useNoteListLogic();

  useNoteListHeader({
    isSelectionMode,
    selectedNoteIds,
    handleCancelSelection,
    handleDeleteSelected,
    handleCopySelected,
  });

  // チャットコンテキストプロバイダーを登録
  useNoteListChatContext({ notes });

  // ... stylesの定義（変更なし）

  // ノートリストのレンダラー（変更なし）
  const renderItem = ({ item }: { item: (typeof notes)[0] }) => (
    <ListItem.Container
      onPress={() => handleSelectNote(item.id)}
      onLongPress={() => handleLongPressNote(item.id)}
      isSelected={selectedNoteIds.has(item.id)}
      isSelectionMode={isSelectionMode}
    >
      <ListItem.Title numberOfLines={1}>
        {item.title || '無題のノート'}
      </ListItem.Title>
      {item.content && (
        <ListItem.Subtitle numberOfLines={1}>
          {item.content}
        </ListItem.Subtitle>
      )}
    </ListItem.Container>
  );

  // メインの表示
  return (
    <MainContainer
      backgroundColor={colors.secondary}
      isLoading={loading.isLoading && notes.length === 0}
    >
      {notes.length === 0 && !loading.isLoading ? (
        <NoteListEmptyState
          containerStyle={styles.centered}
          messageStyle={styles.emptyMessage}
        />
      ) : (
        <FlatList
          data={notes}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          style={styles.list}
          onRefresh={fetchNotes}
          refreshing={loading.isLoading}
          contentContainerStyle={[styles.listContent, { paddingBottom: CHAT_INPUT_HEIGHT + spacing.xl }]}
        />
      )}
      {/* ChatInputBarを削除 */}
      <NoteListFabButton
        isSelectionMode={isSelectionMode}
        onPress={handleCreateNote}
      />
    </MainContainer>
  );
}
```

**ポイント:**
- `NoteListScreen`ではキーボードハンドリングが元々不要（`FlatList`の`contentContainerStyle`で十分）
- `useKeyboard`フックのインポートや使用も不要
- 単純に`CHAT_INPUT_HEIGHT`を定数ファイルからインポートして使用

---

## ✅ 受け入れ条件の達成確認

| 受け入れ条件 | 達成方法 | フェーズ |
|------------|---------|---------|
| チャットUIがどの画面でもオーバーレイ表示される | `RootNavigator`の最上位でレンダリング | フェーズ4 |
| キーボード表示時の適切なレイアウト調整 | `KeyboardProvider`とグローバルな`keyboardHeight`で管理 | フェーズ2, 3, 6 |
| 各画面から`ChatInputBar`の直接インポート・レンダリングが削除されている | 各画面から削除 | フェーズ6, 7 |
| `CHAT_INPUT_HEIGHT`の一元管理 | `app/design/constants.ts`で定義 | フェーズ1 |
| LLMがノートリストのコンテキストを認識 | 既存の`useNoteListChatContext`で実装済み（**変更不要**） | - |
| LLMが編集中ノートのコンテキストを認識 | 既存の`useNoteEditChatContext`で実装済み（**変更不要**） | - |
| LLMのコマンド実行（edit_file、read_file） | 既存の`ChatService`と各フックで実装済み（**変更不要**） | - |
| 既存機能の正常動作 | 各画面のロジックは変更せず、表示層のみ変更 | 全フェーズ |

---

## 🔍 注意事項とリスク

### 1. `CHAT_INPUT_HEIGHT`の値の統一

**問題:**
- `NoteEditScreen`は90/100を使用
- `NoteListScreen`は78/66を使用

**対策:**
- 統一値として90/100を採用
- `NoteListScreen`で若干余白が増える可能性があるため、テスト時に確認
- 必要に応じて`CHAT_INPUT_HEIGHT`の値を調整

### 2. `zIndex`の競合

**問題:**
- `ChatInputBar`の`zIndex: 999`
- `NoteListFabButton`など他のコンポーネントとの競合の可能性

**対策:**
- テスト時に各コンポーネントの表示順序を確認
- 必要に応じて`zIndex`を調整

### 3. アニメーションの変更

**問題:**
- `NoteEditScreen`では`Animated.Value`を使用していたが、通常の`View`に変更
- アニメーションの滑らかさが若干変わる可能性

**対策:**
- テスト時にユーザー体験を確認
- 必要に応じて`ChatInputBar`側で`Animated.View`を使用する実装に戻す

### 4. 既存のコンテキストフックは変更不要

**重要:**
- `useNoteEditChatContext`と`useNoteListChatContext`は**変更不要**
- LLMとの連携機能は影響を受けない
- これらのフックは引き続き各画面で呼び出される

### 5. インポート順序とパス

**注意:**
- 新しく作成する`contexts`ディレクトリのパスが正しいことを確認
- 相対パスに注意（`../../contexts/KeyboardContext`など）

---

## 📁 ファイル変更一覧

| # | ファイルパス | 変更種類 | 主な変更内容 | フェーズ |
|---|------------|---------|------------|---------|
| 1 | `app/design/constants.ts` | **新規作成** | `CHAT_INPUT_HEIGHT`定数を定義 | 1 |
| 2 | `app/contexts/KeyboardContext.tsx` | **新規作成** | グローバルキーボード状態管理 | 2 |
| 3 | `app/features/chat/ChatInputBar.tsx` | **編集** | キーボードリスナー削除、`useKeyboard`使用、`Animated.View`→`View`に変更 | 3 |
| 4 | `app/navigation/RootNavigator.tsx` | **編集** | グローバルに`ChatInputBar`を配置 | 4 |
| 5 | `app/App.tsx` | **編集** | `KeyboardProvider`でラップ | 5 |
| 6 | `app/screen/note-edit/NoteEditScreen.tsx` | **編集** | `ChatInputBar`削除、キーボードハンドリング削除、`Animated.View`→`View`に変更 | 6 |
| 7 | `app/screen/note-list/NoteListScreen.tsx` | **編集** | `ChatInputBar`削除、定数インポート変更 | 7 |

**変更不要なファイル:**
- `app/screen/note-edit/hooks/useNoteEditChatContext.ts` ✅
- `app/screen/note-list/hooks/useNoteListChatContext.ts` ✅
- `app/services/chatService/index.ts` ✅
- `app/features/chat/hooks/useChat.ts` ✅
- `app/features/chat/components/ChatHistory.tsx` ✅

---

## 🚀 実装順序（推奨）

実装は以下の順序で進めることを推奨します。各フェーズは独立しているため、段階的に実装・テストが可能です。

### ステップ1: 基盤の準備
1. **フェーズ1**: 定数ファイル作成 (`app/design/constants.ts`)
   - 最も影響が少ない
   - 他のフェーズの依存元となる

2. **フェーズ2**: `KeyboardContext`作成 (`app/contexts/KeyboardContext.tsx`)
   - 独立したコンポーネント
   - 他のフェーズの依存元となる

### ステップ2: グローバル化の準備
3. **フェーズ5**: `App.tsx`に`KeyboardProvider`追加
   - コンテキストをアプリ全体で利用可能にする
   - この時点でエラーは発生しない（まだ`useKeyboard`を使用していないため）

### ステップ3: チャットUIのグローバル化
4. **フェーズ3**: `ChatInputBar`リファクタリング
   - `useKeyboard`フックを使用
   - キーボードリスナーを削除

5. **フェーズ4**: `RootNavigator`へ配置
   - グローバル化完了
   - この時点で各画面に2つの`ChatInputBar`が表示される（問題なし、次のステップで解消）

### ステップ4: クリーンアップ
6. **フェーズ6**: `NoteEditScreen`クリーンアップ
   - 画面側の`ChatInputBar`を削除
   - キーボードハンドリングを削除

7. **フェーズ7**: `NoteListScreen`クリーンアップ
   - 画面側の`ChatInputBar`を削除
   - 定数を共通ファイルからインポート

### テストポイント
- **フェーズ4完了時**: 全画面でチャットバーが2つ表示されることを確認（予期される動作）
- **フェーズ7完了時**: 全画面でチャットバーが1つのみ表示されることを確認

---

## 🧪 テスト項目

実装完了後、以下の項目をテストしてください。

### UI表示のテスト
- [ ] `NoteListScreen`でチャットバーが画面下部に表示される
- [ ] `NoteEditScreen`でチャットバーが画面下部に表示される
- [ ] `DiffViewScreen`でチャットバーが画面下部に表示される
- [ ] `VersionHistoryScreen`でチャットバーが画面下部に表示される
- [ ] `SettingsScreen`でチャットバーが画面下部に表示される
- [ ] 各画面でチャットバーが**1つのみ**表示される（重複していない）

### キーボード連動のテスト
- [ ] `NoteListScreen`でテキスト入力欄をタップするとキーボードが表示される
- [ ] キーボード表示時にチャットバーが上に移動する（iOSとAndroidの両方）
- [ ] キーボード非表示時にチャットバーが元の位置に戻る
- [ ] `NoteEditScreen`でキーボード表示時にエディタのコンテンツが隠れない
- [ ] `NoteEditScreen`でキーボード非表示時にエディタのコンテンツが正常に表示される

### チャット機能のテスト
- [ ] チャット入力欄にメッセージを入力できる
- [ ] 送信ボタンをタップするとメッセージが送信される
- [ ] メッセージ履歴を展開できる
- [ ] メッセージ履歴をリセットできる
- [ ] メッセージ履歴を折りたたむことができる
- [ ] チャット履歴が画面遷移後も保持される

### LLMコンテキスト連携のテスト
- [ ] `NoteListScreen`でメッセージ送信時、LLMがノートリストを認識している
  - 例: 「どんなノートがありますか？」と質問して、ノートのリストが返ってくる
- [ ] `NoteEditScreen`でメッセージ送信時、LLMが編集中のノートタイトルを認識している
  - 例: 「このノートのタイトルは？」と質問して、正しいタイトルが返ってくる
- [ ] `NoteEditScreen`でメッセージ送信時、LLMが編集中のノート内容を認識している
  - 例: 「このノートの内容を要約して」と質問して、内容の要約が返ってくる

### LLMコマンド実行のテスト
- [ ] `edit_file`コマンドが正常に動作する
  - 例: 「ノートに『テスト』という文字を追加して」と指示して、ノート内容が更新される
- [ ] `read_file`コマンドが正常に動作する
  - 例: 「このノートを読んで」と指示して、ノート内容が読み込まれる

### 画面遷移のテスト
- [ ] `NoteListScreen`から`NoteEditScreen`への遷移時にチャットバーが表示され続ける
- [ ] `NoteEditScreen`から`NoteListScreen`への遷移時にチャットバーが表示され続ける
- [ ] 画面遷移時にチャット履歴が保持される
- [ ] 画面遷移時にチャットバーの位置が正しい

### パフォーマンスのテスト
- [ ] キーボードの表示/非表示がスムーズに動作する（iOS）
- [ ] キーボードの表示/非表示がスムーズに動作する（Android）
- [ ] チャットバーの表示がパフォーマンスに悪影響を与えていない
- [ ] 大量のメッセージがある場合でもスムーズに動作する

### エッジケースのテスト
- [ ] チャットバーとFABボタン（`NoteListFabButton`）が重ならない
- [ ] チャットバーと他のUI要素の`zIndex`が正しく設定されている
- [ ] 横向き表示でもチャットバーが正しく表示される
- [ ] タブレット端末でもチャットバーが正しく表示される

---

## 📝 実装時のチェックリスト

実装者は以下のチェックリストを使用して、各フェーズの完了を確認してください。

### フェーズ1: 定数ファイル作成
- [ ] `app/design/constants.ts`を作成
- [ ] `CHAT_INPUT_HEIGHT`定数を正しく定義（iOS: 90, Android: 100）
- [ ] TypeScriptのエラーがないことを確認

### フェーズ2: KeyboardContext作成
- [ ] `app/contexts/KeyboardContext.tsx`を作成
- [ ] `KeyboardProvider`コンポーネントを実装
- [ ] `useKeyboard`フックを実装
- [ ] iOS/Android両方のキーボードイベントに対応
- [ ] TypeScriptのエラーがないことを確認

### フェーズ3: ChatInputBar リファクタリング
- [ ] `useKeyboard`フックをインポート
- [ ] `CHAT_INPUT_HEIGHT`をインポート
- [ ] `positionAnimation`の定義を削除
- [ ] キーボードイベントリスナーの`useEffect`を削除
- [ ] `Animated.View`を通常の`View`に変更
- [ ] `{ bottom: keyboardHeight }`をスタイルに追加
- [ ] TypeScriptのエラーがないことを確認
- [ ] コンパイルエラーがないことを確認

### フェーズ4: RootNavigator への配置
- [ ] `ChatInputBar`をインポート
- [ ] `NavigationContainer`の外側に`<ChatInputBar />`を追加
- [ ] TypeScriptのエラーがないことを確認
- [ ] コンパイルエラーがないことを確認

### フェーズ5: App.tsx への KeyboardProvider 追加
- [ ] `KeyboardProvider`をインポート
- [ ] `<ThemeProvider>`の内側に`<KeyboardProvider>`を追加
- [ ] `<RootNavigator />`を`<KeyboardProvider>`で囲む
- [ ] TypeScriptのエラーがないことを確認
- [ ] コンパイルエラーがないことを確認

### フェーズ6: NoteEditScreen リファクタリング
- [ ] `ChatInputBar`のインポートを削除
- [ ] `useKeyboard`フックをインポート
- [ ] `CHAT_INPUT_HEIGHT`をインポート
- [ ] ローカルの`CHAT_INPUT_HEIGHT`定数定義を削除
- [ ] `paddingBottomAnim`の定義を削除
- [ ] キーボードイベントリスナーの`useEffect`を削除
- [ ] `Animated.View`を通常の`View`に変更
- [ ] `{ paddingBottom: CHAT_INPUT_HEIGHT + keyboardHeight }`を計算
- [ ] `<ChatInputBar />`のレンダリングを削除
- [ ] TypeScriptのエラーがないことを確認
- [ ] コンパイルエラーがないことを確認

### フェーズ7: NoteListScreen リファクタリング
- [ ] `ChatInputBar`のインポートを削除
- [ ] `CHAT_INPUT_HEIGHT`をインポート
- [ ] ローカルの`CHAT_INPUT_HEIGHT`定数定義を削除
- [ ] `<ChatInputBar />`のレンダリングを削除
- [ ] `FlatList`の`contentContainerStyle`で`CHAT_INPUT_HEIGHT`を使用
- [ ] TypeScriptのエラーがないことを確認
- [ ] コンパイルエラーがないことを確認

---

## 🎉 完了条件

以下の全ての条件が満たされた場合、このリファクタリングは完了とみなされます。

1. **全フェーズの実装が完了している**
2. **全てのテスト項目がパスしている**
3. **TypeScriptのコンパイルエラーがない**
4. **既存の機能が正常に動作している**
5. **新しい機能（グローバルチャットUI）が正常に動作している**
6. **パフォーマンスに問題がない**
7. **コードレビューが完了している（該当する場合）**

---

## 📞 質問・サポート

実装中に不明な点や問題が発生した場合は、以下の情報を含めて質問してください。

- 実行中のフェーズ番号
- エラーメッセージ（該当する場合）
- 期待される動作と実際の動作
- 使用している環境（iOS/Android、エミュレータ/実機など）

---

**このドキュメントは随時更新されます。最新版を確認してください。**
