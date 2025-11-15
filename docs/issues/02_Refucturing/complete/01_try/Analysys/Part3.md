# Noteapp/app/ フォルダの分析 - Part 3: コンポーネント層とフック層

アプリケーションのUI層とロジック再利用層を分析します。

## 6. 共通コンポーネント層

### **app/components/CustomHeader.tsx**
**役割**: ナビゲーションヘッダーのカスタマイズ  
**責任**:
- ヘッダーの左中央右のセクション管理
- ヘッダーボタンのレンダリング
- ヘッダー設定の生成ヘルパー（`useCustomHeader`フック）

**提供するインターフェース**:
```typescript
HeaderConfig: {
  title?: React.ReactNode          // 中央のタイトル（ReactNodeで柔軟）
  leftButtons?: Array<{ title, onPress, variant? }>
  rightButtons?: Array<{ title, onPress, variant? }>
}
```

**提供するコンポーネント**:
```typescript
<CustomHeader 
  title={<TextInput />}              // 編集可能なタイトル等
  leftButtons={[{ title: '←', ... }]}
  rightButtons={[{ title: '保存', ... }]}
/>
```

**提供するフック**:
```typescript
const { createHeaderConfig } = useCustomHeader()

// React Navigation の setOptions で使用
navigation.setOptions(
  createHeaderConfig({
    title: <SomeComponent />,
    leftButtons: [...],
    rightButtons: [...]
  })
)
```

**現状の評価**:

**✅ 良い点**:
- タイトルに`ReactNode`を許可（TextInputなど埋め込み可能）
- ボタンのバリアント（primary/secondary/danger）をサポート
- ヘッダー設定の生成が簡潔

**⚠️ 問題点**:
1. **コンポーネントとフックの二重定義**:
   - `CustomHeader`コンポーネントが定義されているが、実際には未使用
   - `useCustomHeader`フックのみが使用されている
   - コンポーネントとフックの役割が重複
2. **レイアウトの硬直性**:
   - `flex: 1, 2, 1`の固定比率（左：中央：右 = 1:2:1）
   - 中央セクションが`alignItems: 'flex-start'`で左寄せ（中央揃えではない）
3. **ボタン配列の制限**:
   - 複数ボタンを並べると、スペーシングが固定
   - ボタン間の区切り線などのカスタマイズ不可
4. **型安全性の欠如**:
   - `variant`が文字列リテラルだが、HeaderButtonとの整合性チェックがない

---

### **app/components/HeaderButton.tsx**
**役割**: ヘッダー内のアクションボタン  
**責任**:
- ヘッダーボタンの統一されたスタイル提供
- バリアント（primary/secondary/danger）による色分け
- レスポンシブなフォントサイズ

**プロパティ**:
```typescript
{
  title: string                    // ボタンラベル
  onPress: () => void
  disabled?: boolean
  color?: string                   // カスタムカラー（オプション）
  variant?: 'primary' | 'secondary' | 'danger'
}
```

**スタイル計算**:
```typescript
getButtonColor():
  - color が指定されていれば優先
  - variant に基づいて色を決定
    - primary: #007AFF (青)
    - secondary: #666 (グレー)
    - danger: #dc3545 (赤)
```

**現状の評価**:

**✅ 良い点**:
- シンプルで明確な責任
- レスポンシブ対応（`responsive.getResponsiveSize`）
- disabled状態の視覚的フィードバック

**⚠️ 問題点**:
1. **タッチターゲットサイズ**:
   - `minWidth: 44`は適切だが、`minHeight`が未指定
   - Appleのガイドラインでは44x44px以上推奨
2. **アクセシビリティ**:
   - `accessibilityLabel`が未設定
   - `accessibilityRole="button"`が未設定
3. **スタイルの硬直性**:
   - パディングが固定（`spacing.md`, `spacing.xs`）
   - アイコンボタン（絵文字のみ）のサポートがない
4. **color と variant の優先順位**:
   - 両方指定されると`color`が優先されるが、文書化されていない

---

### **app/components/ListItem.tsx**
**役割**: ノート一覧の各アイテム表示  
**責任**:
- ノートのタイトル・サブタイトル表示
- 選択モードでのチェックボックス表示
- タップ・長押しイベントの処理
- 右側の追加要素（`rightElement`）のサポート

