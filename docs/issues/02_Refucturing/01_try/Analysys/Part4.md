# Noteapp/app/ フォルダの分析 - Part 4: 残りのFeature層

残りの機能モジュール（差分表示、バージョン履歴、チャット、設定）を分析します。

## 10. Feature層 - diff-view

### **app/features/diff-view/DiffViewScreen.tsx** ⭐
**役割**: 差分確認と適用/復元画面  
**責任**:
- ノートの変更差分の表示
- 選択的な変更の適用（saveモード）
- バージョンの復元（restoreモード）
- データ整合性の検証

**2つの動作モード**:
```typescript
mode: 'save' | 'restore'

// saveモード: ドラフト内容の適用
originalContent: activeNote.content (現在の保存済み内容)
newContent: draftNote.content (編集中の内容)

// restoreモード: 過去バージョンの復元
originalContent: route.params.originalContent (過去バージョン)
newContent: activeNote.content (現在の内容)
```

**コンテンツソースの優先順位**:
```typescript
originalContent = route.params?.originalContent ?? activeNote?.content ?? ''
newContent = route.params?.newContent ?? draftNote?.content ?? ''
```

**適用処理の流れ**:
```typescript
// saveモード
handleApply():
  1. generateSelectedContent() で選択された差分を適用
  2. validateDataConsistency() で整合性検証
  3. 検証失敗なら Alert表示して中断
  4. setDraftNote() でドラフト更新
  5. saveDraftNote() でストアに保存
  6. navigation.goBack()

// restoreモード
handleApply():
  1. NoteStorageService.restoreNoteVersion(noteId, versionId)
  2. selectNote(restoredNote.id) でストア更新
  3. navigate('NoteEdit', { noteId, saved: true })
```

**ヘッダーの動的変更**:
```typescript
// saveモード
headerRight: [
  { title: '☑ 全選択' / '☐ 全選択', onPress: toggleAllSelection },
  { title: `適用 (${selectedBlocks.size})`, disabled: selectedBlocks.size === 0 }
]

// restoreモード
headerRight: [
  { title: '復元', onPress: handleApply }
]
// ※全選択ボタンは表示されない（isReadOnlyのため）
```

**現状の評価**:

**✅ 良い点**:
- 2つのモード（save/restore）を1つの画面で処理
- データ整合性検証による安全性確保
- 選択ブロック数の表示でフィードバックが明確
- restoreモードではDiffViewerがreadOnly

**⚠️ 問題点**:
1. **コンテンツソースの複雑性**:
   ```typescript
   const originalContent = useMemo(() => {
     if (route.params?.originalContent) return route.params.originalContent;
     return activeNote?.content ?? '';
   }, [route.params, activeNote]);
   ```
   - `route.params`と`activeNote/draftNote`の両方からコンテンツを取得
   - どちらが優先されるかが直感的でない
   - デバッグログで「どのソースから取得したか」を確認する必要がある

2. **整合性検証のタイミング**:
   ```typescript
   const tempDiff = generateDiff(originalContent, selectedContent);
   const validation = validateDataConsistency(originalContent, selectedContent, tempDiff);
   ```
   - 差分を2回生成している（最初の`diff`と`tempDiff`）
   - パフォーマンスの無駄

3. **エラーメッセージの不親切さ**:
   ```typescript
   Alert.alert('データエラー', `保存データの整合性に問題があります: ${validation.error}`);
   ```
   - 技術的なエラーメッセージをそのまま表示
   - ユーザーが対処法を理解できない

4. **restoreモードの制限**:
   - 差分を読み取り専用で表示するだけ
   - 部分的な復元（選択した変更のみ復元）ができない
   - saveモードと同じUIだが、機能が制限されている

5. **modeのデフォルト値**:
   ```typescript
   const mode = route.params?.mode ?? 'save';
   ```
   - `DiffView`に直接遷移した場合（paramsなし）は常に'save'モード
   - 意図しない動作を引き起こす可能性

6. **デバッグログの残留**:
   ```typescript
   console.log('[DiffViewScreen] Content analysis:', { ... });
   console.log('=== 整合性エラー詳細 ===');
   ```

---

