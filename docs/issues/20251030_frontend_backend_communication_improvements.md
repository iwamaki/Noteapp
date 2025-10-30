# フロントエンド↔バックエンド通信インフラの改善提案

**作成日**: 2025-10-30
**状態**: 提案
**優先度**: 高

## 概要

型定義の不一致とWebSocket接続の問題を調査した結果、フロントエンドとバックエンド間の通信インフラに複数の改善点が見つかりました。このドキュメントでは、発見された問題と実装すべき改善策をチェックリスト形式でまとめています。

---

## 実装チェックリスト

### 🔴 高優先度（ユーザー体験に直接影響）

#### ✅ 1. 型定義の不一致修正（完了）
- [x] `categories` → `category` への型統一
- [x] フロントエンド・バックエンド間の型一致確認
- [ ] 今後の型不一致を防ぐ仕組みの導入（下記参照）

#### 📋 2. 型定義の共有化（OpenAPI/Swagger）
**目的**: 型定義の不一致を根本的に防ぐ

- [ ] FastAPIのOpenAPIスキーマ自動生成設定
- [ ] `openapi-typescript`でフロントエンド型を自動生成
- [ ] CI/CDパイプラインに型チェックを統合
- [ ] 型定義変更時の自動検出・警告

**実装例**:
```bash
# バックエンドからOpenAPIスキーマ生成
cd server
python -m src.main --export-openapi > openapi.json

# フロントエンド型を自動生成
cd ../app
npx openapi-typescript ../server/openapi.json -o types/api.ts
```

**期待効果**:
- 型不一致によるバグを未然に防止
- APIドキュメント自動生成
- 開発効率向上

---

#### 📋 3. WebSocket自動再接続機能
**目的**: ネットワーク切断時の自動復旧

**実装箇所**: `app/features/chat/services/websocketService.ts`

- [ ] 再接続URLの保存
- [ ] 指数バックオフによる再接続ロジック
- [ ] 最大再接続試行回数の設定
- [ ] 再接続状態の通知

**実装タスク**:
```typescript
// websocketService.ts
private lastUrl: string = '';
private reconnectAttempts: number = 0;
private maxReconnectAttempts: number = 5;

private scheduleReconnect(): void {
  if (this.reconnectAttempts >= this.maxReconnectAttempts) {
    this.setState(WebSocketState.ERROR);
    return;
  }

  const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

  this.reconnectTimeout = setTimeout(() => {
    this.reconnectAttempts++;
    this.connect(this.lastUrl);
  }, delay);
}
```

**期待効果**:
- read_fileツール実行時のエラー減少
- ユーザーの手動再起動不要
- アプリのバックグラウンド復帰時の自動復旧

---

### 🟡 中優先度（安定性・保守性向上）

#### 📋 4. WebSocketハートビート機構
**目的**: 接続維持とタイムアウト検出

**フロントエンド実装**: `app/features/chat/services/websocketService.ts`
- [ ] 30秒ごとのping送信
- [ ] pong受信の監視
- [ ] タイムアウト検出（60秒）
- [ ] タイムアウト時の自動再接続

**バックエンド実装**: `server/src/api/websocket.py`
- [ ] ping受信時のタイムスタンプ記録
- [ ] 定期的な接続状態チェック
- [ ] stale接続の自動切断

**実装例**:
```typescript
// フロントエンド
private startHeartbeat(): void {
  this.heartbeatInterval = setInterval(() => {
    if (this.state === WebSocketState.CONNECTED) {
      this.sendMessage({ type: 'ping' });
    }
  }, 30000);
}
```

```python
# バックエンド
class ConnectionManager:
    def __init__(self):
        self.last_ping: Dict[str, float] = {}

    async def check_stale_connections(self):
        now = time.time()
        for client_id, last_time in list(self.last_ping.items()):
            if now - last_time > 60:
                await self.disconnect(client_id)
```

**期待効果**:
- 接続切断の早期検出
- ngrokタイムアウト対策
- 接続状態の正確な把握

---

#### 📋 5. 接続状態の可視化
**目的**: ユーザーへの接続状態フィードバック

**実装箇所**: 新規コンポーネント `app/features/chat/components/WebSocketStatus.tsx`

- [ ] WebSocketStateを購読するコンポーネント作成
- [ ] 接続状態アイコンの表示（🟢🟡🔴⚠️）
- [ ] チャット画面への配置
- [ ] 再接続ボタンの実装（オプション）

**実装例**:
```typescript
export const WebSocketStatus: React.FC = () => {
  const [state, setState] = useState<WebSocketState>('DISCONNECTED');

  useEffect(() => {
    const wsService = WebSocketService.getInstance(clientId);
    const listener = (newState: WebSocketState) => setState(newState);
    wsService.addStateListener(listener);
    return () => wsService.removeStateListener(listener);
  }, []);

  const getStatusIcon = () => {
    switch (state) {
      case 'CONNECTED': return '🟢 接続中';
      case 'CONNECTING': return '🟡 接続中...';
      case 'DISCONNECTED': return '🔴 切断';
      case 'ERROR': return '⚠️ エラー';
    }
  };

  return <Text style={styles.status}>{getStatusIcon()}</Text>;
};
```

**期待効果**:
- ユーザーが接続状態を把握できる
- 問題の早期発見
- サポート問い合わせの減少

---

#### 📋 6. 構造化されたエラーレスポンス
**目的**: エラーハンドリングの統一と改善

