# 共通APIインフラストラクチャ

アプリケーション全体で使用する、セキュアで一貫性のあるAPI通信インフラストラクチャです。

## 📁 ディレクトリ構造

```
app/features/api/
├── clients/           # HTTP・WebSocketクライアント
│   ├── HttpClient.ts
│   ├── WebSocketClient.ts
│   └── index.ts
├── hooks/            # React用カスタムフック
│   ├── useApi.ts
│   ├── useWebSocket.ts
│   └── index.ts
├── services/         # 共通サービス
│   ├── ApiErrorHandler.ts
│   └── index.ts
├── types/           # 型定義
│   ├── api.types.ts
│   └── index.ts
├── utils/           # ユーティリティ
│   ├── retry.ts
│   └── index.ts
├── index.ts         # メインエクスポート
└── README.md        # このファイル
```

## 🎯 主な機能

### 1. HttpClient - セキュアなHTTP通信

- ✅ 認証ヘッダーの自動追加
- ✅ タイムアウト管理
- ✅ リトライ機能
- ✅ 統一されたエラーハンドリング
- ✅ リクエスト/レスポンスのログ記録

### 2. WebSocketClient - 安定したWebSocket通信

- ✅ 自動再接続
- ✅ ハートビート機能
- ✅ 接続状態管理
- ✅ タイプセーフなメッセージング
- ✅ イベントハンドラー

### 3. React Hooks - 簡単なAPI呼び出し

- ✅ `useApi` - 汎用API呼び出しフック
- ✅ `useGet`, `usePost`, `usePut`, `useDelete` - HTTPメソッド別フック
- ✅ `useWebSocket` - WebSocket接続フック
- ✅ ローディング・エラー状態の自動管理

## 📖 使用方法

### HttpClient の基本的な使い方

```typescript
import { createHttpClient } from '@/features/api';

// クライアントを作成
const client = createHttpClient({
  baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000',
  timeout: 30000,
  includeAuth: true, // 認証ヘッダーを自動追加
  logContext: 'myApi',
});

// GETリクエスト
const response = await client.get('/api/users');
console.log(response.data);

// POSTリクエスト
const createResponse = await client.post('/api/users', {
  name: 'John Doe',
  email: 'john@example.com',
});

// リトライ付きリクエスト
const retryResponse = await client.get('/api/users', {
  retry: {
    maxRetries: 3,
    retryDelay: 1000,
    exponentialBackoff: true,
  },
});
```

### WebSocketClient の基本的な使い方

```typescript
import { createWebSocketClient, WebSocketState } from '@/features/api';

// クライアントを作成
const ws = createWebSocketClient(
  'ws://localhost:8000/ws/client-123',
  {
    maxReconnectAttempts: 5,
    reconnectDelay: 2000,
    heartbeatInterval: 30000,
    heartbeatTimeout: 60000,
  },
  {
    onMessage: (message) => {
      console.log('Received:', message);
    },
    onStateChange: (state) => {
      console.log('State changed:', state);
    },
  },
  'myWebSocket'
);

// 接続
ws.connect();

// メッセージを送信
ws.send({ type: 'chat', data: 'Hello, World!' });

// 切断
ws.disconnect();
```

### React Hooks の使い方

#### useApi フック

```typescript
import { useApi } from '@/features/api';
import { httpClient } from '@/services/httpClient'; // アプリで作成したクライアント

function UserList() {
  const { state, execute } = useApi(
    httpClient,
    (client) => client.get('/api/users'),
    {
      immediate: true, // マウント時に自動実行
      onSuccess: (data) => {
        console.log('Users loaded:', data);
      },
      onError: (error) => {
        console.error('Failed to load users:', error);
      },
    }
  );

  if (state.loading) return <Text>Loading...</Text>;
  if (state.error) return <Text>Error: {state.error.message}</Text>;

  return (
    <View>
      {state.data?.map((user) => (
        <Text key={user.id}>{user.name}</Text>
      ))}
    </View>
  );
}
```

#### usePost フック

