# Noteapp/app/ フォルダの分析 - Part 2: 状態管理層とサービス層

アプリケーションの中核となる状態管理とビジネスロジック層を分析します。

## 4. 状態管理層（Store）

### **app/store/index.ts**
**役割**: 不明（ファイルが空）  
**責任**: 定義なし

**現状**:
- 完全に空のファイル
- 通常、各ストアを集約してエクスポートする役割が期待される

**問題点**:
- ストアの一元的なエクスポートポイントがない
- 各ファイルで個別に`import { useNoteStore } from '../../store/noteStore'`と記述する必要がある

---

### **app/store/noteStore.ts** ⭐ 最重要
**役割**: ノートアプリケーションのメイン状態管理  
**責任**:
- ノートデータの管理（CRUD操作）
- UI状態の管理（ローディング、エラー、選択モード）
- ドラフト状態の管理
- 検索・フィルタリング機能

**状態構造**:
```typescript
{
  // データ層
  notes: Note[]                    // 全ノート
  activeNote: Note | null          // 現在編集中のノート
  draftNote: DraftNote | null      // 未保存の編集内容
  
  // UI状態層
  loading: { isLoading, operation? }  // ローディング状態
  error: NoteError | null             // エラー状態
  lastUpdated: Date | null            // 最終更新日時
  
  // 検索・フィルタ層
  searchQuery: string              // 検索クエリ
  filteredNotes: Note[]            // フィルタ済みノート
  
  // 選択モード層
  isSelectionMode: boolean         // 選択モードON/OFF
  selectedNoteIds: Set<string>     // 選択されたノートID
}
```

**提供する主要アクション** (15個):
```typescript
// CRUD操作
fetchNotes()           // ノート一覧取得
selectNote(id)         // ノート選択
createNote(data)       // ノート作成
updateNote(data)       // ノート更新
deleteNote(id)         // ノート削除

// ドラフト管理
setDraftNote(draft)    // ドラフト設定
saveDraftNote()        // ドラフト保存
isDraftModified()      // 変更検知
discardDraft()         // ドラフト破棄

// 検索・UI
searchNotes(query)     // 検索実行
clearError()           // エラークリア

// 選択モード
toggleSelectionMode()       // 選択モード切替
toggleNoteSelection(id)     // ノート選択切替
clearSelectedNotes()        // 選択解除
deleteSelectedNotes()       // 選択ノート削除
copySelectedNotes()         // 選択ノート複製
```

**実装の特徴**:
1. **Zustand with subscribeWithSelector**: サブスクリプション最適化
2. **カスタムセレクターフック**: `useNoteStoreSelectors`, `useNoteStoreActions`
3. **型安全性**: 詳細な型定義（`NoteError`, `LoadingState`, `DraftNote`）
4. **エラーハンドリング**: 統一されたエラー処理（`createNoteError`ヘルパー）

**現状の評価**:

**✅ 良い点**:
- 非常に包括的で機能が豊富
- 状態の分離が明確（データ/UI/検索/選択）
- エラーハンドリングが統一されている
- ローディング状態に操作タイプ（operation）を持つ
- セレクターフックで再レンダリング最適化

**⚠️ 問題点**:
1. **責任過多**: 1つのストアに15個のアクションは多すぎる
2. **命名の不一致**: `selectNote`（ノート選択）と`toggleNoteSelection`（選択モードでの選択）が紛らわしい
3. **ドラフト管理の複雑性**:
   - `activeNote`と`draftNote`の関係が複雑
   - `saveDraftNote`が新規作成と更新の両方を処理
4. **選択モードの混在**: 選択モードの責任が別ストアでも良いレベル
5. **同期処理の連鎖**: `fetchNotes()` → `saveDraftNote()` → `fetchNotes()` のような再取得が多い

---

### **app/store/settingsStore.ts**
**役割**: アプリケーション設定の永続的管理  
**責任**:
- ユーザー設定の保存・読み込み
- 設定の更新とリセット
- AsyncStorageへの永続化