**プロパティ**:
```typescript
{
  title: string
  subtitle?: string
  onPress: () => void
  onLongPress?: () => void
  rightElement?: React.ReactNode   // 右側の追加UI
  disabled?: boolean
  isSelected?: boolean             // 選択状態
  isSelectionMode?: boolean        // 選択モード
}
```

**視覚的状態**:
```typescript
- 通常: 白背景、小さいシャドウ
- 選択中: 青色背景（20%透明度）、青いボーダー
- 選択モード: チェックボックス表示
- disabled: 50%透明度
```

**現状の評価**:

**✅ 良い点**:
- 選択モードの視覚的フィードバックが明確
- `numberOfLines={1}`で長いテキストの省略対応
- レスポンシブなパディング
- `rightElement`で柔軟な拡張が可能

**⚠️ 問題点**:
1. **デフォルト値の問題**:
   - `title || '無題のノート'`で空文字列も「無題」扱い
   - 意図的な空タイトルと区別できない
2. **選択モードのUX**:
   - チェックボックスが左端にあるが、タップ領域は全体
   - チェックボックスだけをタップするべきか、全体をタップするべきか不明確
3. **アクセシビリティ**:
   - チェックボックスに`accessibilityLabel`がない
   - スクリーンリーダーで選択状態を読み上げない
4. **スタイルの重複**:
   - `isSelected`と`isSelectionMode`の両方で背景色が変わる
   - 選択モードONだが未選択の場合の視覚的差異が小さい
5. **パフォーマンス**:
   - 各アイテムで`styles.xxx`を複数回配列結合
   - `useMemo`による最適化がない

---

### **app/components/FabButton.tsx**
**役割**: フローティングアクションボタン（画面右下の円形ボタン）  
**責任**:
- 主要アクションのトリガー（通常は新規作成）
- サイズバリエーション（small/medium/large）
- レスポンシブ対応

**プロパティ**:
```typescript
{
  onPress: () => void
  icon?: string                    // デフォルト: '+'
  disabled?: boolean
  backgroundColor?: string         // デフォルト: primary色
  size?: 'small' | 'medium' | 'large'
}
```

**サイズ計算**:
```typescript
small:  40px (レスポンシブ: 32-48px)
medium: 56px (レスポンシブ: 48-64px)
large:  72px (レスポンシブ: 64-80px)
```

**位置**:
```typescript
position: 'absolute'
right: spacing.xxl (24px)
bottom: spacing.xxl + 80 (104px)  // チャット入力バーの上
```

**現状の評価**:

**✅ 良い点**:
- マテリアルデザインのFABを忠実に実装
- サイズバリエーションが豊富
- レスポンシブ対応が徹底
- チャット入力バーとの位置調整済み

**⚠️ 問題点**:
1. **位置の硬直性**:
   - `bottom: spacing.xxl + 80`の「80」がマジックナンバー
   - `ChatInputBar`の高さと連動していない（変更に脆弱）
2. **アイコンの制限**:
   - `icon`が文字列のみ（絵文字）
   - SVGアイコンやReact Nodeを使えない
3. **アクセシビリティ**:
   - `accessibilityLabel`が未設定（「追加」などのラベルが必要）
   - `accessibilityRole`が未設定
4. **シャドウの深さ**:
   - `shadows.large`は適切だが、エレベーション値が環境依存
5. **FABの表示制御**:
   - NoteListScreenで条件付きレンダリング（`!isSelectionMode ? <FabButton /> : null`）
   - コンポーネント内で表示制御できない

---

## 7. 共通フック層

### **app/hooks/useDiffManager.ts**
**役割**: 差分表示の選択状態管理  
**責任**:
- 差分ブロックの選択状態の管理
- 全選択/全解除の処理
- 選択されたブロックから新コンテンツの生成

**入力**:
```typescript
diff: DiffLine[]  // diffServiceから生成された差分データ
```

**返り値**:
```typescript
{
  selectedBlocks: Set<number>              // 選択中のブロックID
  toggleBlockSelection: (blockId) => void  // ブロック選択切替
  toggleAllSelection: () => void           // 全選択/全解除
  generateSelectedContent: () => string    // 新コンテンツ生成
  allChangeBlockIds: Set<number>           // 全変更ブロックID
}
```

**ロジックの詳細**:
```typescript
// 初期状態: すべての変更ブロックを選択
const [selectedBlocks, setSelectedBlocks] = useState<Set<number>>(allChangeBlockIds)

// 新コンテンツ生成のロジック:
generateSelectedContent():
  - 'common': 常に含める
  - 'added': selectedBlocksに含まれる場合のみ含める
  - 'deleted': selectedBlocksに含まれない場合のみ含める（元に戻す）
  - 'hunk-header': 無視
```

