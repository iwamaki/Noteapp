---
filename: 20251103_chat_frontend_refactoring
status: new
priority: high
attempt_count: 0
tags: [refactoring, chat, maintainability, technical-debt]
date: 2025/11/03
---

## 概要 (Overview)

チャット機能のフロントエンド実装について、保守性・テスト可能性を向上させるための段階的リファクタリングを実施します。現在628行の巨大なChatServiceクラスを責務別に分割し、適切な状態管理、ユニットテスト、コンポーネント設計を導入します。

## 背景 (Background)

チャット機能に対して多数の機能追加が行われた結果、以下の問題が顕在化しています：

### 現状の問題点

1. **ChatServiceのGodオブジェクト化**
   - 単一クラスが628行、25個以上のpublicメソッド
   - 状態管理、WebSocket、ファイル添付、メッセージ送信、コマンド実行、プロバイダー登録、コンテキスト構築、トークン管理、要約処理など、全ての責務が混在
   - 単一責任原則に違反

2. **テストの欠如**
   - ユニットテストが1つも存在しない
   - 複雑なビジネスロジックのテストカバレッジが0%
   - リファクタリング時のセーフティネットが無い

3. **密結合の問題**
   - FileRepository、WebSocketService、useSettingsStore、APIServiceに直接依存
   - UIステートとビジネスロジックが混在
   - 単体テストが不可能

4. **手動の状態同期**
   - リスナーパターンを手動実装
   - 手動通知システムが更新漏れを起こしやすい
   - React標準の状態管理と統合されていない

5. **コンポーネント設計の問題**
   - ChatInputBarが249行で複数の責務を持つ
   - Prop Drilling（7つのpropsを渡している箇所あり）
   - 再利用性が低い

### なぜ今リファクタリングが必要か

- 新機能追加のたびに変更の影響範囲が不明確になっている
- バグの混入リスクが高まっている
- 新しい開発者がコードを理解するコストが高い
- 将来的な拡張性が著しく低下している
- 技術的負債が累積し、開発速度が低下している

## 実装方針 (Implementation Strategy)

### 基本原則

1. **段階的なリファクタリング**
   - 一度に全てを変更せず、フェーズ分けして実施
   - 各フェーズで動作確認とコミットを行う
   - 既存機能を壊さないことを最優先

2. **テストファーストアプローチ**
   - リファクタリング前にテストを追加
   - テストがパスすることを確認してから構造変更
   - リグレッションテストによる安全性確保

3. **公開APIの維持**
   - ChatService.getInstance()の公開メソッドは変更しない
   - 内部実装のみを段階的に改善
   - 既存のコンポーネントからの呼び出しは影響を受けない

### 技術スタック

- **状態管理**: Zustand（既にsettingsで使用中のため統一）
- **テスティング**: Jest + React Native Testing Library
- **アーキテクチャパターン**: サービス指向アーキテクチャ（SOA）
- **依存性注入**: コンストラクタインジェクション

### フェーズ分け

#### Phase 1: 基盤整備（優先度: 最高）

**目的**: リファクタリングのセーフティネットを構築

1. **ユニットテストの追加**
   - llmService/core配下のテスト（外部依存が少ない）
   - ConversationHistory、ProviderManager、RequestManagerのテスト
   - カバレッジ: 80%以上を目標

2. **設定ファイルの外部化**
   - ハードコードされた設定値を定数化
   - `config/chatConfig.ts`に集約
   - テスト時に設定を変更可能にする

3. **型定義の整理**
   - `llmService/types/types.ts`（152行）を責務別に分割
   - 非推奨フィールド（path, source等）の削除計画策定
   - 新旧フィールドの共存期間を明確化

#### Phase 2: ChatServiceの段階的分割（優先度: 最高）

**目的**: 単一責任原則に基づいた構造への移行

1. **最も独立した部分から抽出**
   - Step 1: `ChatAttachmentService`の抽出（lines 186-240）
     - attachFile, clearAttachedFiles, removeAttachedFile
     - 他の機能への依存が少ない
   - Step 2: `ChatTokenService`の抽出（lines 296-308, 487-491）
     - トークン使用量追跡
     - 自動要約トリガー
   - Step 3: `ChatCommandService`の抽出（lines 542-558）
     - コマンド実行、ハンドラー呼び出し
     - ハンドラー登録・取得