**設定カテゴリ** (7カテゴリ、47項目):
```typescript
1. UI設定 (8項目): theme, fontSize, fontFamily, lineSpacing等
2. 編集設定 (8項目): autoSave, defaultEditorMode, tabSize等
3. LLM/AI設定 (7項目): privacyMode, llmService, apiKey等
4. バージョン管理設定 (8項目): versionSaveFrequency, maxVersionCount等
5. セキュリティ設定 (6項目): appLock, cloudSync, encryption等
6. その他 (6項目): cacheLimit, offlineMode, notifications等
7. 開発者設定 (2項目): anonymousStats, diagnosticData
```

**提供するアクション**:
```typescript
loadSettings()       // 設定読み込み
updateSettings(updates)  // 設定更新（部分更新対応）
resetSettings()      // 設定リセット
```

**現状の評価**:

**✅ 良い点**:
- 設定項目が網羅的に定義されている
- デフォルト値が明確
- 部分更新（`Partial<AppSettings>`）に対応
- AsyncStorageで永続化されている

**⚠️ 問題点**:
1. **実装とのギャップ**: 47項目のうち、実際に使用されているのは5項目程度
2. **未実装設定の氾濫**: SettingsScreen.tsxで「(未実装)」ラベルが多数
3. **設定の適用がない**: 
   - `theme`設定があるが、`commonStyles.ts`は固定値
   - `fontSize`設定があるが、タイポグラフィは固定
   - `autoSave`設定があるが、自動保存は無条件に動作
4. **設定カテゴリの粒度**: 細かすぎる設定が多い（例: `lineSpacing: 1.5`）
5. **LLM設定の重複**: `api.ts`のLLMServiceと設定ストアの連携がない

---

## 5. サービス層

### **app/services/storageService.ts** ⭐ 最重要
**役割**: ノートとバージョンの永続化管理  
**責任**:
- AsyncStorageへのノートデータの保存・取得
- バージョン履歴の管理
- CRUD操作の実装
- データ整合性の保証

**提供する型定義**:
```typescript
Note: { id, title, content, createdAt, updatedAt, version, tags? }
CreateNoteData: { title, content, tags? }
UpdateNoteData: { id, title?, content?, tags? }
```

**主要メソッド** (12個):
```typescript
// Private Raw Methods (内部用)
getAllNotesRaw()
saveAllNotes(notes)
getAllVersionsRaw()
saveAllVersions(versions)

// Public Note Methods
getAllNotes()          // ノート一覧（更新日時降順）
getNoteById(id)        // ノート取得
createNote(data)       // ノート作成 + 初回バージョン作成
updateNote(data)       // ノート更新 + バージョン作成
deleteNote(id)         // ノート削除 + バージョン削除

// Public Version Methods
getNoteVersions(noteId)    // バージョン履歴取得
getNoteVersion(versionId)  // 特定バージョン取得
restoreNoteVersion(noteId, versionId)  // バージョン復元

// Utility Methods
searchNotes(query)     // ノート検索
clearAllData()         // 全データ削除
```

**バージョン管理の仕組み**:
```typescript
// 更新時の動作:
1. 既存ノートの現在の状態を NoteVersion として保存
2. ノートの version を +1
3. ノートの内容を更新
4. updatedAt を更新
```

**現状の評価**:

**✅ 良い点**:
- データアクセス層が明確に分離されている
- バージョン管理が自動的に行われる
- エラーハンドリングが適切（`StorageError`クラス）
- Private/Public メソッドの分離が明確
- ユーティリティクラス（`StorageUtils`）でコード重複を削減
- 日付の自動変換処理が適切

**⚠️ 問題点**:
1. **全データロードの非効率性**: 
   - `getAllNotesRaw()`が毎回全ノートをロード
   - 大量のノート（1000+）でパフォーマンス問題の可能性
2. **バージョン管理の設計**:
   - 更新のたびにバージョンが作成される（無制限に増加）
   - `maxVersionCount`設定があるが、実装されていない
3. **検索の実装**: 
   - `searchNotes`が全ノートをメモリに展開
   - 大文字小文字を区別しない検索のみ
4. **トランザクション未対応**: 
   - ノート更新とバージョン作成が分離されており、途中でエラーが起きると不整合
5. **キャッシュ戦略がない**: 毎回AsyncStorageから読み込み

---

### **app/services/diffService.ts**
**役割**: テキスト差分の計算と検証  
**責任**:
- 2つのテキスト間の行ベース差分生成
- 差分データの整合性検証
- Git Unified Diff形式に類似したデータ構造の提供