**バックエンド実装**: `server/src/llm/models.py`
- [ ] `ErrorResponse`モデルの追加
- [ ] エラーコード体系の定義
- [ ] `ChatResponse`にerrorフィールド追加
- [ ] 各エラーに`suggested_action`を含める

**フロントエンド実装**: `app/features/chat/utils/errorHandler.ts`
- [ ] エラーコード別ハンドラー実装
- [ ] 自動リトライロジック
- [ ] ユーザー向けエラーメッセージ表示

**エラーコード定義例**:
```python
# server/src/llm/types/error_codes.py
class ErrorCode:
    WEBSOCKET_DISCONNECTED = "WEBSOCKET_DISCONNECTED"
    FILE_NOT_FOUND = "FILE_NOT_FOUND"
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    TIMEOUT = "TIMEOUT"
    INVALID_REQUEST = "INVALID_REQUEST"
```

**期待効果**:
- エラー原因の明確化
- 適切なユーザーアクション提示
- デバッグ効率の向上

---

### 🟢 低優先度（開発体験・最適化）

#### 📋 7. 実行時バリデーション（Zod）
**目的**: 型安全性の向上

**実装箇所**: `app/features/chat/llmService/types/validators.ts`

- [ ] Zodスキーマ定義
- [ ] `validateLLMResponse`関数実装
- [ ] APIレスポンスのバリデーション統合
- [ ] エラーログの改善

**実装例**:
```typescript
import { z } from 'zod';

const LLMCommandSchema = z.object({
  action: z.string(),
  title: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const LLMResponseSchema = z.object({
  message: z.string(),
  commands: z.array(LLMCommandSchema).optional(),
});

export function validateLLMResponse(data: unknown): LLMResponse {
  return LLMResponseSchema.parse(data);
}
```

**期待効果**:
- 実行時の型安全性向上
- 予期しないデータ構造の早期検出
- より詳細なエラーメッセージ

---

#### 📋 8. ChatContextの最適化
**目的**: ペイロードサイズ削減とパフォーマンス向上

**実装タスク**:
- [ ] 会話履歴を直近N件に制限（デフォルト10件）
- [ ] `allFiles`からcontentを除外（read_fileで取得）
- [ ] コンテキスト圧縮ロジックの実装
- [ ] 重要度スコアリングによる履歴選択

**実装例**:
```typescript
// 直近10件のみ送信
getRecentHistory(limit: number = 10): ChatMessage[] {
  return this.messages.slice(-limit);
}

// allFilesはメタデータのみ
const chatContext: ChatContext = {
  allFiles: allFiles.map(f => ({
    title: f.title,
    type: 'file',
    category: f.category,
    tags: f.tags,
    // content は含めない
  })),
};
```

**期待効果**:
- リクエストサイズの削減
- レスポンスタイムの改善
- LLMコスト削減

---

#### 📋 9. client_idのセキュリティ強化
**目的**: セキュアな識別子管理

**実装タスク**:
- [ ] UUIDv4への移行
- [ ] SecureStoreでの永続化
- [ ] 認証トークンとの統合（オプション）

**実装例**:
```typescript
import * as SecureStore from 'expo-secure-store';
import { v4 as uuidv4 } from 'uuid';

export async function getOrCreateClientId(): Promise<string> {
  const key = 'websocket_client_id';
  let clientId = await SecureStore.getItemAsync(key);

  if (!clientId) {
    clientId = uuidv4();
    await SecureStore.setItemAsync(key, clientId);
  }

  return clientId;
}
```

**期待効果**:
- セキュリティ向上
- クライアント識別の永続性
- 推測攻撃の防止

---

## 優先度マトリクス

| 優先度 | 項目 | 影響範囲 | 実装工数 | 実装推奨時期 |
|--------|------|----------|----------|--------------|
| 🔴 高 | 型定義の共有化 | データ整合性全般 | 中（2-3日） | 次回スプリント |
| 🔴 高 | WebSocket自動再接続 | read_fileツール | 小（1日） | 今週 |
| 🟡 中 | WebSocketハートビート | 接続安定性 | 小（1日） | 次回スプリント |
| 🟡 中 | 接続状態の可視化 | UX | 小（0.5日） | 次回スプリント |
| 🟡 中 | 構造化エラーレスポンス | エラーハンドリング | 中（2日） | 次々回スプリント |
| 🟢 低 | 実行時バリデーション | 開発体験 | 中（1-2日） | バックログ |
| 🟢 低 | ChatContext最適化 | パフォーマンス | 大（3-5日） | バックログ |
| 🟢 低 | client_idセキュリティ | セキュリティ | 小（0.5日） | バックログ |

---

## 関連する既存Issue/ドキュメント

- `03_websocket-read-file-implementation.md` - WebSocket実装の詳細
- `04_ai-agent-enhancement.md` - AI機能強化（エラーハンドリング関連）
- commit `3f380d5` - 型定義不一致の修正

---

## 次のアクション

1. **今週実装**: WebSocket自動再接続（高優先度・小工数）
2. **次回スプリント**: 型定義の共有化、ハートビート、接続状態可視化
3. **技術的負債整理**: 構造化エラーレスポンス、実行時バリデーション

---

## 備考

- この分析は2025-10-30の型定義不一致調査から派生
- カテゴリーフィールドの問題を解決する過程で発見
- WebSocket切断エラーの根本原因調査から抽出