### **app/features/diff-view/components/DiffViewer.tsx**
**役割**: 差分の視覚的表示  
**責任**:
- 差分行のレンダリング（追加/削除/共通/ハンクヘッダー）
- 変更ブロックのチェックボックス表示
- 選択状態の視覚的フィードバック
- readOnlyモードのサポート

**差分行のスタイリング**:
```typescript
'added':   緑背景 (#d4edda) + 緑左ボーダー + '+' プレフィックス
'deleted': 赤背景 (#f8d7da) + 赤左ボーダー + '-' プレフィックス
'common':  グレー背景 (#f8f9fa) + ' ' プレフィックス
'hunk-header': 青背景 (#f1f8ff) + 上下ボーダー
```

**チェックボックスの表示ロジック**:
```typescript
const processedBlocks = new Set<number>();

// 各変更ブロックの最初の行のみチェックボックスを表示
const showCheckbox = 
  line.changeBlockId !== null && 
  line.changeBlockId !== undefined && 
  !processedBlocks.has(line.changeBlockId);

if (showCheckbox && line.changeBlockId) {
  processedBlocks.add(line.changeBlockId);
}
```

**行構成**:
```
[元行番号] [新行番号] [+/-/ ] [コンテンツ................................] [☐/☑]
   30         30        空白    const handleSubmit = () => {                    ☑
```

**現状の評価**:

**✅ 良い点**:
- Git風の差分表示で直感的
- 変更ブロックごとにチェックボックスを1つだけ表示（重複なし）
- readOnlyモードでチェックボックスを無効化
- 行番号の表示で位置把握が容易

**⚠️ 問題点**:
1. **行番号のレイアウト**:
   ```typescript
   <Text style={styles.lineNumber}>{line.originalLineNumber || ''}</Text>
   <Text style={styles.lineNumber}>{line.newLineNumber || ''}</Text>
   ```
   - 両方の行番号を表示（幅60px）
   - 削除行は新行番号が空、追加行は元行番号が空
   - 空白が目立つ（ユーザーが混乱する可能性）

2. **チェックボックスの位置**:
   - 最右端に配置（スクロールしないと見えない可能性）
   - 行の先頭（左端）の方がクリックしやすい
   - モバイルでは右端のタップが難しい

3. **パフォーマンス**:
   ```typescript
   {diff.map(renderDiffLine)}
   ```
   - `FlatList`や`VirtualizedList`ではなく`ScrollView`
   - 大きな差分（1000行以上）でパフォーマンス問題
   - すべての行を一度にレンダリング

4. **アクセシビリティ**:
   - チェックボックスに`accessibilityLabel`がない
   - スクリーンリーダーで「選択されている」状態を読み上げない
   - `accessibilityRole="checkbox"`が未設定

5. **チェックボックスの絵文字**:
   ```typescript
   <Text>{selectedBlocks.has(line.changeBlockId!) ? '☑' : '☐'}</Text>
   ```
   - 絵文字をチェックボックスとして使用
   - プラットフォームによって見た目が異なる
   - より明確なUI（Switch、標準のCheckbox）の方が良い

6. **ハンクヘッダーの未使用**:
   - `type: 'hunk-header'`の処理は実装されている
   - しかし`diffService.ts`では生成されていない
   - デッドコード

---

## 11. Feature層 - version-history

### **app/features/version-history/VersionHistoryScreen.tsx**
**役割**: ノートのバージョン履歴画面  
**責任**:
- ノートの過去バージョン一覧表示
- バージョン選択時に差分画面へ遷移
- 現在バージョンの表示

**データ取得**:
```typescript
useFocusEffect(() => {
  fetchVersions();  // 画面フォーカス時に毎回取得
});

fetchVersions():
  1. NoteStorageService.getNoteVersions(noteId)
  2. 現在のバージョンを先頭に追加:
     { id: 'current', noteId, content, version, createdAt: updatedAt }
  3. versions配列にセット
```

**バージョンアイテムのレンダリング**:
```typescript
<TouchableOpacity onPress={() => handleSelectVersion(item)} disabled={item.id === 'current'}>
  <Text>Version {item.version} {item.id === 'current' && '(Current)'}</Text>
  <Text>{format(item.createdAt, 'yyyy/MM/dd HH:mm:ss')}</Text>
  <Text numberOfLines={2}>{item.content}</Text>
</TouchableOpacity>
```

