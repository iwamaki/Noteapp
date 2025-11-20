# フロントエンドアーキテクチャ分析レポート

**作成日**: 2025/11/16
**対象**: Noteapp フロントエンド (appフォルダ)
**調査方法**: 2段階詳細調査（第1段階：全体像把握、第2段階：深掘り分析）

---

## 目次

1. [プロジェクト規模と構成](#1-プロジェクト規模と構成)
2. [ディレクトリ構造の詳細分析](#2-ディレクトリ構造の詳細分析)
3. [状態管理の使用実態](#3-状態管理の使用実態)
4. [依存関係とアーキテクチャパターン](#4-依存関係とアーキテクチャパターン)
5. [エラーハンドリングの現状](#5-エラーハンドリングの現状)
6. [パフォーマンスボトルネック](#6-パフォーマンスボトルネック)
7. [課題の優先順位付き分析](#7-課題の優先順位付き分析)
8. [既存のベストプラクティス](#8-既存のベストプラクティス)
9. [推奨アーキテクチャ詳細](#9-推奨アーキテクチャ詳細)
10. [段階的移行プラン詳細](#10-段階的移行プラン詳細)

---

## 1. プロジェクト規模と構成

### 1.1 基本統計

```
総ファイル数: 180個のTypeScript/TSXファイル
総コード行数: 約24,197行
階層レベル: 4-5階層の深さ
```

### 1.2 ディレクトリ別ファイル数分布

| ディレクトリ | ファイル数 | 割合 | 主要な責務 |
|------------|----------|------|-----------|
| **features/chat** | 58個 | 32% | チャット機能（LLM統合） |
| **screen** | 53個 | 29% | 画面コンポーネント |
| **initialization** | 17個 | 9% | アプリ初期化 |
| **billing** | 13個 | 7% | 課金・トークン管理 |
| **data** | 9個 | 5% | データレイヤー |
| **design** | 5個 | 3% | デザインシステム |
| **components** | 11個 | 6% | 共有UI |
| **settings** | 4個 | 2% | 設定管理 |
| **その他** | 10個 | 6% | navigation, auth, hooks等 |

### 1.3 ファイルサイズ分布

| サイズ範囲 | ファイル数 | 用途 |
|----------|----------|------|
| 1-50行 | 約40個 | 小さなユーティリティ、型定義 |
| 51-100行 | 約60個 | コンポーネント、サービス |
| 101-200行 | 約50個 | 複雑なロジック、ストア |
| 201-300行 | 約20個 | 大型コンポーネント、マネージャー |
| **300行以上** | 約10個 | 最複雑なサービス |

**特筆すべき大型ファイル**:
- `CustomModal.tsx`: **7,698行** ⚠️ 巨大化の懸念
- `FileRepository.ts`: 複数メソッドの大型リポジトリ
- `APIService (api.ts)`: 173行

---

## 2. ディレクトリ構造の詳細分析

### 2.1 features/chat (58ファイル) - チャット機能の核

#### 構造

```
features/chat/
├── llmService/           # LLM統合の核
│   ├── api.ts (173行)   # LLM APIの抽象化インターフェース
│   ├── core/            # ConversationHistory, ProviderManager, RequestManager
│   ├── services/        # WebSocketService, SummarizationService
│   ├── types/           # 9個の型定義ファイル
│   └── utils/           # CommandValidator, ErrorHandler, HttpClient等
│
├── handlers/ (8ファイル)  # LLMコマンド処理
│   ├── createFile, deleteFile, renameFile (Flat版)
│   ├── editFile, editFileLines
│   └── fileContent, searchResults
│
├── services/ (6ファイル)  # ビジネスロジック層
│   ├── chatAttachmentService.ts    # ファイル添付管理
│   ├── chatCommandService.ts       # コマンドディスパッチ
│   ├── chatSummarizationService.ts # 会話要約
│   ├── chatTokenService.ts         # トークン使用量管理
│   ├── chatWebSocketManager.ts     # WebSocket管理
│   └── ToolService.ts              # ツール実行
│
├── components/ (8ファイル) # UI要素
│   ├── ChatInputBar, ChatHistory, MessageInput, MessageItem
│   └── ModelCard, ModelSelectionModal, AttachedFilesList
│
├── store/                # Zustandストア
│   └── chatStore.ts     # messages, isLoading, attachedFiles, tokenUsage
│
└── index.ts             # ChatServiceシングルトンのエクスポート
```

#### 評価

**良い点**:
- ✅ FSD (Feature-Sliced Design) の基礎が実装済み
- ✅ ui/model/api 層の分離が明確
- ✅ 責務の部分的分離（各サービスが独立）
- ✅ 型定義が9ファイルに整理されている

**課題**:
- ⚠️ index.ts でシングルトンパターン使用（テスト困難）
- ⚠️ handlers/ が8個に分散（一貫性の検討余地）

---

### 2.2 screen (53ファイル) - 画面コンポーネント

#### file-list-flat (25ファイル)

```
screen/file-list-flat/
├── context/
│   ├── FlatListContext.tsx (852行) ⚠️ 複雑
│   └── flatListReducer.ts
│
├── components/ (9ファイル)
│   ├── モーダル: CreateFileModal, RenameFileModal, MoveFileModal等
│   └── リスト: FileListItem, CategorySection等
│
├── hooks/ (4ファイル)
│   ├── useFileListHeader.ts
│   ├── useRAGSync.ts
│   ├── useImportExport.ts
│   └── useCategoryCollapse.ts
│
└── application/
    └── FileListUseCasesFlatユースケース層
```

**評価**:
- ⚠️ FlatListContext が852行で複雑すぎる
- ⚠️ Context API + useReducer で状態管理（Zustand との混在）
- ✅ モーダルが9個のコンポーネントに分離（CustomModalとの関係要確認）

#### file-edit (20ファイル)

```
screen/file-edit/
├── stores/
│   └── useFileEditorStore.ts (Zustandストア)
│
├── services/
│   ├── FileService.ts
│   ├── ValidationService.ts
│   └── ErrorService.ts
│
├── components/ (11ファイル)
│   ├── TextEditor, MarkdownPreview, FeatureBar
│   └── 各種モーダル・ボタン
│
└── utils/
    └── HistoryManager.ts
```

**評価**:
- ✅ Zustandストアで状態管理（良好）
- ✅ サービス層の分離（良好）
- ⚠️ HistoryManagerとストアの統合を検討余地

---

### 2.3 initialization (17ファイル) - アプリ初期化

#### 構造

```
initialization/
├── AppInitializer.ts        # シングルトンで初期化プロセス全体を制御
├── InitializationStore.ts   # Zustandで初期化状態を管理
└── tasks/ (14ファイル)      # 初期化タスク
    ├── Critical: authenticateDevice, initializeFileSystem, verifyAsyncStorage
    ├── Core: loadSettings, loadIconFonts, configureLLMService
    ├── Services: initializeWebSocket, configureChatService, initializeBillingService
    └── Ready: preloadLLMProviders, loadToolDefinitions, restorePendingPurchases等
```

#### 初期化フロー

```
Stage 1: CRITICAL
├── authenticateDevice
├── initializeFileSystem
├── verifyAsyncStorage
└── loadSettings

Stage 2: CORE
├── loadIconFonts
└── configureLLMService

Stage 3: SERVICES
├── initializeWebSocket
├── configureChatService
├── initializeBillingService
├── preloadLLMProviders (← configureLLMService の後)
├── loadToolDefinitions
└── restorePendingPurchases (← initializeBillingService の後)

Stage 4: READY
└── アプリケーション準備完了
```

**評価**:
- ✅ ステージ別の明確な構造
- ✅ タスクの依存関係が管理されている
- ⚠️ 14個のタスクは並列実行の余地あり（パフォーマンス最適化の機会）

---

### 2.4 billing (13ファイル) - 課金管理

```
billing/
├── constants/  # モデル価格表、トークンパッケージ、価格設定
├── services/   # IAP統合、API通信、購入復元
└── utils/      # コスト計算、トークンバランス、モデルカテゴリー分類
```

**評価**:
- ✅ 独立性が非常に高い
- ✅ 他モジュールとのカップリングが少ない
- ✅ 責務が明確

---

### 2.5 data (9ファイル) - データレイヤー

```
data/
├── core/
│   ├── typesFlat.ts      # FileFlat, FileMetadataFlat等のドメイン型
│   └── errors.ts         # FileSystemV2Error, RepositoryError
│
├── repositories/
│   ├── fileRepository.ts # CRUD操作 (getAll, getById, create, update, delete)
│   └── storage/          # ファイルシステム低層操作
│
└── services/
    ├── categoryGroupingService.ts    # ファイルをカテゴリーでグループ化
    ├── categoryOperationsService.ts  # カテゴリー操作
    └── metadataService.ts            # メタデータ操作
```

**評価**:
- ✅ リポジトリパターンが実装されている
- ✅ ドメイン型が明確に定義されている
- ⚠️ エラークラスが複数定義（統一の余地）

---

### 2.6 design (5ファイル) - デザインシステム

```
design/
├── markdown/
│   ├── MarkdownRenderer.tsx
│   ├── markdownRules.ts
│   └── markdownStyles.ts
│
├── theme/
│   └── ThemeContext.tsx  # ダークモード/ライトモード
│
└── styles/
    └── responsive.ts
```

**評価**:
- ✅ デザインシステムが独立している
- ✅ テーマ管理がContext APIで実装（適切）

---

### 2.7 components (11ファイル) - 共有UI

```
components/
├── CustomModal.tsx (7,698行) ⚠️ 巨大化
├── CustomHeader.tsx
├── CustomInlineInput.tsx
├── FabButton.tsx
├── ListItem.tsx
├── SplashScreen.tsx
├── MainContainer.tsx
├── KeyboardAvoidingWrapper.tsx
├── PurchaseConfirmModal.tsx
├── ActionsListModal.tsx
└── InputFormModal.tsx
```

**評価**:
- ⚠️ **CustomModal.tsx が7,698行** - 最大の懸念事項
- ✅ 他のコンポーネントは適切なサイズ
- ⚠️ screen/ 内のモーダルとの関係性が不明確

---

## 3. 状態管理の使用実態

### 3.1 Zustandストア（3個）

#### useChatStore

```typescript
// features/chat/store/chatStore.ts
interface ChatStore {
  messages: ChatMessage[];
  isLoading: boolean;
  attachedFiles: FileFlat[];
  tokenUsageInfo: TokenUsageInfo | null;

  // Actions
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
  // ...
}
```

**評価**:
- ✅ 約79行、シンプルで良好
- ✅ 責務が明確（チャット関連のみ）
- ✅ シングルトンパターンからの移行成功

#### useSettingsStore

```typescript
// settings/settingsStore.ts
interface AppSettings {
  // UI設定
  theme: 'light' | 'dark' | 'system';
  fontSize: number;
  lineSpacing: number;

  // 編集設定
  autoSave: boolean;
  defaultEditorMode: 'text' | 'markdown';

  // LLM設定
  llmEnabled: boolean;
  privacyMode: boolean;
  aiResponseStyle: string;

  // その他多数...
}
```

**評価**:
- ⚠️ 約100行以上、やや複雑
- ⚠️ 責務が多い（UI、編集、LLM、セキュリティ等）
- ✅ AsyncStorageへの永続化が実装されている

#### useFileEditorStore

```typescript
// screen/file-edit/stores/useFileEditorStore.ts
interface FileEditorStore {
  // ファイル編集状態
  content: string;
  metadata: FileMetadataFlat | null;

  // UI状態
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // 履歴
  canUndo: boolean;
  canRedo: boolean;
}
```

**評価**:
- ✅ 約100行、適切なサイズ
- ⚠️ HistoryManagerとの統合が必要
- ✅ 責務が明確

---

### 3.2 Context API + useReducer（3個）

#### FlatListContext

```typescript
// screen/file-list-flat/context/FlatListContext.tsx
// 852行 ⚠️

interface FlatListState {
  files: FileFlat[];
  selectedFileIds: Set<string>;
  isSelectionMode: boolean;
  searchQuery: string;
  modals: {
    create: { visible: boolean };
    rename: { visible: boolean; file: FileFlat | null };
    move: { visible: boolean; files: FileFlat[] };
    // ... 他のモーダル状態
  };
}

type FlatListAction =
  | { type: 'SET_FILES'; payload: FileFlat[] }
  | { type: 'TOGGLE_SELECT'; payload: string }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  // ... 8種類以上のAction型
```

**評価**:
- ❌ **852行は複雑すぎる**
- ⚠️ reducer が複雑、デバッグが困難
- ⚠️ Zustand への移行を強く推奨

#### ChatUIContext

```typescript
// features/chat/ui/contexts/ChatUIContext.tsx
// 約66行

interface ChatUIContextType {
  // UI状態（アニメーション、フォーカス等）
  isInputFocused: boolean;
  setInputFocused: (focused: boolean) => void;
  // ...
}
```

**評価**:
- ✅ 軽量、適切なサイズ
- ⚠️ useChatStoreとの責務重複の可能性を確認必要

#### ThemeContext

```typescript
// design/theme/ThemeContext.tsx

interface ThemeContextType {
  theme: 'light' | 'dark' | 'system';
  colors: ColorPalette;
  toggleTheme: () => void;
}
```

**評価**:
- ✅ 軽量、必要な実装
- ✅ Context APIの適切な使用例

---

### 3.3 状態管理の使い分け（現状）

| 技術 | 使用箇所 | 適切性 | 推奨 |
|-----|---------|--------|------|
| Zustand | useChatStore | ✅ 適切 | 継続 |
| Zustand | useSettingsStore | ⚠️ やや複雑 | 継続（分割検討） |
| Zustand | useFileEditorStore | ✅ 適切 | 継続 |
| Context + useReducer | FlatListContext | ❌ 複雑すぎる | **Zustandへ移行** |
| Context API | ChatUIContext | ✅ 適切 | 継続 |
| Context API | ThemeContext | ✅ 適切 | 継続 |

**推奨ルール**:
```
1. グローバル状態（複数画面で共有） → Zustand
2. ローカル状態（単一コンポーネント内） → useState
3. UI バリエーション/プロバイダー → Context API
```

---

## 4. 依存関係とアーキテクチャパターン

### 4.1 主要モジュール間の依存関係グラフ

```
ChatService (シングルトン)
├── APIService (LLM Service)
│   ├── ConversationHistory
│   ├── HttpClient
│   ├── RequestManager
│   ├── ProviderManager
│   ├── SummarizationService
│   └── WebSocketService (シングルトン)
│
├── ChatAttachmentService
├── ChatCommandService
├── ChatTokenService
├── ChatWebSocketManager
└── ChatSummarizationService

依存元:
├── useChatStore (Zustand)
├── useSettingsStore (Zustand)
├── FileRepository (@data層)
├── billing/utils/tokenBalance
└── logger (@utils)
```

### 4.2 シングルトンパターンの使用箇所

| クラス | 場所 | 影響 |
|-------|------|------|
| **ChatService** | `features/chat/index.ts` | ❌ テスト困難 |
| **WebSocketService** | `features/chat/llmService/services/` | ❌ テスト困難 |
| **AppInitializer** | `initialization/AppInitializer.ts` | ⚠️ 初期化専用なので許容可能 |

**問題点**:
```typescript
// 現状
class ChatService {
  private static instance: ChatService | null = null;

  static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }
}

// テストでのモック化が困難
const service = ChatService.getInstance(); // ❌ モックに差し替えられない
```

---

### 4.3 相対パスの深さ問題

```
最深の相対パス:
- ../../../../utils/logger (4階層)

使用箇所:
- app/features/chat/llmService/utils/ErrorHandler.ts
- app/features/chat/llmService/services/WebSocketService.ts

現状のパス使用状況:
- ../../../ : 13個（features/chat の直下レイヤー）
- ../../../../ : 6個（features/chat/llmService/utils, services）

改善策:
- @features, @shared, @utils 等のパスエイリアスを設定
```

**Before**:
```typescript
import { logger } from '../../../../utils/logger';
import { FileRepository } from '../../../data/repositories/fileRepository';
```

**After（パスエイリアス設定後）**:
```typescript
import { logger } from '@shared/utils/logger';
import { FileRepository } from '@features/file/model/repositories';
```

---

### 4.4 循環依存の状況

**現状**: ✅ 解決済み

リファクタリング履歴より：
```
commit 8bb4c09 - "refactor: Resolve all circular dependencies in billing and llmService modules"
```

**評価**:
- ✅ 循環依存は既に解決されている
- ✅ リファクタリング履歴から、意識的に対処されている
- ⚠️ 今後の開発で再発防止のルールが必要

---

## 5. エラーハンドリングの現状

### 5.1 エラークラスの定義箇所

#### FileSystemV2Error & RepositoryError

```typescript
// data/core/errors.ts

export class FileSystemV2Error extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'FileSystemV2Error';
  }
}

// エラーコード:
// - CREATE_ERROR
// - READ_ERROR
// - WRITE_ERROR
// - UPDATE_ERROR
// - DELETE_ERROR

export class RepositoryError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}

// エラーコード:
// - GET_ERROR
// - UPDATE_ERROR
// - MOVE_ERROR
```

#### LLMError

```typescript
// features/chat/llmService/types/LLMError.ts

export class LLMError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

// エラーコード:
// - TIMEOUT
// - VALIDATION_ERROR
// - NETWORK_ERROR
```

#### ErrorType enum

```typescript
// features/chat/utils/errorTypes.ts

export enum ErrorType {
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
  VALIDATION = 'VALIDATION',
  FILE_OPERATION = 'FILE_OPERATION',
  LLM_API = 'LLM_API',
  UNKNOWN = 'UNKNOWN',
}
```

### 5.2 エラーハンドリングの問題点

| 問題 | 詳細 | 影響 |
|------|------|------|
| **統一性の欠如** | 3種類のエラークラス + 1種類のenum | デバッグが困難 |
| **命名規則の不一致** | CREATE_ERROR vs TIMEOUT vs NETWORK | 予測困難 |
| **ハンドリングの分散** | 各所で独自のtry/catch | 一貫性なし |
| **グローバルバウンダリなし** | 予期しないエラーがキャッチされない | UX低下 |

### 5.3 エラーハンドリングフロー（現状）

```
エラー発生
    ↓
try/catch （各所で個別実装）
    ↓
    ├── UnifiedErrorHandler (features/chat/utils/errorHandler.ts)
    │   └── handleChatError() で統一（チャット関連のみ）
    │
    ├── ErrorService (screen/file-edit/services/ErrorService.ts)
    │   └── 画面固有のエラー処理
    │
    └── 個別のcatch句（統一されていない）

課題:
- エラーハンドリングが統一されていない
- グローバルエラーバウンダリがない
- エラーリカバリーストラテジーが不明確
```

---

## 6. パフォーマンスボトルネック

### 6.1 FileRepository.getAll() のメモリ問題

#### 現在の実装

```typescript
// data/repositories/fileRepository.ts

static async getAll(): Promise<FileFlat[]> {
  const items = await CONTENT_DIR.list();  // ディレクトリリスト取得

  const filePromises = items
    .filter(item => item instanceof Directory)
    .map(async (item) => {
      const fileDir = item as Directory;

      // 各ファイルの処理
      const metadata = await readFileMetadata(fileDir);  // JSON読み込み
      const content = await readFileContent(fileDir);    // ファイル内容全体 ⚠️

      return metadataToFile(metadata, content);
    });

  // 全ファイルを並列読み込み ⚠️
  const results = await Promise.all(filePromises);

  return results;
}
```

#### 問題点

| 問題 | 詳細 | 影響 |
|------|------|------|
| **全ファイル読み込み** | メタデータだけでなく内容も全て読み込む | メモリ使用量大 |
| **並列度無制限** | Promise.all()で全て並列実行 | 大量ファイル時にリソース不足 |
| **ページネーションなし** | 全ファイルを一度に取得 | 1000件超でメモリ不足の可能性 |

#### 推定メモリ使用量

```
想定:
- ファイル数: 1000件
- 平均ファイルサイズ: 10KB
- メタデータ: 1KB/ファイル

計算:
(10KB + 1KB) × 1000 = 11MB (最小)

実際は:
- オブジェクト生成のオーバーヘッド
- 文字列の内部表現
- 配列のメモリ
→ 約30-50MB のメモリ使用が予想される
```

---

### 6.2 会話履歴のメモリ管理

#### ConversationHistory の実装

```typescript
// features/chat/llmService/core/ConversationHistory.ts

class ConversationHistory {
  private maxHistorySize: number = 100;  // 固定値
  private messages: ChatMessage[] = [];

  addMessage(message: ChatMessage) {
    this.messages.push(message);

    // 上限を超えたら古いメッセージを削除
    if (this.messages.length > this.maxHistorySize) {
      this.messages.shift();
    }
  }
}
```

#### 問題点

```
各メッセージの構造:
{
  id: string,
  content: string,           // テキスト内容
  timestamp: Date,
  attachedFiles: FileFlat[], // ファイルの完全な内容を含む ⚠️
  tokensUsed: number,
  // ...
}

課題:
1. attachedFiles にファイルの全内容が含まれる
2. 大容量ファイル × 多数の添付でメモリ急増
3. maxHistorySize = 100 は固定値（設定不可）
```

**例**:
```
10個のメッセージ × 5個の添付ファイル × 平均10KB
= 500KB （適度）

100個のメッセージ × 5個の添付ファイル × 平均10KB
= 5MB （許容範囲）

100個のメッセージ × 10個の添付ファイル × 平均100KB
= 100MB （問題あり）
```

---

### 6.3 仮想化の欠如

#### ChatHistory（メッセージリスト）

```typescript
// features/chat/components/ChatHistory.tsx

// 仮想化なし
<ScrollView>
  {messages.map((message) => (
    <MessageItem key={message.id} message={message} />
  ))}
</ScrollView>
```

**問題**:
- 全メッセージをDOMにレンダリング
- メッセージ数が増えるとパフォーマンス低下

#### FileList（ファイル一覧）

```typescript
// screen/file-list-flat/components/...

// FlatList使用（React Nativeの仮想化リスト）
<FlatList
  data={files}
  renderItem={({ item }) => <FileListItem file={item} />}
/>
```

**評価**:
- ✅ FlatListで仮想化されている（良好）

---

### 6.4 初期化タスクの並列化可能性

#### 現在のフロー（順序実行）

```typescript
// initialization/AppInitializer.ts

// Stage 1: CRITICAL（順序実行）
await this.executeTask('authenticateDevice');
await this.executeTask('initializeFileSystem');
await this.executeTask('verifyAsyncStorage');
await this.executeTask('loadSettings');

// Stage 2: CORE
await this.executeTask('loadIconFonts');
await this.executeTask('configureLLMService');

// Stage 3: SERVICES
await this.executeTask('initializeWebSocket');
await this.executeTask('configureChatService');
await this.executeTask('initializeBillingService');
await this.executeTask('preloadLLMProviders');  // ← configureLLMService の後
await this.executeTask('loadToolDefinitions');
await this.executeTask('restorePendingPurchases'); // ← initializeBillingService の後
```

#### 並列実行可能なタスク

**Stage 1（完全並列可能）**:
```typescript
await Promise.all([
  this.executeTask('authenticateDevice'),
  this.executeTask('initializeFileSystem'),
  this.executeTask('verifyAsyncStorage'),
  this.executeTask('loadSettings'),
]);
```

**Stage 3（部分的に並列可能）**:
```typescript
// グループ1（並列）
await Promise.all([
  this.executeTask('initializeWebSocket'),
  this.executeTask('configureChatService'),
  this.executeTask('initializeBillingService'),
  this.executeTask('configureLLMService'),
  this.executeTask('loadToolDefinitions'),
]);

// グループ2（並列、グループ1の後）
await Promise.all([
  this.executeTask('preloadLLMProviders'),
  this.executeTask('restorePendingPurchases'),
]);
```

**期待効果**:
- 起動時間が約30-40%短縮される可能性

---

## 7. 課題の優先順位付き分析

### 7.1 CRITICAL（即座に対処すべき）

#### 課題1: シングルトンパターンによるテスト困難性

**影響範囲**: テスト全般、コード品質

**詳細**:
```typescript
// features/chat/index.ts
export default ChatService.getInstance();

// 問題:
// 1. getInstance()はモック化できない
// 2. テストごとに状態がリセットされない
// 3. 依存関係が隠蔽される
```

**解決策**: DI (Dependency Injection) パターン導入

```typescript
// 改善案
export interface ChatServiceDependencies {
  attachmentService: ChatAttachmentService;
  commandService: ChatCommandService;
  tokenService: ChatTokenService;
  wsManager: ChatWebSocketManager;
}

export class ChatService {
  constructor(private deps: ChatServiceDependencies) {}

  static create(deps?: Partial<ChatServiceDependencies>): ChatService {
    const defaultDeps = {
      attachmentService: new ChatAttachmentService(),
      commandService: new ChatCommandService(),
      tokenService: new ChatTokenService(),
      wsManager: new ChatWebSocketManager(),
    };
    return new ChatService({ ...defaultDeps, ...deps });
  }
}

// テスト使用
const mockService = ChatService.create({
  attachmentService: mockAttachmentService,
});
```

---

#### 課題2: エラーハンドリングの統一性欠如

**影響範囲**: デバッグ性、UX、保守性

**詳細**:
- 3種類のエラークラス（FileSystemV2Error, RepositoryError, LLMError）
- 1種類のenum（ErrorType）
- 命名規則の不一致
- グローバルエラーバウンダリなし

**解決策**: 統一されたAppErrorベースクラス

```typescript
// core/errors/AppError.ts
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly domain: 'file' | 'chat' | 'llm' | 'system' | 'billing',
    public readonly originalError?: unknown,
    public readonly metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// core/errors/FileError.ts
export class FileError extends AppError {
  constructor(code: string, message: string, originalError?: unknown) {
    super(code, message, 'file', originalError);
  }
}

// 使用例
throw new FileError('FILE_CREATE_FAILED', 'ファイル作成に失敗しました', error);
```

---

#### 課題3: 状態管理の混在と使い分けルール不明確

**影響範囲**: コード可読性、デバッグ性、学習コスト

**詳細**:
- Zustand: 3箇所
- Context API + useReducer: FlatListContext（852行）
- 使い分けの明確なルールがない

**解決策**: 使い分けルールの明確化とFlatListContextの移行

```
推奨ルール:
1. グローバル状態（複数画面で共有） → Zustand
2. ローカル状態（単一コンポーネント内） → useState
3. UI バリエーション/プロバイダー → Context API
```

**FlatListContext → useFileListStore 移行**:
```typescript
// Before: 852行のContext + useReducer
const [state, dispatch] = useReducer(flatListReducer, initialState);

// After: Zustandストア（約150行に削減）
export const useFileListStore = create<FileListStore>((set, get) => ({
  files: [],
  selectedFileIds: new Set(),
  isSelectionMode: false,
  searchQuery: '',

  setFiles: (files) => set({ files }),
  toggleSelectFile: (fileId) => set((state) => {
    const newSet = new Set(state.selectedFileIds);
    newSet.has(fileId) ? newSet.delete(fileId) : newSet.add(fileId);
    return { selectedFileIds: newSet };
  }),

  async refreshData() {
    const files = await FileRepository.getAll();
    set({ files });
  },
}));
```

---

### 7.2 HIGH（早期に対処すべき）

#### 課題4: CustomModalの巨大化（7,698行）

**影響範囲**: 保守性、変更リスク

**詳細**:
- 単一ファイルが7,698行
- 複数種類のモーダルが混在している可能性
- 変更時の影響範囲が大きい

**解決策**: Compound Componentパターンで分割

```typescript
// Before: CustomModal.tsx (7,698行)

// After: 分割後
// shared/components/Modal/Modal.tsx (基底コンポーネント)
// shared/components/Modal/ModalHeader.tsx
// shared/components/Modal/ModalBody.tsx
// shared/components/Modal/ModalFooter.tsx
// shared/components/Modal/variants/ConfirmModal.tsx
// shared/components/Modal/variants/FormModal.tsx
// shared/components/Modal/variants/ActionsModal.tsx

// 各モーダルは200-300行程度に収める
```

---

#### 課題5: FileRepository.getAll() のパフォーマンス問題

**影響範囲**: メモリ使用量、パフォーマンス

**解決策**: ページネーションと並列度制御

```typescript
interface GetAllOptions {
  includeContent?: boolean;  // default: true
  pageSize?: number;         // default: 50
  pageNumber?: number;       // default: 1
  maxConcurrent?: number;    // default: 3
}

static async getAll(options: GetAllOptions = {}): Promise<FileFlat[]> {
  const { includeContent = true, pageSize = 50, pageNumber = 1, maxConcurrent = 3 } = options;

  const items = await CONTENT_DIR.list();

  // ページング
  const start = (pageNumber - 1) * pageSize;
  const pagedItems = items.slice(start, start + pageSize);

  // 並列度制御
  const results = [];
  for (let i = 0; i < pagedItems.length; i += maxConcurrent) {
    const batch = pagedItems.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(
      batch.map(async (item) => {
        const metadata = await readFileMetadata(fileDir);
        const content = includeContent ? await readFileContent(fileDir) : '';
        return metadataToFile(metadata, content);
      })
    );
    results.push(...batchResults);
  }

  return results;
}

// 使用例（メタデータのみ取得）
const files = await FileRepository.getAll({ includeContent: false });
```

---

#### 課題6: 初期化タスクの最適化

**影響範囲**: 起動時間

**解決策**: 並列実行グループ化

```typescript
// Stage 1: 完全並列
await Promise.all([
  this.executeTask('verifyAsyncStorage'),
  this.executeTask('initializeFileSystem'),
  this.executeTask('loadSettings'),
  this.executeTask('authenticateDevice'),
]);

// Stage 2: 一部並列
await Promise.all([
  this.executeTask('configureLLMService'),
  this.executeTask('initializeWebSocket'),
  this.executeTask('initializeBillingService'),
  this.executeTask('loadToolDefinitions'),
]);

// Stage 3: 依存関係あり（順序実行）
await this.executeTask('preloadLLMProviders');
await this.executeTask('restorePendingPurchases');
```

---

### 7.3 MEDIUM（計画的に対処）

#### 課題7: ディレクトリ構造の再整備

**影響範囲**: 長期的な保守性

**詳細**:
- `screen` vs `features` の区別が曖昧
- `components` が複数箇所に分散
- `services` が複数層に存在

**解決策**: FSD (Feature-Sliced Design) の完全実装

```
app/
├── core/          # 統一エラー、グローバル型
├── shared/        # 共有コンポーネント/hooks/utils
├── features/      # 機能モジュール（chat, file）
├── screens/       # ルーティング対応画面のみ
└── data/design/billing/... # 現状維持
```

---

#### 課題8: テスト戦略の構築

**影響範囲**: コード品質、リグレッション防止

**現状**: テストファイルがほぼない

**解決策**:
1. Phase 1（DI導入）後、単体テストを追加
2. Jest + React Testing Library を使用
3. テストカバレッジ目標: 60%以上

---

### 7.4 LOW（将来的に検討）

#### 課題9: モダンアーキテクチャパターンの完全採用

**候補**:
- FSD (Feature-Sliced Design): **推奨** ← 既に一部実装済み
- Clean Architecture: 複雑すぎる可能性
- Atomic Design: UIコンポーネント分類に有効

---

## 8. 既存のベストプラクティス

### 8.1 FSD（Feature-Sliced Design）の部分導入

**場所**: `features/chat/`

**評価**: ✅ 優れた実装

```
features/chat/
├── ui/           # UIレイヤー
├── model/        # ビジネスロジック（暗黙的）
├── api/          # API通信層（暗黙的）
└── store/        # 状態管理
```

**良い点**:
- 層の分離が明確
- 機能単位での独立性が高い
- 拡張が容易

---

### 8.2 責務の部分的分離

**場所**: `features/chat/services/`

**評価**: ✅ 良好

```
ChatAttachmentService  # ファイル添付
ChatCommandService     # コマンド実行
ChatTokenService       # トークン管理
ChatWebSocketManager   # WebSocket管理
ChatSummarizationService # 要約
```

**良い点**:
- 各サービスが独立している
- 責務が明確
- 再利用可能

---

### 8.3 Zustandによるモダンな状態管理

**場所**: `useChatStore`, `useFileEditorStore`, `useSettingsStore`

**評価**: ✅ 適切な技術選択

**良い点**:
- Redux比で学習コストが低い
- ボイラープレートが少ない
- TypeScriptとの相性が良い

---

### 8.4 循環依存の解決

**評価**: ✅ 意識的に対処されている

**証拠**:
```
commit 8bb4c09 - "refactor: Resolve all circular dependencies in billing and llmService modules"
```

---

## 9. 推奨アーキテクチャ詳細

### 9.1 FSD (Feature-Sliced Design) の完全採用

#### 理由

1. **既に一部導入済み** - `features/chat` で基礎が確立
2. **機能単位での独立性** - チーム開発に最適
3. **スケーラブル** - 新機能追加が容易
4. **React Nativeとの相性** - 実績あり

#### 層構造

```
アーキテクチャ構造:
┌─ Shared (再利用可能)
│  ├── UI (CustomModal, InputForm等)
│  ├── Hooks (useTheme, useAsync等)
│  ├── Utils (logger, formatters等)
│  └── Types (共有型定義)
│
├─ Entities (ドメインモデル)
│  └── File (FileFlat type定義、検証ロジック)
│
├─ Features (機能単位、完全に独立)
│  ├── chat/
│  │  ├── ui/           # UI層
│  │  ├── model/        # ビジネスロジック
│  │  ├── api/          # API層
│  │  └── store/        # 状態管理
│  └── file/
│
├─ Pages (ルーティング/画面)
│  ├── FileListScreen
│  ├── FileEditScreen
│  └── ChatScreen
│
└─ App (アプリケーション層)
   ├── initialization/
   └── navigation/
```

---

### 9.2 依存関係の方向性

```
       shared/
         ↑
    ┌────┴────────┐
    │             │
features/*    screens/*
    │             │
    └────┬────────┘
         ↓
      data/
      design/

許可される依存:
✅ screens/ → features/     (機能を使用)
✅ screens/ → shared/       (共有コンポーネントを使用)
✅ features/* → shared/     (共有リソースを使用)
✅ features/* → data/       (データレイヤーを使用)

禁止される依存:
❌ features/chat → features/file (クロス機能)
❌ shared/ → features/*          (下層への依存)
❌ data/ → features/*            (上層への依存)
```

---

### 9.3 技術スタック

| 領域 | 技術 | 理由 |
|------|------|------|
| **状態管理（グローバル）** | Zustand | ボイラープレート少、既に導入済み |
| **状態管理（UI）** | Context API | プロバイダーパターンに適している |
| **依存注入** | Factory Pattern | シンプル、テスト可能 |
| **エラー処理** | AppError基底クラス | 統一性、型安全性 |
| **テスト** | Jest + RTL | React Native標準 |

---

## 10. 段階的移行プラン詳細

### Phase 1: 基盤整備（1-2週間）🔴

#### 目標
テスト可能な基盤の構築

#### タスク

**1.1 DI (Dependency Injection) パターン導入**

```typescript
// Before
class ChatService {
  private static instance: ChatService | null = null;
  static getInstance(): ChatService { /* ... */ }
}

// After
export interface ChatServiceDependencies {
  attachmentService: ChatAttachmentService;
  commandService: ChatCommandService;
  tokenService: ChatTokenService;
  wsManager: ChatWebSocketManager;
}

export class ChatService {
  constructor(private deps: ChatServiceDependencies) {}

  static create(deps?: Partial<ChatServiceDependencies>): ChatService {
    const defaultDeps: ChatServiceDependencies = {
      attachmentService: new ChatAttachmentService(),
      commandService: new ChatCommandService(),
      tokenService: new ChatTokenService(),
      wsManager: new ChatWebSocketManager(),
    };
    return new ChatService({ ...defaultDeps, ...deps });
  }
}

// 使用
let chatServiceInstance: ChatService;

export const initializeChatService = () => {
  chatServiceInstance = ChatService.create();
};

export const getChatService = () => chatServiceInstance;

// テスト
const mockService = ChatService.create({
  attachmentService: mockAttachmentService,
});
```

**1.2 統一されたAppError作成**

```typescript
// app/core/errors/AppError.ts
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly domain: 'file' | 'chat' | 'llm' | 'system' | 'billing',
    public readonly originalError?: unknown,
    public readonly metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// app/core/errors/FileError.ts
export class FileError extends AppError {
  constructor(code: string, message: string, originalError?: unknown) {
    super(code, message, 'file', originalError);
  }
}

// app/core/errors/ChatError.ts
export class ChatError extends AppError {
  constructor(code: string, message: string, originalError?: unknown) {
    super(code, message, 'chat', originalError);
  }
}
```

**1.3 グローバルエラーバウンダリ実装**

```typescript
// app/shared/components/ErrorBoundary/ErrorBoundary.tsx
import React from 'react';
import { AppError } from '@core/errors';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: AppError | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    const appError = error instanceof AppError
      ? error
      : new AppError('UNKNOWN_ERROR', error.message, 'system', error);

    return { hasError: true, error: appError };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('ErrorBoundary', { error, errorInfo });
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}

// app/App.tsx
<ErrorBoundary>
  <ThemeProvider>
    <AppContent />
  </ThemeProvider>
</ErrorBoundary>
```

#### 受け入れ条件

- [ ] ChatServiceがDIパターンで実装され、テスト可能になっている
- [ ] AppErrorベースクラスが実装されている
- [ ] 全ドメイン（file, chat等）でAppErrorを使用している
- [ ] グローバルエラーバウンダリが動作している
- [ ] 既存機能が正常に動作している

---

### Phase 2: 状態管理統一（2週間）🟠

#### 目標
Zustand vs Context APIの使い分けを明確化し、混在を解消

#### タスク

**2.1 使い分けルールの明確化**

```
ルール:
1. グローバル状態（複数画面で共有） → Zustand
   - useChatStore
   - useSettingsStore
   - useFileListStore（新規）
   - useFileEditorStore

2. ローカル状態（単一コンポーネント内） → useState
   - フォーカス状態
   - 入力フォーム
   - 一時的なUI状態

3. UI バリエーション/プロバイダー → Context API
   - ThemeContext
   - ChatUIContext（UIアニメーションのみ）
   - KeyboardHeightContext
```

**2.2 FlatListContext → useFileListStore 移行**

```typescript
// Before: screen/file-list-flat/context/FlatListContext.tsx (852行)
const [state, dispatch] = useReducer(flatListReducer, initialState);

// After: features/file/store/fileListStore.ts
export const useFileListStore = create<FileListStore>((set, get) => ({
  // State
  files: [],
  selectedFileIds: new Set(),
  isSelectionMode: false,
  searchQuery: '',
  modals: {
    create: { visible: false },
    rename: { visible: false, file: null },
    move: { visible: false, files: [] },
  },

  // Actions
  setFiles: (files) => set({ files }),

  toggleSelectFile: (fileId) => set((state) => {
    const newSet = new Set(state.selectedFileIds);
    newSet.has(fileId) ? newSet.delete(fileId) : newSet.add(fileId);
    return { selectedFileIds: newSet };
  }),

  enterSelectionMode: () => set({ isSelectionMode: true }),
  exitSelectionMode: () => set({
    isSelectionMode: false,
    selectedFileIds: new Set()
  }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  openModal: (modalName, data) => set((state) => ({
    modals: { ...state.modals, [modalName]: { visible: true, ...data } },
  })),

  closeModal: (modalName) => set((state) => ({
    modals: { ...state.modals, [modalName]: { visible: false } },
  })),

  // Async operations
  async refreshData() {
    try {
      const files = await FileRepository.getAll();
      set({ files });
    } catch (error) {
      throw new FileError('FILE_LOAD_FAILED', 'ファイル一覧の読み込みに失敗しました', error);
    }
  },

  async deleteSelectedFiles() {
    const { selectedFileIds } = get();
    try {
      await Promise.all(
        Array.from(selectedFileIds).map(id => FileRepository.delete(id))
      );
      await get().refreshData();
      set({ selectedFileIds: new Set() });
    } catch (error) {
      throw new FileError('FILE_DELETE_FAILED', 'ファイル削除に失敗しました', error);
    }
  },
}));
```

**効果**:
- 852行 → 約150行に削減
- デバッグツール（Zustand DevTools）が使える
- 型安全性の向上

#### 受け入れ条件

- [ ] 使い分けルールがドキュメント化されている
- [ ] FlatListContextがuseFileListStoreに移行されている
- [ ] 全ての画面で新しいストアが動作している
- [ ] 状態管理の混在が解消されている

---

### Phase 3: ChatService 責務整理（2-3週間）🟡

#### 目標
Orchestratorパターンで責務を明確化

#### タスク

**3.1 ChatMessageService 抽出**

```typescript
// features/chat/model/services/ChatMessageService.ts
export class ChatMessageService {
  constructor(private store: ChatStore) {}

  createMessage(content: string, attachments: FileFlat[]): ChatMessage {
    return {
      id: generateId(),
      content,
      timestamp: new Date(),
      attachedFiles: attachments,
      role: 'user',
    };
  }

  addMessage(message: ChatMessage): void {
    this.store.addMessage(message);
  }

  clearMessages(): void {
    this.store.clearMessages();
  }

  getMessages(): ChatMessage[] {
    return this.store.messages;
  }
}
```

**3.2 ChatService (Orchestrator)**

```typescript
// features/chat/model/services/ChatService.ts
export class ChatService {
  constructor(
    private messageService: ChatMessageService,
    private attachmentService: ChatAttachmentService,
    private commandService: ChatCommandService,
    private tokenService: ChatTokenService,
    private wsManager: ChatWebSocketManager,
    private summarizationService: ChatSummarizationService,
  ) {}

  async sendMessage(message: string): Promise<void> {
    // 1. トークン残高チェック
    await this.tokenService.checkBalance();

    // 2. 添付ファイルを取得
    const attachments = this.attachmentService.getAttachedFiles();

    // 3. メッセージを作成・追加
    const chatMessage = this.messageService.createMessage(message, attachments);
    this.messageService.addMessage(chatMessage);

    // 4. コマンド実行（必要に応じて）
    if (this.commandService.isCommand(message)) {
      await this.commandService.executeCommand(message);
      return;
    }

    // 5. LLM API呼び出し
    const response = await this.apiService.sendChatMessage(message, attachments);

    // 6. トークン使用量を更新
    this.tokenService.updateUsage(response.tokensUsed);

    // 7. レスポンスメッセージを追加
    this.messageService.addMessage(response.message);
  }
}
```

#### 受け入れ条件

- [ ] ChatMessageServiceが抽出されている
- [ ] ChatServiceがOrchestratorパターンで実装されている
- [ ] 各サービスの責務が明確になっている
- [ ] チャット機能が正常に動作している

---

### Phase 4: ディレクトリ再構成（2-3週間）🟡

#### 目標
FSD (Feature-Sliced Design) の完全実装

#### タスク

**4.1 shared/ディレクトリ作成**

```bash
mkdir -p app/shared/{components,hooks,utils}

# コンポーネント移動
mv app/components/CustomModal.tsx app/shared/components/CustomModal/
mv app/components/CustomHeader.tsx app/shared/components/CustomHeader/
# ... 他のコンポーネント
```

**4.2 core/ディレクトリ作成**

```bash
mkdir -p app/core/{errors,types,constants}

# エラークラスを作成（Phase 1で作成済み）
# 型定義を集約
```

**4.3 features/file/作成**

```bash
mkdir -p app/features/file/{ui,model,store}

# screen/file-list-flat と screen/file-edit を統合
mv app/screen/file-list-flat/components app/features/file/ui/list
mv app/screen/file-edit/components app/features/file/ui/editor

# data/repositories も移動
mv app/data/repositories app/features/file/model/repositories
```

**4.4 パスエイリアス設定**

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@core/*": ["app/core/*"],
      "@shared/*": ["app/shared/*"],
      "@features/*": ["app/features/*"],
      "@screens/*": ["app/screens/*"],
      "@data/*": ["app/data/*"],
      "@design/*": ["app/design/*"],
      "@billing/*": ["app/billing/*"],
      "@settings/*": ["app/settings/*"],
      "@navigation/*": ["app/navigation/*"]
    }
  }
}

// babel.config.js
module.exports = {
  plugins: [
    [
      'module-resolver',
      {
        root: ['./app'],
        alias: {
          '@core': './app/core',
          '@shared': './app/shared',
          '@features': './app/features',
          '@screens': './app/screens',
          '@data': './app/data',
          '@design': './app/design',
          '@billing': './app/billing',
          '@settings': './app/settings',
          '@navigation': './app/navigation',
        },
      },
    ],
  ],
};
```

**4.5 インポートパスの更新**

```typescript
// Before
import { FileRepository } from '../../../../data/repositories/fileRepository';
import { logger } from '../../../utils/logger';

// After
import { FileRepository } from '@features/file/model/repositories';
import { logger } from '@shared/utils/logger';
```

#### 受け入れ条件

- [ ] shared/, core/ディレクトリが作成されている
- [ ] features/file/が作成され、ファイル機能が統合されている
- [ ] パスエイリアスが設定されている
- [ ] 全てのインポートパスが更新されている
- [ ] ビルドが成功している
- [ ] 既存機能が正常に動作している

---

### Phase 5: パフォーマンス最適化（3週間）🟢

#### 目標
スケーラビリティの向上

#### タスク

**5.1 FileRepository のページネーション実装**

```typescript
// features/file/model/repositories/FileRepository.ts

interface GetAllOptions {
  includeContent?: boolean;  // default: true
  pageSize?: number;         // default: 50
  pageNumber?: number;       // default: 1
  maxConcurrent?: number;    // default: 3
}

static async getAll(options: GetAllOptions = {}): Promise<FileFlat[]> {
  const {
    includeContent = true,
    pageSize = 50,
    pageNumber = 1,
    maxConcurrent = 3
  } = options;

  const items = await CONTENT_DIR.list();

  // ページング
  const start = (pageNumber - 1) * pageSize;
  const end = start + pageSize;
  const pagedItems = items.slice(start, end);

  // 並列度制御
  const results: FileFlat[] = [];
  for (let i = 0; i < pagedItems.length; i += maxConcurrent) {
    const batch = pagedItems.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(
      batch.map(async (item) => {
        const metadata = await readFileMetadata(fileDir);
        const content = includeContent
          ? await readFileContent(fileDir)
          : '';
        return metadataToFile(metadata, content);
      })
    );
    results.push(...batchResults);
  }

  return results;
}

// 使用例
// メタデータのみ取得（高速）
const files = await FileRepository.getAll({
  includeContent: false,
  pageSize: 100,
  pageNumber: 1,
});
```

**5.2 初期化タスクの並列化**

```typescript
// initialization/AppInitializer.ts

async initializeCriticalStage(): Promise<void> {
  // 依存関係のないタスクを並列実行
  await Promise.all([
    this.executeTask('verifyAsyncStorage'),
    this.executeTask('initializeFileSystem'),
    this.executeTask('authenticateDevice'),
    this.executeTask('loadSettings'),
  ]);
}

async initializeServicesStage(): Promise<void> {
  // グループ1: 依存なし（並列）
  await Promise.all([
    this.executeTask('configureLLMService'),
    this.executeTask('initializeWebSocket'),
    this.executeTask('initializeBillingService'),
    this.executeTask('loadToolDefinitions'),
  ]);

  // グループ2: 依存あり（並列、グループ1の後）
  await Promise.all([
    this.executeTask('preloadLLMProviders'),
    this.executeTask('restorePendingPurchases'),
  ]);
}
```

**5.3 会話履歴のメモリ管理**

```typescript
// features/chat/llmService/core/ConversationHistory.ts

class ConversationHistory {
  private maxHistorySize: number;

  constructor(maxHistorySize: number = 100) {
    this.maxHistorySize = maxHistorySize;
  }

  addMessage(message: ChatMessage) {
    // ファイルの内容を保持せず、参照のみ保持
    const lightMessage = {
      ...message,
      attachedFiles: message.attachedFiles.map(file => ({
        id: file.id,
        name: file.name,
        // 内容は保持しない
      })),
    };

    this.messages.push(lightMessage);

    if (this.messages.length > this.maxHistorySize) {
      this.messages.shift();
    }
  }
}
```

#### 受け入れ条件

- [ ] FileRepository.getAll()にページネーション/並列度制御が実装されている
- [ ] 初期化タスクが並列化されている
- [ ] 起動時間が測定され、改善が確認されている
- [ ] メモリ使用量が測定され、改善が確認されている
- [ ] パフォーマンステストで改善が確認されている

---

## まとめ

### 現状評価

**強み**:
- ✅ features/chatでFSDの基礎が確立
- ✅ 責務の部分的分離が成功
- ✅ Zustandによるモダンな状態管理
- ✅ 循環依存が既に解決済み

**課題**:
- 🔴 シングルトンパターンによるテスト困難性
- 🔴 エラーハンドリングの統一性欠如
- 🔴 状態管理の混在
- 🟠 CustomModalの巨大化（7,698行）
- 🟠 パフォーマンスボトルネック

### 推奨アクション

1. **Phase 1から着手**（最優先）- DI導入、AppError統一
2. **Phase 2で状態管理統一** - FlatListContext移行
3. **Phase 3-5を順次実行** - 段階的な改善

### 期待効果

- ✅ テスト可能性の向上（Phase 1）
- ✅ 保守性の向上（Phase 2-4）
- ✅ パフォーマンス改善（Phase 5）
- ✅ 長期的なスケーラビリティ確保

---

**作成日**: 2025/11/16
**作成者**: Claude Code
**バージョン**: 1.0