**提供する型定義**:
```typescript
DiffLine: {
  type: 'common' | 'added' | 'deleted' | 'hunk-header'
  content: string
  originalLineNumber: number | null
  newLineNumber: number | null
  changeBlockId?: number | null  // 変更ブロックの識別子
}
```

**主要関数**:
```typescript
generateDiff(originalText, newText, contextLines?)
  → DiffLine[]
  
validateDataConsistency(originalText, newText, diffLines)
  → { isValid: boolean; error?: string }
```

**アルゴリズム**:
1. **LCS (Longest Common Subsequence)**: 最長共通部分列アルゴリズム
2. **行ベース差分**: 文字レベルではなく行レベルで計算
3. **変更ブロックID**: 連続した追加/削除を1つのブロックとしてグループ化

**実装の詳細**:
```typescript
// LCSテーブルの構築: O(m*n) の動的計画法
// バックトラッキング: O(m+n) で差分を構築
// 結果: 各行が 'equal', 'delete', 'insert' のいずれか
```

**現状の評価**:

**✅ 良い点**:
- LCSアルゴリズムの正確な実装
- 行ベース処理で大きなファイルに対応
- 変更ブロックの概念で選択的な適用が可能
- データ整合性検証機能が強力
- コメントに過去の問題（文字レベル分割）への対処が記載

**⚠️ 問題点**:
1. **パフォーマンス**: 
   - O(m*n)の時間計算量（大きなファイルで遅い）
   - メモリ使用量も O(m*n)
2. **コンテキスト行の未使用**: 
   - `contextLines`パラメータが定義されているが使用されていない
   - 全行を差分に含めている（ハンクの概念が実装されていない）
3. **外部ライブラリの残骸**: 
   - `diff-match-patch`をインポートしているが未使用
   - コメントにも使用していない旨の記載がない
4. **差分の可読性**: 
   - 大きなファイルで全行表示は見づらい
   - 変更のない共通部分を省略する機能がない

---

### **app/services/llmService.ts** ⭐ 複雑
**役割**: LLM（大規模言語モデル）との連携  
**責任**:
- チャット履歴の管理
- LLMコマンドの検証
- バックエンドAPIとの通信
- LLMプロバイダーとモデルの管理

**提供する型定義** (7個):
```typescript
ChatMessage: { role, content, timestamp }
ChatContext: { currentPath?, fileList?, currentFile?, ... }  // 10+プロパティ
LLMProvider: { name, defaultModel, models, status }
LLMCommand: { action, path?, content?, description?, ... }
LLMResponse: { message, commands?, provider?, model?, ... }
LLMHealthStatus: { status, providers }
LLMConfig: { maxHistorySize, apiTimeout, baseUrl }
```

**主要クラス** (4個):

#### 1. **ConversationHistory クラス**
```typescript
private history: ChatMessage[]
private maxHistorySize: number

getHistory()              // 履歴取得
addMessage(message)       // メッセージ追加
addExchange(user, ai)     // ユーザー+AI応答を追加
clear()                   // 履歴クリア
getHistoryStatus()        // 統計情報
trimHistory()             // サイズ制限の適用（private）
```

#### 2. **CommandValidator クラス** (静的)
```typescript
private static ALLOWED_ACTIONS: [
  'create_file', 'delete_file', 'copy_file', 'move_file',
  'read_file', 'edit_file', 'list_files',
  'batch_delete', 'batch_copy', 'batch_move'
]

validate(command)         // コマンド検証
validatePath(path)        // パス安全性チェック（private）
```

#### 3. **LLMService クラス** (メイン)
```typescript
private config: LLMConfig
private conversationHistory: ConversationHistory
private availableProviders: Record<string, LLMProvider>
private currentProvider: string
private currentModel: string

sendChatMessage(message, context)  // チャット送信
loadProviders()                     // プロバイダー読み込み
checkHealth()                       // ヘルスチェック
setProvider(provider)               // プロバイダー変更
setModel(model)                     // モデル変更
getCurrentProvider/Model()          // 現在の設定取得
getAvailableProviders()             // 利用可能プロバイダー
getConversationHistory()            // 履歴取得
clearHistory()                      // 履歴クリア
```

