# Chat → LLMService マイグレーション計画

## Phase 1: トークン管理の移行（低リスク）

### 目的
LLM固有のトークン管理ロジックをllmServiceに集約

### 対象
- `app/features/chat/utils/tokenUsageHelpers.ts` → `app/features/llmService/utils/tokenUsageHelpers.ts`
- `app/features/chat/services/chatTokenService.ts` → `app/features/llmService/services/TokenManagementService.ts`

### 主な作業
1. tokenUsageHelpers.tsを移動（import参照更新）
2. chatTokenServiceをTokenManagementServiceとして再構築
3. 自動要約トリガーの依存関係を整理
4. chatStoreからの参照を更新

### 完了条件
- トークン表示・管理がllmServiceから提供される
- 既存のUI動作に変更なし

---

## Phase 2: 要約サービスの統合（中リスク）

### 目的
重複する要約ロジックを統一し、責務を明確化

### 対象
- `app/features/chat/services/chatSummarizationService.ts` → `app/features/llmService/services/SummarizationService.ts` へ統合

### 主な作業
1. `LLMService.summarizeConversation()` と `chatSummarizationService` の機能を比較
2. 圧縮率判定・効果測定ロジックをSummarizationServiceへマージ
3. chatServiceはオーケストレーションのみ（UI連携）に専念
4. 要約フラグ管理をConversationStoreに移行

### 完了条件
- 要約ロジックが単一サービスに集約
- トークン100%超過時の自動要約が正常動作

---

## Phase 3: コマンド・WebSocket基盤の移行（高リスク）

### 目的
LLM双方向通信とコマンド処理基盤をllmServiceに昇格

### 対象
- `app/features/chat/services/chatCommandService.ts` → `app/features/llmService/services/CommandService.ts`
- `app/features/chat/services/chatWebSocketManager.ts` → `app/features/llmService/core/WebSocketManager.ts`

### 主な作業
1. **コマンドサービス**
   - コマンド検証・ディスパッチ基盤をllmServiceへ
   - ハンドラ登録はchatに残す（画面依存の実装）
   - グローバル/コンテキストハンドラの責務を分離

2. **WebSocketマネージャー**
   - WebSocket管理をcore層に昇格
   - LLMServiceから利用可能な設計に変更
   - client_id管理の再検討

### 完了条件
- コマンド処理がllmServiceで抽象化
- WebSocketが他機能でも再利用可能
- 既存のファイル操作コマンドが正常動作

---

## 実施スケジュール

| Phase | 期間目安 | 破損リスク | 依存関係 |
|-------|---------|-----------|---------|
| Phase 1 | 1-2日 | 低 | なし（独立実施可） |
| Phase 2 | 2-3日 | 中 | Phase 1完了後推奨 |
| Phase 3 | 5-7日 | 高 | Phase 2完了後に実施 |

## 各Phase後のテスト項目

- トークン表示・使用率カラー変更
- 100%超過時の自動要約
- 手動要約の実行
- モデル切り替え
- ファイル添付・コマンド実行
- WebSocket再接続