**現状の評価**:

**✅ 良い点**:
- 選択状態を`Set<number>`で効率的に管理
- `useMemo`と`useCallback`で最適化されている
- 差分適用ロジックが明確
- デバッグ用のconsole.logが充実（本番では削除すべきだが）

**⚠️ 問題点**:
1. **初期選択の問題**:
   - すべての変更ブロックが初期選択される
   - ユーザーが「変更を適用しない」を選ぶ方が自然な場合もある
   - 選択/非選択のデフォルトが設定できない
2. **削除の扱い**:
   - 削除行を「選択しない」と元に戻る動作
   - 直感的でない（削除を「適用する」と考える方が自然）
3. **デバッグコードの残留**:
   - 大量の`console.log`が本番コードに残っている
   - パフォーマンスに影響する可能性
4. **エラーハンドリング**:
   - `generateSelectedContent()`でエラーが起きても通知がない
   - 空の結果を返す可能性がある
5. **ブロックIDの連続性**:
   - `changeBlockId`が連番だが、削除されたブロックの番号は飛ぶ
   - IDの再利用がない

---

### **app/hooks/useLLMCommandHandler.ts**
**役割**: LLMからのコマンドを実行  
**責任**:
- LLMレスポンス内のコマンド解釈
- `edit_file`コマンドの処理
- DiffView画面への遷移
- コンテンツ更新の同期

**入力**:
```typescript
context: {
  currentContent: string
  setContent: (content: string) => void
  title: string
}
```

**返り値**:
```typescript
{
  handleLLMResponse: (response: LLMResponse) => void
  executeCommand: (command: LLMCommand) => void
}
```

**実装の特徴**:
```typescript
// 状態管理
const previousContentRef = useRef<string>(context.currentContent)
const isWaitingForUpdateRef = useRef<boolean>(false)

// DiffViewからの戻りを監視
useEffect(() => {
  if (isWaitingForUpdateRef.current && activeNote.content !== previousContentRef.current) {
    context.setContent(activeNote.content)  // 更新を反映
    isWaitingForUpdateRef.current = false
  }
}, [activeNote])

// 画面フォーカス時の同期
useEffect(() => {
  const unsubscribe = navigation.addListener('focus', () => {
    if (activeNote.content !== context.currentContent) {
      context.setContent(activeNote.content)
    }
  })
}, [navigation])
```

**対応コマンド**:
```typescript
'edit_file': DiffView画面に遷移して差分を表示
その他: console.warnのみ（未実装）
```

**現状の評価**:

**✅ 良い点**:
- 非同期の画面遷移とコンテンツ更新を適切に処理
- `useRef`でレンダリング不要な状態を管理
- 画面フォーカス時の同期処理が堅牢
- デバッグ用のconsole.logが詳細

**⚠️ 問題点**:
1. **対応コマンドの少なさ**:
   - `edit_file`のみ実装されている
   - `CommandValidator`で定義された9種類のコマンドのほとんどが未実装
2. **状態同期の複雑性**:
   - `previousContentRef`と`isWaitingForUpdateRef`の2つのrefで状態追跡
   - 複雑なライフサイクル管理（useEffect 2つ + navigation listener）
3. **競合状態のリスク**:
   - ユーザーが手動編集 + LLMのedit_fileコマンド実行が同時発生すると、どちらが優先されるか不明
   - `DiffView`からの戻り値がない場合の処理が不明確
4. **エラーハンドリング**:
   - コマンド実行エラーが握りつぶされる
   - ユーザーへのエラー通知がない
5. **テスト困難性**:
   - ナビゲーションとストアに強く依存
   - モックが困難

---

## 8. Feature層 - note-list

### **app/features/note-list/NoteListScreen.tsx** ⭐
**役割**: ノート一覧画面  
**責任**:
- ノート一覧の表示（FlatList）
- 新規ノート作成
- 選択モードの管理
- ヘッダーのカスタマイズ
- チャット入力バーの表示

**使用するフック/Store**:
```typescript
useNoteStoreSelectors() → { notes, loading, isSelectionMode, selectedNoteIds }
useNoteStoreActions()   → { fetchNotes, createNote, toggleSelectionMode, ... }
useCustomHeader()       → { createHeaderConfig }
useIsFocused()          → 画面フォーカス検知
useNavigation()         → 画面遷移
```