2. **各ステップでの作業フロー**
   ```
   a. 新しいサービスクラスを作成
   b. テストを先に書く（Red）
   c. 既存コードを移動（Green）
   d. ChatServiceから呼び出すように変更
   e. 動作確認
   f. コミット
   ```

3. **状態管理は後回し**
   - ChatStateServiceの抽出は最後
   - まずビジネスロジックの分離を優先
   - 状態管理の移行はPhase 3で実施

#### Phase 3: 状態管理の刷新（優先度: 高）

**目的**: 手動リスナーパターンからZustandへの移行

1. **Zustandストアの作成**
   - `store/chatStore.ts`を作成
   - messages, isLoading, attachedFiles, tokenUsage状態を管理

2. **並行稼働期間の設定**
   - 既存のリスナーパターンとZustandストアを両方動かす
   - 1週間程度の検証期間を設ける
   - 問題がなければリスナーパターンを削除

3. **段階的な移行**
   - Step 1: ストアを作成し、リスナー通知時にストアも更新
   - Step 2: 一部のコンポーネントでストア使用開始
   - Step 3: 全コンポーネントがストアを使用していることを確認
   - Step 4: リスナーパターンを削除

#### Phase 4: コンポーネントの改善（優先度: 中）

**目的**: 再利用性とテスト可能性の向上

1. **ChatInputBarの分割**
   - AttachedFilesList.tsx（lines 189-216）
   - MessageInput.tsx（lines 219-245）
   - useKeyboardAwareHeight.ts（lines 47-66）

2. **Context APIの導入**
   - ChatUIContext.tsxを作成
   - Prop Drillingの解消（7つのprops → Context）

3. **重複ロジックの共通化**
   - トークン使用量インジケーターロジック（MessageItem.tsx, ChatHistory.tsx）
   - `utils/tokenUsageHelpers.ts`に抽出

#### Phase 5: エラーハンドリングの統一（優先度: 中）

**目的**: 一貫したエラー処理とユーザー体験の向上

1. **統一エラーハンドラーの作成**
   - `utils/errorHandler.ts`
   - エラー分類、ユーザーメッセージ生成、ログ記録

2. **各所での適用**
   - ChatService、ハンドラー、LLMServiceで統一
   - エラーバウンダリの追加検討

#### Phase 6: ドキュメントと仕上げ（優先度: 低）

**目的**: 可読性と保守性の最終調整

1. **JSDocの追加**
   - 全publicメソッド
   - 複雑なユーティリティ関数
   - Hookの戻り値

2. **デッドコードの削除**
   - MessageItem.tsx lines 154-172（コメントアウトされたコード）

3. **マジックナンバーの定数化**
   - ボタンサイズ、スニペット長、タイムアウト値等

## 受け入れ条件 (Acceptance Criteria)

### Phase 1完了条件
- [ ] ConversationHistory.test.tsのテストカバレッジ80%以上
- [ ] ProviderManager.test.tsのテストカバレッジ80%以上
- [ ] RequestManager.test.tsのテストカバレッジ80%以上
- [ ] config/chatConfig.tsが作成され、全ハードコード値が移行済み
- [ ] llmService/types/が責務別に分割され、index.tsでre-export
- [ ] 既存機能が全て正常動作（手動テスト）

### Phase 2完了条件
- [ ] ChatAttachmentService.tsが作成され、テストカバレッジ80%以上
- [ ] ChatTokenService.tsが作成され、テストカバレッジ80%以上
- [ ] ChatCommandService.tsが作成され、テストカバレッジ80%以上
- [ ] ChatServiceから各サービスへの呼び出しが正常動作
- [ ] ChatService.tsの行数が500行以下に削減
- [ ] 既存機能が全て正常動作（手動テスト + ユニットテスト）

### Phase 3完了条件
- [ ] store/chatStore.tsが作成され、全状態を管理
- [ ] useChatフックがストアを使用するよう変更
- [ ] 手動リスナーパターンが完全に削除
- [ ] 既存機能が全て正常動作（状態同期の問題がない）
- [ ] Zustand DevToolsでの状態確認が可能

### Phase 4完了条件
- [ ] ChatInputBar.tsxが100行以下に削減
- [ ] AttachedFilesList.tsx、MessageInput.tsx、useKeyboardAwareHeight.tsが作成
- [ ] ChatUIContext.tsxが作成され、Prop Drillingが解消
- [ ] utils/tokenUsageHelpers.tsが作成され、重複ロジックが削除
- [ ] 既存機能が全て正常動作

