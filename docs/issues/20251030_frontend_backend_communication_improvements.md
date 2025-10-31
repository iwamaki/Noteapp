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

#### ✅ 3. WebSocket自動再接続機能（完了）
**目的**: ネットワーク切断時の自動復旧

**実装箇所**: `app/features/chat/services/websocketService.ts`

- [x] 再接続URLの保存
- [x] 指数バックオフによる再接続ロジック
- [x] 最大再接続試行回数の設定
- [x] 再接続状態の通知

**実装完了日**: 2025-10-30

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

#### ✅ 4. WebSocketハートビート機構（完了）
**目的**: 接続維持とタイムアウト検出

**フロントエンド実装**: `app/features/chat/services/websocketService.ts`
- [x] 30秒ごとのping送信
- [x] pong受信の監視
- [x] タイムアウト検出（60秒）
- [x] タイムアウト時の自動再接続
- [x] 詳細なロギング（デバッグ用）

**バックエンド実装**: `server/src/api/websocket.py`, `server/src/main.py`
- [x] ping受信時のタイムスタンプ記録
- [x] 定期的な接続状態チェック（30秒ごと）
- [x] stale接続の自動切断（60秒タイムアウト）
- [x] バックグラウンドタスクによる監視

**実装完了日**: 2025-10-30

**重要な実装詳細**:
- ハートビートタイムアウト後の再接続ロジックを改善
- `shouldReconnectAfterClose()`で切断理由に応じた再接続判定
- `code=1000, reason="Heartbeat timeout"`でも自動再接続

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

| 優先度 | 項目 | 影響範囲 | 実装工数 | 状態 |
|--------|------|----------|----------|------|
| 🔴 高 | ~~型定義の不一致修正~~ | データ整合性全般 | 小（0.5日） | ✅ 完了 |
| 🔴 高 | ~~WebSocket自動再接続~~ | read_fileツール | 小（1日） | ✅ 完了 |
| 🟡 中 | ~~WebSocketハートビート~~ | 接続安定性 | 小（1日） | ✅ 完了 |
| 🟡 中 | 接続状態の可視化 | UX | 小（0.5日） | 📋 次回推奨 |
| 🔴 高 | 型定義の共有化 | データ整合性全般 | 中（2-3日） | 📋 推奨 |
| 🟡 中 | 構造化エラーレスポンス | エラーハンドリング | 中（2日） | 📋 推奨 |
| 🟢 低 | 実行時バリデーション | 開発体験 | 中（1-2日） | バックログ |
| 🟢 低 | ChatContext最適化 | パフォーマンス | 大（3-5日） | バックログ |
| 🟢 低 | client_idセキュリティ | セキュリティ | 小（0.5日） | バックログ |

---

## 関連する既存Issue/ドキュメント

- `03_websocket-read-file-implementation.md` - WebSocket実装の詳細
- `04_ai-agent-enhancement.md` - AI機能強化（エラーハンドリング関連）
- commit `3f380d5` - 型定義不一致の修正

---

## 実装履歴

### 2025-10-30 実装セッション
**実装項目**:
1. ✅ 型定義の不一致修正（`category` フィールド）
2. ✅ WebSocket自動再接続機能
3. ✅ WebSocketハートビート機構

**成果**:
- フォアグラウンド復帰時の自動再接続が動作
- 60秒のハートビートタイムアウト検出
- 継続的なチャット機能が安定動作

**関連コミット**:
- 型定義修正とWebSocket改善

---

## 次のアクション（優先度順）

### 🎯 次回セッション推奨
1. **接続状態の可視化** (小工数・高UX効果)
   - ユーザーが接続状態を把握できる
   - 実装工数: 0.5日
   - チャット画面に状態インジケーター追加

2. **構造化エラーレスポンス** (中工数・高保守性)
   - エラーハンドリングの統一
   - 実装工数: 2日
   - エラーコード体系の確立

### 📚 中長期的な改善
3. **型定義の共有化（OpenAPI/Swagger）**
   - 型不一致の根本的解決
   - 実装工数: 2-3日
   - 開発効率の大幅向上

4. **実行時バリデーション（Zod）**
   - 実行時の型安全性向上
   - 実装工数: 1-2日

5. **ChatContext最適化**
   - LLMコスト削減
   - 実装工数: 3-5日

---

## 技術メモ

### ハートビート実装の重要ポイント
- フロントエンド: 30秒ごとにping、60秒でタイムアウト検出
- バックエンド: 30秒ごとにstale接続チェック、60秒でタイムアウト切断
- 再接続ロジック: `code=1000`でも`reason`に応じて再接続判定が必要
- ログレベル: 本番環境では`logger.info`を`logger.debug`に変更推奨

### 今後の注意点
- ngrokタイムアウト: 無料プランは60秒制限があるため、ハートビートは必須
- React Nativeのバックグラウンド動作: `setInterval`は制限される可能性あり
- 指数バックオフ: 最大5回、最大30秒まで遅延

---

## 備考

- この分析は2025-10-30の型定義不一致調査から派生
- カテゴリーフィールドの問題を解決する過程で発見
- WebSocket切断エラーの根本原因調査から抽出
- 2025-10-30セッションで高優先度3項目を完了