**ヘッダー設定の動的変更**:
```typescript
// 通常モード
rightButtons: [{ title: '設定', onPress: → Settings }]

// 選択モード
title: <Text>{selectedCount}件選択中</Text>
leftButtons: [{ title: 'キャンセル', onPress: clearSelectedNotes }]
rightButtons: [
  { title: 'コピー', onPress: copySelectedNotes },
  { title: '削除', onPress: deleteSelectedNotes, variant: 'danger' }
]
```

**レンダリングロジック**:
```typescript
if (loading && notes.length === 0):
  → ActivityIndicator + ChatInputBar

else if (notes.length === 0):
  → 空メッセージ + ChatInputBar

else:
  → FlatList + ChatInputBar + (選択モードでなければ)FabButton
```

**現状の評価**:

**✅ 良い点**:
- 選択モードの完全な実装
- ヘッダーの動的変更が適切
- チャット機能との統合
- pull-to-refresh対応
- レスポンシブな下部パディング

**⚠️ 問題点**:
1. **デバッグコードの残留**:
   - `console.log('NoteListScreen render:', ...)`
   - `console.log('FAB render check:', ...)`
   - FABのレンダリングを即座実行関数（IIFE）でラップしてログ出力
2. **FAB表示の複雑性**:
   ```typescript
   {(() => {
     console.log('FAB render check:', { isSelectionMode, shouldShow: !isSelectionMode });
     return !isSelectionMode ? <FabButton onPress={handleCreateNote} /> : null;
   })()}
   ```
   - 単純な条件レンダリングを複雑にしている
3. **チャット入力バーの位置**:
   - `CHAT_INPUT_HEIGHT`定数がファイルトップで定義されているが、実際の高さと同期していない
   - プラットフォーム依存の計算（iOS: 78, Android: 66）
4. **エラー表示の欠如**:
   - `loading.isLoading`のチェックはあるが、`error`状態の表示がない
   - ノート取得失敗時にユーザーに通知されない
5. **リスト最適化の欠如**:
   - `FlatList`に`getItemLayout`がない（パフォーマンス最適化）
   - `keyExtractor`は適切だが、`windowSize`などの設定なし
6. **命名の不一致**:
   - `handleSelectNote`と`handleLongPressNote`で命名パターンが異なる
   - `handleCreateNote`だけが`handle`プレフィックス

---

### **app/features/note-list/hooks/useNotes.ts**
**役割**: 不明（ファイルが空）  
**責任**: 定義なし

**現状**:
- 完全に空のファイル
- おそらく`NoteListScreen`のロジックを分離する予定だったが未実装

**推奨**: 削除するか、以下のロジックを移動:
- ノート一覧取得ロジック
- 選択モードのロジック
- エラーハンドリング

---

## 9. Feature層 - note-edit

### **app/features/note-edit/NoteEditScreen.tsx** ⭐
**役割**: ノート編集画面  
**責任**:
- ノートの編集UI提供
- タイトル・コンテンツの編集
- ヘッダーのカスタマイズ（編集/保存/履歴ボタン）
- チャット機能との統合
- LLMコマンドの処理

**使用するフック**:
```typescript
useNoteEditor(noteId) → {
  activeNote, title, setTitle, content, setContent,
  isLoading, handleGoToDiff
}
useLLMCommandHandler({ currentContent, setContent, title })
useCustomHeader()
```

**ビューモードの管理**:
```typescript
const [viewMode, setViewMode] = useState<ViewMode>('edit')
// 'content' | 'edit' | 'preview' | 'diff'
```

**ヘッダーボタンの動的変更**:
```typescript
if (viewMode === 'content'):
  rightButtons: ['編集']

if (viewMode === 'edit'):
  rightButtons: ['プレビュー', '保存', '履歴']

if (viewMode === 'preview'):
  rightButtons: ['編集に戻る']
```

**チャットコンテキスト**:
```typescript
{
  currentFile: activeNote?.id,
  currentFileContent: {
    filename: title,
    content: content,
    size: content.length.toString(),
    type: 'text'
  }
}
```

**現状の評価**:

**✅ 良い点**:
- タイトルをヘッダー内のTextInputで直接編集（UX良好）
- ビューモードの切り替えが直感的
- LLMコマンドハンドラーとの統合が適切
- ローディング状態の表示