**バージョン選択時の処理**:
```typescript
handleSelectVersion(selectedVersion):
  if (!activeNote || selectedVersion.id === 'current') return;
  
  navigation.navigate('DiffView', {
    noteId: activeNote.id,
    versionId: selectedVersion.id,
    originalContent: selectedVersion.content,  // 過去バージョン
    newContent: activeNote.content,           // 現在の内容
    mode: 'restore'
  });
```

**現状の評価**:

**✅ 良い点**:
- 現在バージョンを履歴の先頭に表示（コンテキスト提供）
- 日付フォーマットが統一（date-fns使用）
- コンテンツプレビュー（2行まで）で内容が把握できる
- FlatListでパフォーマンス最適化

**⚠️ 問題点**:
1. **現在バージョンの特殊扱い**:
   ```typescript
   const currentVersion = {
     id: 'current',  // 文字列の特殊ID
     noteId: activeNote.id,
     content: activeNote.content,
     version: activeNote.version,
     createdAt: activeNote.updatedAt,  // updatedAtをcreatedAtとして使用
   };
   ```
   - 型が`NoteVersion`だが、実際はNote型のデータ
   - `id: 'current'`は実際のバージョンIDではない
   - 各所で`item.id === 'current'`の特殊判定が必要

2. **activeNoteへの依存**:
   ```typescript
   if (activeNote) {
     // 現在バージョン追加
   } else {
     setVersions(fetchedVersions);
   }
   ```
   - `activeNote`がnullの場合、現在バージョンが表示されない
   - `NoteEditScreen`から遷移しないと正しく動作しない可能性

3. **エラーハンドリングの不完全性**:
   ```typescript
   catch (e) {
     setError(message);
     Alert.alert('Error', 'Failed to load version history.');
   }
   ```
   - エラーメッセージが英語（日本語アプリなのに）
   - エラー状態の表示が簡素（`<Text>Error: {error}</Text>`のみ）
   - リトライボタンがない

4. **バージョン削除機能の欠如**:
   - バージョン履歴が無限に増え続ける
   - 古いバージョンを削除する機能がない
   - `settingsStore`に`maxVersionCount`設定があるが未実装

5. **差分表示の方向**:
   ```typescript
   originalContent: selectedVersion.content,  // 過去
   newContent: activeNote.content,           // 現在
   ```
   - 過去 → 現在の差分を表示
   - 「復元」時は逆方向（現在 → 過去）の方が直感的では？

6. **バージョン比較の制限**:
   - 現在バージョンと任意の過去バージョンの比較のみ
   - 過去バージョン同士の比較ができない
   - 複数バージョンの選択と比較ができない

---

## 12. Feature層 - chat

### **app/features/chat/ChatInputBar.tsx** ⭐ 複雑
**役割**: チャット入力バーとメッセージ履歴表示  
**責任**:
- メッセージ入力UI提供
- チャット履歴の表示（展開/折りたたみ）
- キーボード表示に応じた位置調整
- LLMへのメッセージ送信

**使用するフック**:
```typescript
const { messages, isLoading, sendMessage } = useChat(context, onCommandReceived);
```

**状態管理**:
```typescript
const [inputText, setInputText] = useState('')
const [isExpanded, setIsExpanded] = useState(false)
const [keyboardHeight, setKeyboardHeight] = useState(0)

// アニメーション
const expandAnimation = useRef(new Animated.Value(0)).current
const positionAnimation = useRef(new Animated.Value(0)).current
```

**キーボード対応**:
```typescript
useEffect(() => {
  const keyboardWillShow = (e) => {
    setKeyboardHeight(e.endCoordinates.height);
    Animated.timing(positionAnimation, {
      toValue: height,
      duration: e.duration || 250
    }).start();
  };
  
  const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
  Keyboard.addListener(showEvent, keyboardWillShow);
}, []);
```

**展開時のメッセージエリア**:
```typescript
// 高さアニメーション: 0 → 300
const messageAreaHeight = expandAnimation.interpolate({
  inputRange: [0, 1],
  outputRange: [0, 300]
});

<Animated.View style={{ height: messageAreaHeight }}>
  <ScrollView ref={scrollViewRef}>
    {messages.map(renderMessage)}
    {isLoading && <ActivityIndicator />}
  </ScrollView>
</Animated.View>
```