### Phase 5完了条件
- [ ] utils/errorHandler.tsが作成
- [ ] ChatService、全ハンドラー、LLMServiceが統一エラーハンドラーを使用
- [ ] エラー発生時のユーザーメッセージが一貫している
- [ ] エラーログが適切に記録される

### Phase 6完了条件
- [ ] 全publicメソッドにJSDocが追加
- [ ] デッドコードが削除
- [ ] マジックナンバーが定数化
- [ ] READMEにアーキテクチャ図を追加

### 最終受け入れ条件
- [ ] 全Phase完了
- [ ] テストカバレッジが全体で70%以上
- [ ] 既存機能に回帰が無い
- [ ] パフォーマンス低下が無い（レスポンスタイム測定）
- [ ] コードレビュー実施済み
- [ ] ドキュメント更新済み

## 関連ファイル (Related Files)

### Phase 1関連
- `app/features/chat/llmService/core/ConversationHistory.ts`
- `app/features/chat/llmService/core/ProviderManager.ts`
- `app/features/chat/llmService/core/RequestManager.ts`
- `app/features/chat/llmService/types/types.ts`
- `app/features/chat/hooks/useChat.ts`
- `app/features/chat/services/websocketService.ts`

### Phase 2関連
- `app/features/chat/index.ts` (628行のメインターゲット)
- `app/features/chat/handlers/*` (全6ファイル)

### Phase 3関連
- `app/features/chat/index.ts` (lines 22-56, 453-624)
- `app/features/chat/hooks/useChat.ts` (lines 75-112)
- `app/features/chat/components/ChatInputBar.tsx`

### Phase 4関連
- `app/features/chat/components/ChatInputBar.tsx` (249行)
- `app/features/chat/components/ChatHistory.tsx`
- `app/features/chat/components/MessageItem.tsx`

### Phase 5関連
- `app/features/chat/index.ts` (lines 325, 563-578)
- `app/features/chat/handlers/*`
- `app/features/chat/llmService/utils/ErrorHandler.ts`

## 制約条件 (Constraints)

### 技術的制約
- **破壊的変更の禁止**: ChatService.getInstance()の公開APIは変更しない
- **パフォーマンス要件**: リファクタリング後もメッセージ送信レスポンスタイムは2秒以内を維持
- **React Native互換性**: 使用するライブラリはReact Native対応必須
- **既存依存関係**: Zustandのバージョンは既存の設定機能と合わせる

### 開発プロセス制約
- **段階的コミット**: 各Phase内でも小さく区切ってコミット（最大でも200行程度の変更）
- **テストファースト**: 構造変更前に必ずテストを追加
- **ペアワーク推奨**: Phase 2, 3は可能な限り2人体制で実施
- **レビュー必須**: 各Phase完了時にコードレビューを実施

### 運用制約
- **リリースタイミング**: Phase 2完了時点で一度本番デプロイ（リスク分散）
- **ロールバック準備**: 各Phaseでfeatureブランチを作成、問題発生時は即座にロールバック
- **モニタリング**: リリース後1週間はエラーログを重点監視

### ビジネス制約
- **新機能開発との並行**: Phase 1-3は2週間以内に完了（新機能開発への影響を最小化）
- **ユーザー影響ゼロ**: UIの挙動やパフォーマンスに一切の変更を加えない
- **ダウンタイムゼロ**: リファクタリングによるサービス停止は許容されない

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:** チャット機能フロントエンドの包括的な分析を実施。628行のChatServiceクラスを中心に、アーキテクチャ上の問題点を特定し、6つのPhaseに分けたリファクタリング計画を策定。
- **結果:**
  - 15個の問題を特定（Critical: 4, High: 4, Medium: 4, Low: 3）
  - 段階的リファクタリング計画を立案
  - issue管理ドキュメント（本ファイル）を作成
- **メモ:**
  - 最も重要なのはテストの追加（現在カバレッジ0%）
  - ChatServiceの分割は最も独立した部分（ChatAttachmentService）から開始すべき
  - 状態管理の移行は慎重に（並行稼働期間を設ける）
  - Phase 2完了時点で一度リリースし、リスクを分散することを推奨