**⚠️ 問題点**:
1. **ビューモードの混在**:
   - `viewMode`状態は`NoteEditScreen`で管理
   - 実際のレンダリングは`FileEditor`で処理
   - 責任が2つのコンポーネントに分散
2. **チャット入力バーの位置計算**:
   - `CHAT_INPUT_HEIGHT`の定義が`NoteListScreen`と重複
   - マジックナンバー（iOS: 78, Android: 66）
3. **保存フローの複雑性**:
   - 「保存」ボタン → `handleGoToDiff` → DiffView画面
   - 直接保存ではなく、差分確認を強制
   - ユーザーが「変更がない」場合にアラート表示
4. **プレビューモードの未完成**:
   - `viewMode='preview'`があるが、`FileEditor`でMarkdownレンダリングのみ
   - ヘッダーのボタンが「編集に戻る」だけ（保存や履歴へのアクセスなし）
5. **タイトル編集のデバウンス**:
   - `useNoteEditor`内でデバウンス処理されているが、画面には明示されていない
   - ユーザーが「保存されている」ことを知らない
6. **エラー状態の表示欠如**:
   - `isLoading`のチェックはあるが、エラー表示がない

---

### **app/features/note-edit/hooks/useNoteEditor.ts**
**役割**: ノート編集画面のロジックをカプセル化  
**責任**:
- ノートの読み込み
- タイトル・コンテンツの状態管理
- タイトルの自動保存（デバウンス付き）
- 差分表示画面への遷移準備

**状態管理**:
```typescript
const [title, setTitle] = useState(activeNote?.title ?? '')
const [content, setContent] = useState(activeNote?.content ?? '')
const [isLoading, setIsLoading] = useState(true)
const debounceTimer = useRef<NodeJS.Timeout | null>(null)
```

**タイトル自動保存**:
```typescript
handleTitleChange(newTitle):
  1. setTitle(newTitle)  // UI即時更新
  2. 500ms後に updateNote({ id, title: newTitle })
  3. エラー時は元のタイトルに戻す
```

**保存処理**:
```typescript
handleGoToDiff():
  - activeNote.content === content なら Alert表示
  - setDraftNote({ title, content })
  - navigate('DiffView')
```

**現状の評価**:

**✅ 良い点**:
- デバウンスによるタイトル自動保存が適切
- ローディング状態の管理が明確
- エラー時のロールバック処理

**⚠️ 問題点**:
1. **自動保存のタイミング不整合**:
   - タイトルは500msでデバウンス自動保存
   - コンテンツは自動保存されない（手動で「保存」ボタン）
   - ユーザーの混乱を招く可能性
2. **ローディング状態の冗長性**:
   ```typescript
   useEffect(() => {
     setIsLoading(true);
     selectNote(noteId ?? null).finally(() => {
       // ここでローディング解除しない
     });
   }, [noteId, selectNote]);
   
   useEffect(() => {
     if (noteId === undefined || activeNote?.id === noteId) {
       setIsLoading(false);  // こちらで解除
     }
   }, [activeNote, noteId]);
   ```
   - 2つのuseEffectでローディング管理が複雑
3. **保存前の検証不足**:
   - `handleGoToDiff`で変更がない場合のみアラート
   - タイトルが空の場合の検証がない
   - 必須フィールドのチェックがない
4. **コンテンツ変更の未追跡**:
   - `setContent`は単純なsetterで、変更追跡がない
   - 未保存の変更があるかどうかを判定できない（`activeNote.content === content`のみ）
5. **エラーハンドリングの不完全性**:
   - タイトル更新エラー時はアラート表示
   - `selectNote`エラー時の処理がない（`finally`で常にローディング解除するべき）

---

### **app/features/note-edit/components/FileEditor.tsx**
**役割**: ファイル編集のビュー管理  
**責任**:
- 4つのビューモード（content/edit/preview/diff）のレンダリング
- コンテンツの編集入力
- Markdownプレビュー
- 差分表示と適用

**ビューモードごとのレンダリング**:
```typescript
'content':  → <Text>{currentContent}</Text>  // 読み取り専用表示
'edit':     → <TextInput multiline />         // 編集可能
'preview':  → <Markdown>{currentContent}</Markdown>  // Markdownレンダリング
'diff':     → <DiffViewer /> + 制御ボタン   // 差分表示
```