**メッセージのスタイル**:
```typescript
'user':   青背景 (#007bff) + 右寄せ + 白文字
'ai':     グレー背景 + 左寄せ + 黒文字 + ボーダー
'system': 黄色背景 (#fff3cd) + 中央寄せ + 茶文字
```

**入力エリアの構成**:
```typescript
[▲ メッセージ数] [TextInput.................................] [送信]
```

**現状の評価**:

**✅ 良い点**:
- キーボード表示時の位置調整が適切（iOS/Android対応）
- 展開/折りたたみアニメーションがスムーズ
- メッセージの自動スクロール
- ユーザー/AI/システムメッセージの明確な区別
- ローディング状態の表示

**⚠️ 問題点**:
1. **固定の高さ**:
   ```typescript
   outputRange: [0, 300]  // 展開時300pxに固定
   ```
   - 画面サイズに関係なく300px
   - 小さい画面では広すぎる、大きい画面では狭い
   - レスポンシブではない

2. **位置計算の複雑性**:
   ```typescript
   <Animated.View style={{ bottom: positionAnimation }}>
   ```
   - `position: 'absolute'`で画面最下部に固定
   - キーボードの高さ分だけ上に移動
   - SafeAreaViewとの連携がない（iPhoneのノッチ対応不足）

3. **メッセージ履歴の永続化なし**:
   - `useChat`フックで管理されるメッセージは画面間で共有されない
   - 画面を離れると履歴が消える
   - LLMServiceの会話履歴とChatInputBarの表示が分離

4. **入力制限**:
   ```typescript
   <TextInput maxLength={2000} />
   ```
   - 2000文字に制限されているが、UIでカウンター表示なし
   - ユーザーが残り文字数を知る方法がない

5. **送信ボタンの無効化**:
   ```typescript
   disabled={!canSendMessage}
   const canSendMessage = inputText.trim().length > 0 && !isLoading;
   ```
   - 空白のみの入力は送信不可（適切）
   - しかしローディング中に入力したテキストが保持される
   - ローディング中に入力欄をクリアすべきか？

6. **展開ボタンの表示**:
   ```typescript
   {!isExpanded && messages.length > 0 && (
     <TouchableOpacity>
       <Text>▲ {messages.length}</Text>
     </TouchableOpacity>
   )}
   ```
   - メッセージ数が表示されるが、未読メッセージの区別がない
   - 新しいメッセージが来たことをユーザーが気づきにくい

7. **パフォーマンス**:
   - `messages.map(renderMessage)`で全メッセージをレンダリング
   - FlatListではないため、長い履歴でパフォーマンス低下

---

### **app/features/chat/hooks/useChat.ts**
**役割**: チャット機能のロジックをカプセル化  
**責任**:
- チャットメッセージの送受信
- メッセージ履歴の管理
- LLMレスポンスの処理（コマンド抽出）
- エラーハンドリング

**状態管理**:
```typescript
const [messages, setMessages] = useState<ChatMessage[]>([])
const [isLoading, setIsLoading] = useState(false)
```

**メッセージ送信フロー**:
```typescript
sendMessage(inputText):
  1. createMessage('user', inputText)
  2. addMessage(userMessage)
  3. setIsLoading(true)
  4. APIService.sendChatMessage(inputText, context)
  5. handleLLMResponse(response)
     - AIメッセージを追加
     - コマンドがあれば onCommandReceived コールバック実行
     - 警告があればシステムメッセージ追加
     - プロバイダー情報をシステムメッセージ追加
  6. catch → handleError(error)
  7. finally → setIsLoading(false)
```

**レスポンス処理の詳細**:
```typescript
handleLLMResponse(response):
  addMessage({ role: 'ai', content: response.message })
  
  if (response.commands) {
    onCommandReceived(response.commands)  // 外部ハンドラーに委譲
  }
  
  if (response.warning) {
    addMessage({ role: 'system', content: `⚠️ ${response.warning}` })
  }
  
  if (response.provider && response.model) {
    addMessage({ 
      role: 'system', 
      content: `🔧 via ${response.provider} (${response.model}) | 履歴: ${response.historyCount}件`
    })
  }
```