---

## AIへの申し送り事項 (Handover to AI)

### 現在の状況

- **完了したこと:**
  - チャット機能フロントエンドの詳細分析完了
  - 問題点の特定と優先度付け完了
  - 6つのPhaseに分けたリファクタリング計画策定完了
  - 本issueドキュメント作成完了

- **未着手:**
  - 実際のコード変更は一切未着手
  - テストコードも未作成
  - 新しいサービスクラスも未作成

### 次のアクション

**Phase 1: 基盤整備から開始**

1. **最優先タスク**: ConversationHistory.test.tsの作成
   ```bash
   # ファイル作成
   mkdir -p app/features/chat/llmService/__tests__/core
   touch app/features/chat/llmService/__tests__/core/ConversationHistory.test.ts
   ```

   - ConversationHistoryクラスは外部依存が無く、最もテストしやすい
   - まずこのテストを書いて、テスト環境が正しく動作することを確認
   - 目標カバレッジ: 80%以上

2. **次のタスク**: ProviderManager.test.ts、RequestManager.test.tsの作成
   - 同様にテストを追加
   - これらもシンプルな状態管理クラスのため、テストしやすい

3. **設定ファイルの外部化**: config/chatConfig.tsの作成
   - ハードコードされた値を全て抽出
   - 既存コードを変更せず、まず定数ファイルのみ作成
   - その後、各ファイルで定数を使用するよう段階的に変更

4. **型定義の分割**: llmService/types/配下のファイル分割
   - まず新しいファイル構造を作成
   - 既存のtypes.tsから段階的にコピー
   - 最後にindex.tsでre-exportして互換性確保

### 考慮事項/ヒント

#### テスト作成時のポイント
- **Jest設定**: `package.json`やjest.config.jsを確認し、テスト環境が正しく設定されているか確認
- **モックの作成**: FileRepositoryやAPIServiceなど外部依存のモックを`__mocks__`ディレクトリに作成
- **React Native Testing Library**: コンポーネントテストには@testing-library/react-nativeを使用
- **Hooksテスト**: @testing-library/react-hooksを使用

#### リファクタリング時のポイント
- **小さくコミット**: 50-100行程度の変更でこまめにコミット
- **動作確認**: 各コミット後に必ず手動で動作確認
- **テスト実行**: `npm test`または`yarn test`で全テストが通ることを確認
- **型チェック**: `npm run type-check`でTypeScriptエラーが無いことを確認

#### Phase 1で参考にすべきファイル
- **既存のテスト**: プロジェクト内に既存のテストファイルがあれば、その構造を参考にする
- **Zustandの使用例**: `app/features/settings/store/settingsStore.ts`を参考に、chatStoreを作成
- **設定値の抽出元**:
  - `app/features/chat/hooks/useChat.ts`: lines 14-17
  - `app/features/chat/services/websocketService.ts`: lines 86-98
  - `app/features/chat/llmService/index.ts`: lines 44-61

#### 注意事項
- **破壊的変更の回避**: ChatService.getInstance()の既存の呼び出しコードは一切変更しない
- **段階的な移行**: 一度に複数のPhaseに手を出さない（Phase 1完了→レビュー→Phase 2開始）
- **バックアップ**: リファクタリング開始前に必ずfeatureブランチを作成
  ```bash
  git checkout -b refactor/chat-frontend-phase1
  ```
- **問題発生時**: 何か問題が起きたら、無理に進めずに一旦元に戻す（git reset）

### 推奨開始コマンド

```bash
# 1. featureブランチ作成
git checkout -b refactor/chat-frontend-phase1

# 2. テストディレクトリ作成
mkdir -p app/features/chat/llmService/__tests__/core

# 3. 最初のテストファイル作成
touch app/features/chat/llmService/__tests__/core/ConversationHistory.test.ts

# 4. テスト実行環境確認
npm test -- --version  # または yarn test --version
```

### 次のセッションで最初にすべきこと

1. ConversationHistory.tsを読んで理解する
2. ConversationHistory.test.tsにテストケースを書く（Red）
3. テストを実行して動作確認（Green）
4. カバレッジを確認（80%以上を目指す）
5. コミット

このサイクルをProviderManager、RequestManagerでも繰り返す。

**Phase 1が完了したら、本issueのattempt_countをインクリメントし、開発ログに結果を記録してください。**