#### 4. **PathUtils クラス** (静的)
```typescript
joinPath(basePath, ...segments)  // パス結合
```

**現状の評価**:

**✅ 良い点**:
- 包括的な型定義
- クラスベースの明確な責任分離
- インスタンス化対応（複数の会話を管理可能）
- エラークラス（`LLMError`）の実装
- コマンド検証によるセキュリティ対策
- 会話履歴の自動管理

**⚠️ 問題点**:
1. **ChatContext の肥大化**:
   - 10以上のオプショナルプロパティ
   - `currentFile`と`currentFileContent`の重複
   - `openFileInfo`の目的が不明
2. **設定との非連携**:
   - `settingsStore`にLLM設定があるが、LLMServiceは独立
   - APIキーなどの設定がストアから読み込まれない
3. **プロバイダー管理の複雑性**:
   - `availableProviders`の初期化タイミングが不明確
   - `loadProviders()`を呼ばないとプロバイダーが空
4. **会話履歴の制限**:
   - `maxHistorySize`が100件固定（configで変更可能だが、UIがない）
   - 文字数制限がない（トークン数ではなく件数制限）
5. **PathUtils の存在意義**:
   - 1つのメソッドだけの静的クラスは過剰
   - ノートアプリにファイルパスの概念は不要では？

---

### **app/services/api.ts**
**役割**: APIサービスの抽象化レイヤー  
**責任**:
- LLMServiceのラッパー
- 将来的な他のAPI追加のための拡張ポイント

**提供するクラス**:
```typescript
class APIService {
  private static llmServiceInstance = new LLMService()
  
  // LLM関連メソッド（すべて static）
  static sendChatMessage(message, context)
  static loadLLMProviders()
  static checkLLMHealth()
  static setLLMProvider(provider)
  static setLLMModel(model)
  static getCurrentLLMProvider()
  static getCurrentLLMModel()
  static getAvailableLLMProviders()
}
```

**再エクスポート**:
```typescript
export { LLMService, ChatContext, LLMResponse } from './llmService';
```

**現状の評価**:

**✅ 良い点**:
- シングルトンパターンで1つのLLMServiceインスタンスを共有
- 静的メソッドで簡単にアクセス可能
- 将来の拡張性を考慮した設計

**⚠️ 問題点**:
1. **薄いラッパー**: ほぼLLMServiceの透過的なラッパーでしかない
2. **シングルトンの問題**: 
   - テストが困難（モック化しにくい）
   - 複数の会話コンテキストを持てない（実際は1つのインスタンスを共有）
3. **静的メソッドの乱用**: 
   - 依存性注入ができない
   - ライフサイクル管理が不明確
4. **型定義の重複**: 
   - `Note`型を再定義しているが未使用
   - `CreateNoteRequest`, `UpdateNoteRequest`も未使用
5. **命名の不一致**: 
   - ファイル名が`api.ts`だが、実質的に`llmApi.ts`

---

## Part 2 の総括

### 状態管理層の評価:

**✅ 強み**:
- Zustandによる軽量で高速な状態管理
- 型安全性の徹底
- セレクターフックによる最適化

**⚠️ 課題**:
1. **noteStoreの肥大化**: 15個のアクションは多すぎる（分割すべき）
2. **settingsStoreの未使用項目**: 47項目中40項目以上が未実装
3. **ストアの集約がない**: `app/store/index.ts`が空

### サービス層の評価:

**✅ 強み**:
- 責任が明確に分離されている
- エラーハンドリングが統一されている
- バージョン管理が自動化されている

**⚠️ 課題**:
1. **storageServiceのスケーラビリティ**: 全データロードは非効率
2. **diffServiceのパフォーマンス**: O(m*n)の計算量
3. **llmServiceの複雑性**: ChatContextが肥大化
4. **apiServiceの存在意義**: 薄すぎるラッパー
5. **設定とサービスの非連携**: settingsStoreの設定が適用されていない

### 依存関係の問題:
```
noteStore → storageService ✅ 適切
noteStore → (settingsStore) ❌ 連携なし
llmService → settingsStore ❌ 連携なし
apiService → llmService → (会話履歴) ✅ 適切
```

---

**次回は Part 3 として、コンポーネント層とフック層を分析します。準備ができたらお知らせください。**