**エラーハンドリング**:
```typescript
handleError(error):
  let errorMessage = '不明なエラーが発生しました。\n\nサーバーが起動していることを確認してください。';
  
  if (error instanceof Error) {
    errorMessage = `❌ エラーが発生しました: ${error.message}\n\n...`;
  }
  
  addMessage({ role: 'system', content: errorMessage })
```

**現状の評価**:

**✅ 良い点**:
- コマンドの抽出と外部ハンドラーへの委譲が適切
- 警告やプロバイダー情報のシステムメッセージ表示
- エラーメッセージが日本語で親切
- `useCallback`による最適化

**⚠️ 問題点**:
1. **メッセージの永続化なし**:
   - `useState`でのみ管理
   - 画面アンマウント時に履歴が消える
   - 複数の`ChatInputBar`インスタンスで履歴が共有されない

2. **会話コンテキストの不整合**:
   - `APIService.sendChatMessage(inputText, context)`でコンテキスト送信
   - しかし`useChat`の`messages`とLLMServiceの`conversationHistory`は別物
   - LLMServiceは自身で履歴を管理しているが、`useChat`は知らない

3. **デバッグメッセージの混在**:
   ```typescript
   addMessage({ 
     role: 'system', 
     content: `🔧 via ${response.provider} (${response.model}) | 履歴: ${response.historyCount}件`
   })
   ```
   - プロバイダー情報がシステムメッセージとして表示される
   - ユーザー向けメッセージとして適切か疑問
   - デバッグ情報は開発モードのみ表示すべき

4. **エラーメッセージの固定**:
   ```typescript
   errorMessage = '不明なエラーが発生しました。\n\nサーバーが起動していることを確認してください。';
   ```
   - エラー原因がサーバー起動だけと決めつけている
   - ネットワークエラー、認証エラー、レート制限など他の原因もある

5. **コマンドの重複処理リスク**:
   ```typescript
   if (response.commands && response.commands.length > 0 && onCommandReceived) {
     onCommandReceived(response.commands);
   }
   ```
   - `onCommandReceived`が複数回呼ばれる可能性
   - コマンド実行のべき等性が保証されていない

6. **ローディング状態の粒度**:
   - `isLoading`は全体で1つだけ
   - 複数のメッセージを同時送信できない
   - キューイング機構がない

---

### **app/features/chat/components/ChatButton.tsx**
**役割**: チャットボタン（ナビゲーションバー用）  
**責任**: チャット機能へのアクセスボタンを提供

**プロパティ**:
```typescript
{
  onPress: () => void
  disabled?: boolean
}
```

**外観**:
- 円形（40x40px）
- 青背景
- 💬 絵文字
- シャドウ付き

**現状の評価**:

**✅ 良い点**:
- シンプルで明確な役割
- disabled状態の視覚的フィードバック

**⚠️ 問題点**:
1. **未使用コンポーネント**:
   - ファイルは存在するが、どこからも使用されていない
   - `NoteListScreen`や`NoteEditScreen`で使用されていない
   - チャット機能は`ChatInputBar`で直接埋め込まれている

2. **命名の不一致**:
   - `ChatButton`という名前だが、実際は「チャットを開くボタン」
   - `ChatInputBar`の展開ボタンと役割が重複する可能性

3. **存在意義**:
   - `ChatInputBar`が常に表示されているため、別途ボタンは不要
   - デッドコードとして削除すべき

---

## 13. Feature層 - settings

### **app/features/settings/SettingsScreen.tsx**
**役割**: アプリケーション設定画面  
**責任**:
- ユーザー設定の表示と変更
- 設定項目のUI提供
- 設定のリセット

**使用する設定ストア**:
```typescript
const { settings, loadSettings, updateSettings, isLoading } = useSettingsStore();
```

**設定セクション** (表示のみ):
```typescript
1. 表示設定:
   - テーマ (未実装)
   - フォントサイズ (未実装)
   - 行番号を表示 (未実装)
   - シンタックスハイライト (未実装)
   - マークダウン記号を表示 (未実装)

2. 動作設定:
   - デフォルトエディタモード (未実装)
   - 自動保存 (未実装)
   - 自動インデント (未実装)
   - スペルチェック (未実装)
   - 自動補完 (未実装)

3. LLM（AI）設定 (未実装):
   - プライバシーモード (未実装)

4. システムと通知:
   - バージョン更新通知 (未実装)
   - バックアップ完了通知 (未実装)
   - LLM処理完了通知 (未実装)
   - 高コントラストモード (未実装)
```

