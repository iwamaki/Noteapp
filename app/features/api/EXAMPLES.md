# 使用例集

## 目次
1. [既存サービスの移行例](#既存サービスの移行例)
2. [新しいAPIサービスの作成例](#新しいapiサービスの作成例)
3. [React Nativeでの実装例](#react-nativeでの実装例)

---

## 既存サービスの移行例

### Before: 旧 BillingApiService

```typescript
// app/billing/services/billingApiService.ts (旧)
import axios, { AxiosInstance } from 'axios';
import { getAuthHeaders } from '../../auth/authApiClient';

export class BillingApiService {
  private client: AxiosInstance;

  constructor(baseUrl: string) {
    this.client = axios.create({
      baseURL: `${baseUrl}/api/billing`,
      timeout: 10000,
    });

    this.client.interceptors.request.use(async (config) => {
      const authHeaders = await getAuthHeaders();
      Object.assign(config.headers, authHeaders);
      return config;
    });
  }

  async getBalance(): Promise<TokenBalance> {
    const response = await this.client.get('/balance');
    return {
      credits: response.data.credits || 0,
      allocatedTokens: response.data.allocated_tokens || {},
    };
  }
}
```

### After: 新しい共通インフラを使用

```typescript
// app/billing/services/billingApiService.ts (新)
import { createHttpClient, ApiError } from '@/features/api';
import { logger } from '@/utils/logger';

export class BillingApiService {
  private client: HttpClient;

  constructor(baseUrl: string) {
    // 共通HttpClientを使用
    this.client = createHttpClient({
      baseUrl: `${baseUrl}/api/billing`,
      timeout: 10000,
      includeAuth: true, // 認証ヘッダーは自動追加
      logContext: 'billing',
    });
  }

  async getBalance(): Promise<TokenBalance> {
    try {
      // タイプセーフなレスポンス
      const response = await this.client.get<any>('/balance', {
        retry: { // リトライ機能が簡単に追加可能
          maxRetries: 3,
          retryDelay: 1000,
        },
      });

      return {
        credits: response.data.credits || 0,
        allocatedTokens: response.data.allocated_tokens || {},
      };
    } catch (error) {
      // 統一されたエラーハンドリング
      const apiError = error as ApiError;
      logger.error('billing', 'Failed to get balance', apiError);
      throw apiError;
    }
  }
}
```

**メリット:**
- ✅ 認証ヘッダーの自動追加（コード削減）
- ✅ 統一されたエラーハンドリング
- ✅ ログ記録が自動化
- ✅ リトライ機能が簡単に追加可能
- ✅ タイムアウト管理の一貫性

---

## 新しいAPIサービスの作成例

### ユーザー管理API

```typescript
// app/features/user/services/userApiService.ts
import { createHttpClient, HttpClient, ApiError } from '@/features/api';
import { logger } from '@/utils/logger';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
}

class UserApiService {
  private client: HttpClient;

  constructor() {
    this.client = createHttpClient({
      baseUrl: `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/users`,
      timeout: 15000,
      includeAuth: true,
      logContext: 'user',
    });
  }

  /**
   * ユーザー一覧を取得
   */
  async getUsers(): Promise<User[]> {
    try {
      const response = await this.client.get<User[]>('/', {
        retry: {
          maxRetries: 2,
          retryDelay: 1000,
        },
      });
      return response.data;
    } catch (error) {
      logger.error('user', 'Failed to get users', error);
      throw error;
    }
  }

  /**
   * ユーザーを作成
   */
  async createUser(data: CreateUserRequest): Promise<User> {
    try {
      const response = await this.client.post<User, CreateUserRequest>('/', data);
      logger.info('user', 'User created', response.data);
      return response.data;
    } catch (error) {
      logger.error('user', 'Failed to create user', error);
      throw error;
    }
  }

  /**
   * ユーザーを更新
   */
  async updateUser(id: string, data: Partial<CreateUserRequest>): Promise<User> {
    try {
      const response = await this.client.put<User, Partial<CreateUserRequest>>(
        `/${id}`,
        data
      );
      logger.info('user', 'User updated', response.data);
      return response.data;
    } catch (error) {
      logger.error('user', 'Failed to update user', error);
      throw error;
    }
  }

  /**
   * ユーザーを削除
   */
  async deleteUser(id: string): Promise<void> {
    try {
      await this.client.delete(`/${id}`);
      logger.info('user', `User ${id} deleted`);
    } catch (error) {
      logger.error('user', 'Failed to delete user', error);
      throw error;
    }
  }
}

// シングルトンインスタンス
export const userApiService = new UserApiService();
```

---

## React Nativeでの実装例

### 1. ユーザー一覧画面

```tsx
// app/screen/user-list/UserListScreen.tsx
import React, { useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { useApi } from '@/features/api';
import { userApiService, User } from '@/features/user/services/userApiService';

export function UserListScreen() {
  const { state, execute } = useApi<User[]>(
    userApiService['client'], // または直接httpClientを使用
    (client) => client.get<User[]>('/'),
    {
      immediate: true, // マウント時に自動実行
      onError: (error) => {
        Alert.alert('Error', error.message);
      },
    }
  );

  if (state.loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (state.error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Error: {state.error.message}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={state.data || []}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={{ padding: 16, borderBottomWidth: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{item.name}</Text>
          <Text style={{ color: '#666' }}>{item.email}</Text>
        </View>
      )}
    />
  );
}
```

### 2. ユーザー作成フォーム

```tsx
// app/screen/user-create/UserCreateScreen.tsx
import React, { useState } from 'react';
import { View, TextInput, Button, Alert } from 'react-native';
import { usePost } from '@/features/api';
import { userApiService } from '@/features/user/services/userApiService';

export function UserCreateScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const { state, execute } = usePost(
    userApiService['client'],
    '/',
    {
      onSuccess: (user) => {
        Alert.alert('Success', `User ${user.name} created!`);
        navigation.goBack();
      },
      onError: (error) => {
        Alert.alert('Error', error.message);
      },
    }
  );

  const handleSubmit = async () => {
    if (!name || !email) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    await execute({ name, email });
  };

  return (
    <View style={{ padding: 16 }}>
      <TextInput
        placeholder="Name"
        value={name}
        onChangeText={setName}
        style={{ borderWidth: 1, padding: 8, marginBottom: 16 }}
      />
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        style={{ borderWidth: 1, padding: 8, marginBottom: 16 }}
      />
      <Button
        title={state.loading ? 'Creating...' : 'Create User'}
        onPress={handleSubmit}
        disabled={state.loading}
      />
    </View>
  );
}
```

### 3. WebSocketを使用したチャット画面

```tsx
// app/screen/chat/ChatScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList } from 'react-native';
import { useWebSocket, WebSocketMessage } from '@/features/api';

interface ChatMessage {
  id: string;
  user: string;
  text: string;
  timestamp: string;
}

export function ChatScreen({ userId }: { userId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');

  const { state, isConnected, send } = useWebSocket<ChatMessage>(
    `${process.env.EXPO_PUBLIC_WS_URL}/ws/chat/${userId}`,
    {
      eventHandlers: {
        onMessage: (message: WebSocketMessage<ChatMessage>) => {
          if (message.type === 'chat_message') {
            setMessages((prev) => [...prev, message.data!]);
          }
        },
        onStateChange: (newState) => {
          console.log('WebSocket state:', newState);
        },
      },
      autoConnect: true,
      autoDisconnect: true,
    }
  );

  const handleSend = () => {
    if (!inputText.trim() || !isConnected) return;

    send({
      type: 'chat_message',
      data: {
        text: inputText,
        user: userId,
      },
    });

    setInputText('');
  };

  return (
    <View style={{ flex: 1 }}>
      {/* 接続状態インジケーター */}
      <View style={{ padding: 8, backgroundColor: isConnected ? '#4CAF50' : '#F44336' }}>
        <Text style={{ color: 'white', textAlign: 'center' }}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </Text>
      </View>

      {/* メッセージ一覧 */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ padding: 12, borderBottomWidth: 1 }}>
            <Text style={{ fontWeight: 'bold' }}>{item.user}</Text>
            <Text>{item.text}</Text>
            <Text style={{ fontSize: 10, color: '#999' }}>{item.timestamp}</Text>
          </View>
        )}
      />

      {/* 入力フォーム */}
      <View style={{ flexDirection: 'row', padding: 8, borderTopWidth: 1 }}>
        <TextInput
          style={{ flex: 1, borderWidth: 1, padding: 8, marginRight: 8 }}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          editable={isConnected}
        />
        <Button
          title="Send"
          onPress={handleSend}
          disabled={!isConnected || !inputText.trim()}
        />
      </View>
    </View>
  );
}
```

### 4. カスタムフックの組み合わせ

```tsx
// app/features/user/hooks/useUsers.ts
import { useApi } from '@/features/api';
import { userApiService, User } from '../services/userApiService';

export function useUsers() {
  return useApi<User[]>(
    userApiService['client'],
    (client) => client.get<User[]>('/'),
    {
      immediate: true,
    }
  );
}

export function useCreateUser() {
  return useApi<User, { name: string; email: string }>(
    userApiService['client'],
    (client, data) => client.post<User>('/', data)
  );
}

// 使用例
function MyComponent() {
  const { state: usersState, execute: refetchUsers } = useUsers();
  const { state: createState, execute: createUser } = useCreateUser();

  const handleCreate = async () => {
    await createUser({ name: 'John', email: 'john@example.com' });
    await refetchUsers(); // リフレッシュ
  };

  // ...
}
```

---

## ベストプラクティス

### 1. サービス層でクライアントをカプセル化

```typescript
// ❌ 良くない例: コンポーネントで直接HttpClientを使用
function MyComponent() {
  const client = createHttpClient({ baseUrl: '...' });
  const { state } = useApi(client, ...);
}

// ✅ 良い例: サービス層でカプセル化
// services/myApiService.ts
export const myApiService = new MyApiService();

// MyComponent.tsx
function MyComponent() {
  const { state } = useApi(myApiService.client, ...);
}
```

### 2. エラーハンドリングはサービス層とUI層の両方で

```typescript
// サービス層: ログ記録と変換
async getUsers(): Promise<User[]> {
  try {
    const response = await this.client.get('/users');
    return response.data;
  } catch (error) {
    logger.error('user', 'Failed to get users', error);
    throw error; // UI層に伝播
  }
}

// UI層: ユーザーフレンドリーなメッセージ表示
const { state } = useApi(..., {
  onError: (error) => {
    Alert.alert('Error', getUserFriendlyErrorMessage(error));
  },
});
```

### 3. 型安全性を最大限に活用

```typescript
// 型定義を明確に
interface ApiResponse {
  users: User[];
  total: number;
}

const response = await client.get<ApiResponse>('/users');
// response.data は ApiResponse 型として推論される
```