```typescript
import { usePost } from '@/features/api';

function CreateUserForm() {
  const { state, execute } = usePost(httpClient, '/api/users', {
    onSuccess: (data) => {
      Alert.alert('Success', 'User created!');
    },
  });

  const handleSubmit = async () => {
    await execute({
      name: 'Jane Doe',
      email: 'jane@example.com',
    });
  };

  return (
    <View>
      <Button onPress={handleSubmit} disabled={state.loading} title="Create User" />
      {state.error && <Text>Error: {state.error.message}</Text>}
    </View>
  );
}
```

#### useWebSocket フック

```typescript
import { useWebSocket, WebSocketState } from '@/features/api';

function ChatRoom() {
  const { state, isConnected, send } = useWebSocket(
    'ws://localhost:8000/ws/chat',
    {
      eventHandlers: {
        onMessage: (message) => {
          console.log('New message:', message);
        },
      },
      autoConnect: true,
      autoDisconnect: true,
    }
  );

  const sendMessage = () => {
    send({ type: 'chat', data: 'Hello!' });
  };

  return (
    <View>
      <Text>Status: {isConnected ? 'Connected' : 'Disconnected'}</Text>
      <Button onPress={sendMessage} disabled={!isConnected} title="Send Message" />
    </View>
  );
}
```

## 🔧 エラーハンドリング

```typescript
import { ApiErrorHandler, getUserFriendlyErrorMessage } from '@/features/api';

// エラーハンドラーを作成
const errorHandler = new ApiErrorHandler('billing');

try {
  await client.get('/api/billing/balance');
} catch (error) {
  // エラーを処理
  const apiError = errorHandler.handle(error);

  // ユーザーフレンドリーなメッセージを取得
  const message = getUserFriendlyErrorMessage(apiError);
  Alert.alert('Error', message);

  // ログに記録
  errorHandler.log(error, 'Failed to fetch balance');
}
```

## 🔄 リトライ機能

```typescript
import { withRetry } from '@/features/api';

// 関数をリトライ付きで実行
const data = await withRetry(
  async () => {
    const response = await client.get('/api/unstable-endpoint');
    return response.data;
  },
  {
    maxRetries: 3,
    retryDelay: 1000,
    exponentialBackoff: true,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  },
  'myApi'
);
```

## 🎨 カスタマイズ例

### カスタムHttpClientサービスの作成

```typescript
// app/services/apiClient.ts
import { createHttpClient } from '@/features/api';

export const apiClient = createHttpClient({
  baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL!,
  timeout: 30000,
  includeAuth: true,
  logContext: 'api',
});

export const billingClient = createHttpClient({
  baseUrl: `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/billing`,
  timeout: 10000,
  includeAuth: true,
  logContext: 'billing',
});
```

### カスタムWebSocketサービスの作成

```typescript
// app/services/chatWebSocket.ts
import { createWebSocketClient } from '@/features/api';

export const chatWebSocket = createWebSocketClient(
  `${process.env.EXPO_PUBLIC_WS_URL}/ws/chat`,
  {
    maxReconnectAttempts: 5,
    heartbeatInterval: 30000,
  },
  {
    onMessage: (message) => {
      // グローバルなメッセージハンドラー
      chatStore.addMessage(message);
    },
  },
  'chat'
);
```

## 🔒 セキュリティ

このインフラストラクチャは以下のセキュリティ機能を提供します：

- **自動認証**: `getAuthHeaders()` を使用して全リクエストに認証ヘッダーを自動追加
- **HTTPS/WSS**: プロダクション環境では必ずセキュアなプロトコルを使用
- **タイムアウト**: すべてのリクエストにタイムアウトを設定
- **エラーハンドリング**: 機密情報の漏洩を防ぐ統一されたエラー処理

## 📝 型定義

すべての主要な型はエクスポートされており、TypeScriptで型安全に使用できます：

```typescript
import type {
  ApiRequestConfig,
  ApiResponse,
  ApiError,
  WebSocketMessage,
  WebSocketConfig,
  WebSocketState,
} from '@/features/api';
```

## 🧪 テスト

各クライアントはモック可能に設計されています：

```typescript
// テスト用のモッククライアント
const mockClient = createHttpClient({
  baseUrl: 'http://mock-api.test',
  includeAuth: false,
});
```

## 📚 参考リンク

- [Axios Documentation](https://axios-http.com/)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [React Hooks](https://react.dev/reference/react)