**UIコンポーネント**:
```typescript
renderSection(title): セクションタイトル
renderOption(label, value, options?, onPress?): Switch または押下可能なオプション
renderPicker(label, value, options): ボタン群で選択
```

**設定のリセット**:
```typescript
<TouchableOpacity onPress={async () => {
  const { resetSettings } = useSettingsStore.getState();
  await resetSettings();
}}>
  <Text>設定をリセット</Text>
</TouchableOpacity>
```

**現状の評価**:

**✅ 良い点**:
- 設定項目が整理されている
- Pickerの実装がネイティブ風で分かりやすい
- 設定のロード・更新ロジックが適切

**⚠️ 問題点**:
1. **大量の「(未実装)」ラベル**:
   - 47項目中、表示されている項目の大半が「(未実装)」
   - ユーザーに未完成という印象を与える
   - 実際に機能していない設定を表示する意味がない

2. **設定の反映なし**:
   - 設定を変更しても、アプリの動作に影響しない
   - 例: テーマを変更しても`commonStyles.ts`は固定値
   - 例: フォントサイズを変更してもタイポグラフィは変わらない

3. **Switch の onValueChange**:
   ```typescript
   <Switch
     value={value}
     onValueChange={(newValue) => {
       if (onPress) onPress();  // newValueを使用していない！
     }}
   />
   ```
   - `newValue`を受け取っているが使用していない
   - 実際の値の切り替えが行われない

4. **Picker の実装**:
   - ボタン群による選択UI
   - ネイティブのPickerコンポーネントではない
   - 縦に並んだボタンが多いと画面が長くなる

5. **設定の検証なし**:
   - 無効な値（例: 負の数、空文字列）を設定できる
   - バリデーションがない

6. **設定画面へのアクセス**:
   - `NoteListScreen`のヘッダーに「設定」ボタンがある
   - しかし設定項目のほとんどが未実装
   - 設定画面を開いてもできることがほとんどない

---

## Part 4 の総括

### diff-view の評価:

**✅ 強み**:
- 2つのモード（save/restore）を統合
- データ整合性検証による安全性
- 選択的な差分適用が可能

**⚠️ 課題**:
1. コンテンツソースの複雑性（route.params vs store）
2. DiffViewerのパフォーマンス（VirtualizedList未使用）
3. チェックボックスの位置とアクセシビリティ
4. 行番号表示の冗長性

### version-history の評価:

**✅ 強み**:
- シンプルで直感的なUI
- 現在バージョンの表示

**⚠️ 課題**:
1. 現在バージョンの特殊扱い（`id: 'current'`）
2. バージョン削除機能の欠如（無限増加）
3. バージョン間比較の制限
4. エラーハンドリングの不完全性

### chat の評価:

**✅ 強み**:
- キーボード対応が適切
- 展開/折りたたみアニメーション
- メッセージタイプの明確な区別

**⚠️ 課題**:
1. メッセージ履歴の永続化なし
2. LLMServiceの会話履歴との不整合
3. 固定の高さ（レスポンシブでない）
4. パフォーマンス（FlatList未使用）
5. ChatButtonの未使用
6. デバッグメッセージの混在

### settings の評価:

**✅ 強み**:
- 設定項目の体系的な整理
- 設定ストアとの連携

**⚠️ 課題**:
1. **最大の問題**: 47項目中40項目以上が未実装
2. 設定変更がアプリに反映されない
3. Switch の onValueChange が機能していない
4. 未実装項目を表示する意味がない

---

## 全Feature層の横断的な問題:

1. **デバッグコードの残留**: 本番コードに大量のconsole.log
2. **エラーハンドリングの不統一**: 画面ごとに異なる方法
3. **アクセシビリティの欠如**: ほぼ全画面でa11y未対応
4. **パフォーマンス最適化の不足**: FlatListの不使用、全データロード
5. **テストの不足**: `FileEditor.test.tsx`のみ、他はテストなし
6. **未実装機能の放置**: 特にsettings画面が顕著

---

**次は Part 5（最終回）として、型定義ファイルの分析と全体のリファクタリング計画を作成します。準備ができたらお知らせください。**