**ファイル形式の判定**:
```typescript
FILE_VIEWERS: {
  text: ['txt', 'log', 'cfg', 'ini'],
  markdown: ['md', 'markdown'],
  code: ['js', 'ts', 'py', 'java', ...],  // 多数の拡張子
  image: ['jpg', 'png', 'gif', ...],
  pdf: ['pdf']
}
```

**差分モードの機能**:
```typescript
<DiffViewer diff={diff} selectedBlocks={selectedBlocks} ... />
<View style={styles.footer}>
  <TouchableOpacity>全選択/全解除</TouchableOpacity>
  <TouchableOpacity>✅ 適用</TouchableOpacity>
  <TouchableOpacity>❌ キャンセル</TouchableOpacity>
</View>
```

**現状の評価**:

**✅ 良い点**:
- ファイル拡張子による形式判定が柔軟
- 差分表示と選択的適用の機能が完全
- `initialContent`の変更を`useEffect`で監視して同期

**⚠️ 問題点**:
1. **ファイル形式の未使用**:
   - `FILE_VIEWERS`で詳細な設定を定義
   - 実際には`markdown`以外は使用されていない
   - `editable`フラグが参照されていない
2. **contentモードの存在意義**:
   - `'content'`モードは単純なText表示
   - `'edit'`モードで`editable={false}`にすれば同じ
   - モードが1つ不要
3. **差分モードの実装位置**:
   - `FileEditor`内に差分表示ロジックが含まれる
   - 本来は`DiffViewScreen`の責任
   - コンポーネントの責任が肥大化
4. **差分適用の処理**:
   ```typescript
   handleApplyDiff():
     const selectedContent = generateSelectedContent();
     onModeChange('content');  // ただモード変更するだけ
     // selectedContent をどこにも渡していない！
   ```
   - 選択された内容が失われる可能性
5. **プレビューモードの制限**:
   - Markdownのみプレビュー可能
   - コード（シンタックスハイライト）のプレビューなし
   - PDFや画像の表示未実装

---

### **app/features/note-edit/components/__tests__/FileEditor.test.tsx**
**役割**: FileEditorの単体テスト  
**責任**:
- 各ビューモードのレンダリング検証

**テストケース** (3件):
```typescript
1. Markdownコンテンツがpreviewモードで正しくレンダリング
2. プレーンテキストがcontentモードで正しくレンダリング
3. editモードで編集可能なTextInputが表示
```

**現状の評価**:

**✅ 良い点**:
- 基本的なレンダリングテストが存在
- `@testing-library/react-native`を使用

**⚠️ 問題点**:
1. **テストカバレッジ不足**:
   - 3つのテストのみ（diffモードのテストがない）
   - ユーザーインタラクション（入力、ボタンクリック）のテストなし
   - `onModeChange`, `onContentChange`のコールバックテストなし
2. **Markdown検証の甘さ**:
   - `getByText('Hello Markdown')`で存在確認のみ
   - 実際に太字やリンクが正しくレンダリングされているか未検証
3. **モック不足**:
   - `react-native-markdown-display`のモックなし
   - `DiffViewer`コンポーネントのモックなし

---

## Part 3 の中間総括

### コンポーネント層の評価:

**✅ 強み**:
- 共通コンポーネントが適切に抽象化されている
- レスポンシブ対応が徹底されている
- 選択モードの実装が完全

**⚠️ 課題**:
1. **デバッグコードの残留**: 本番コードに大量のconsole.log
2. **アクセシビリティの欠如**: ほとんどのコンポーネントでa11y未対応
3. **責任の肥大化**: 特に`FileEditor`が複雑すぎる
4. **マジックナンバー**: チャット入力バーの高さなど

### フック層の評価:

**✅ 強み**:
- ロジックの再利用性が高い
- `useMemo`/`useCallback`による最適化

**⚠️ 課題**:
1. **エラーハンドリング不足**: ほとんどのフックでエラーが握りつぶされる
2. **テスト困難性**: ナビゲーションやストアへの強い依存
3. **状態同期の複雑性**: 特に`useLLMCommandHandler`

### Feature層（note-list/note-edit）の評価:

**✅ 強み**:
- 機能が完全に実装されている
- チャット機能との統合が自然

**⚠️ 課題**:
1. **空のファイルの放置**: `useNotes.ts`など
2. **自動保存の不整合**: タイトルとコンテンツで挙動が異なる
3. **ビューモード管理の分散**: 責任が複数コンポーネントに散在

---

**次は Part 4 として、残りのFeature層（diff-view, version-history, chat, settings）を分析します。準備ができたらお知らせください。**