---
filename: 20251116_frontend_architecture_improvement
status: new
priority: high
attempt_count: 0
tags: [architecture, refactoring, FSD, DI, maintainability]
date: 2025/11/16
---

## 概要 (Overview)

フロントエンド（appフォルダ）の拡張性・保守性を向上させるため、Feature-Sliced Design (FSD) パターンを完全採用し、テスト可能なアーキテクチャへ段階的に移行する。

## 背景 (Background)

2段階の詳細調査により、以下の現状が判明：

**現状**:
- 総ファイル数: 180個（約24,197行）
- features/chat で既にFSDの基礎が導入済み（良好）
- 部分的な責務分離は成功（ChatAttachmentService等）
- Zustand（3箇所）とContext API（3箇所）が混在

**主要な課題**:
1. **CRITICAL**: シングルトンパターン（ChatService.getInstance()）によるテスト困難性
2. **CRITICAL**: エラーハンドリングの分散（FileSystemV2Error, RepositoryError, LLMError等）
3. **CRITICAL**: 状態管理の使い分けルール不明確
4. **HIGH**: CustomModalの巨大化（7,698行）
5. **HIGH**: FileRepository.getAll()のパフォーマンス問題（全ファイル一括読み込み）
6. **MEDIUM**: ディレクトリ構造の不完全性（screen vs features の区別が曖昧）

## 実装方針 (Implementation Strategy)

### アーキテクチャパターン

**FSD (Feature-Sliced Design) の完全採用**
- 理由: 既にfeatures/chatで一部導入済み、拡張が容易
- 機能単位での独立性が高く、チーム開発に最適
- スケーラブルで新機能追加が容易

### ディレクトリ構造（目標）

```
app/
├── core/          # 🆕 統一エラー定義、グローバル型
├── shared/        # 🆕 共有コンポーネント/hooks/utils
├── features/      # ♻️ chat（整理）、file（新規統合）
├── screens/       # ♻️ ルーティング対応画面のみ
└── data/design/billing/... # ♻️ 現状維持
```

### 技術スタック

- **状態管理**: Zustand（グローバル）+ Context API（UIバリエーションのみ）
- **依存注入**: Factory Pattern + DI Container
- **エラー処理**: 統一AppError + グローバルエラーバウンダリ
- **テスト**: Jest + React Testing Library

### 5段階の移行プラン

#### **Phase 1: 基盤整備（1-2週間）** 🔴
- DI (Dependency Injection) パターン導入
  - ChatService.getInstance() → ChatService.create(deps)
  - テスト用のfactory function作成
- 統一されたAppErrorクラス作成
  - すべてのエラーを統一（FileError, ChatError等）
- グローバルエラーバウンダリ実装

#### **Phase 2: 状態管理統一（2週間）** 🟠
- Zustand vs Context APIの使い分けルール明確化
- FlatListContext（852行）→ useFileListStore へ移行
- ChatUIContextとuseChatStoreの責務整理

#### **Phase 3: ChatService 責務整理（2-3週間）** 🟡
- Orchestratorパターンの採用
- ChatMessageService抽出（新規）
- 既存サービス（Attachment, Command, Token等）の連携整理

#### **Phase 4: ディレクトリ再構成（2-3週間）** 🟡
- shared/ディレクトリ作成（共通コンポーネント集約）
- core/ディレクトリ作成（エラー・型定義）
- features/file/作成（screen/file-list-flat + file-edit を統合）
- パスエイリアス設定（@core, @shared, @features等）

#### **Phase 5: パフォーマンス最適化（3週間）** 🟢
- FileRepository.getAll()にページネーション追加
- 初期化タスクの並列化（14タスク → 並列実行グループ化）
- 会話履歴のメモリ管理最適化

## 受け入れ条件 (Acceptance Criteria)

### Phase 1完了条件
- [ ] ChatServiceがDIパターンで実装され、テスト可能になっている
- [ ] AppErrorベースクラスが実装され、全ドメインで使用されている
- [ ] グローバルエラーバウンダリが動作している
- [ ] 既存機能が正常に動作している

### Phase 2完了条件
- [ ] Zustand vs Context APIの使い分けドキュメントが作成されている
- [ ] FlatListContextがuseFileListStoreに移行され、動作している
- [ ] 状態管理の混在が解消されている

### Phase 3完了条件
- [ ] ChatServiceがOrchestratorパターンで実装されている
- [ ] ChatMessageServiceが抽出され、責務が明確になっている
- [ ] チャット機能が正常に動作している

### Phase 4完了条件
- [ ] shared/, core/ディレクトリが作成され、ファイルが移行されている
- [ ] features/file/が作成され、ファイル機能が統合されている
- [ ] パスエイリアスが設定され、相対パスが削減されている
- [ ] すべてのインポートパスが更新されている

### Phase 5完了条件
- [ ] FileRepository.getAll()にページネーション/並列度制御が実装されている
- [ ] 初期化タスクが並列化され、起動時間が短縮されている
- [ ] パフォーマンステストで改善が確認されている

## 関連ファイル (Related Files)

### Phase 1関連
- `app/features/chat/index.ts` - ChatServiceシングルトン
- `app/data/core/errors.ts` - 既存エラー定義
- `app/features/chat/llmService/types/LLMError.ts` - LLMエラー

### Phase 2関連
- `app/screen/file-list-flat/context/FlatListContext.tsx` - 移行対象
- `app/features/chat/store/chatStore.ts` - Zustand参考実装
- `app/features/chat/ui/contexts/ChatUIContext.tsx` - 役割確認

### Phase 3関連
- `app/features/chat/services/` - 各種サービス
- `app/features/chat/index.ts` - ChatService実装

### Phase 4関連
- `app/components/` - shared/へ移動
- `app/screen/file-list-flat/` - features/file/へ統合
- `app/screen/file-edit/` - features/file/へ統合
- `tsconfig.json` - パスエイリアス設定

### Phase 5関連
- `app/data/repositories/fileRepository.ts` - 最適化対象
- `app/initialization/AppInitializer.ts` - 並列化対象

## 制約条件 (Constraints)

1. **後方互換性**: 既存機能を壊さないこと（各Phase完了後に動作確認）
2. **段階的移行**: 5つのPhaseを順序通りに実行すること
3. **テストカバレッジ**: Phase 1完了後は新規コードに単体テストを追加すること
4. **パフォーマンス**: 移行作業中もアプリケーションのパフォーマンスを維持すること
5. **コードレビュー**: 各Phase完了時にレビューポイントを確認すること

## 開発ログ (Development Log)

---
### 試行 #0（調査フェーズ）

- **試みたこと:**
  - 第1段階: appフォルダ全体の構造調査（180ファイル、24,197行の詳細分析）
  - 第2段階: アーキテクチャ課題の深掘り調査（依存関係、状態管理、エラー処理等）

- **結果:**
  - features/chatで既にFSDの基礎が導入済みであることを確認
  - CRITICAL/HIGH/MEDIUM/LOWの4段階で課題を優先順位付け
  - 12-13週間の5段階移行プランを策定

- **メモ:**
  - 既存の良好な実装（Zustand、部分的責務分離）を活かす方針
  - シングルトンパターンとテスト困難性が最優先課題
  - CustomModalの巨大化（7,698行）は段階的に対処

---

## AIへの申し送り事項 (Handover to AI)

### 現在の状況
- アーキテクチャ調査が完了し、5段階の移行プランが策定済み
- このissue文書を作成し、実装着手前の状態

### 次のアクション
1. **Phase 1から着手**することを推奨
2. 最初のタスク: **DI (Dependency Injection) パターンの導入**
   - `app/features/chat/index.ts`のChatService.getInstance()を修正
   - ChatService.create()メソッドを実装
   - テスト用のfactory functionを作成
3. 次のタスク: **統一AppErrorクラスの実装**
   - `app/core/errors/`ディレクトリ作成
   - AppError, FileError, ChatErrorクラスを実装
   - 既存のエラーハンドリングを段階的に移行

### 考慮事項/ヒント
- **段階的な移行が重要**: 一度にすべてを変更せず、Phase 1 → Phase 2 → ... と順序通りに
- **既存の良好な実装を活かす**: features/chat/のFSD構造は参考になる
- **テスト可能性を最優先**: Phase 1のDI導入がすべての基盤となる
- **各Phase完了後に動作確認**: 既存機能が壊れていないことを必ず確認
- **パスエイリアス**: Phase 4で設定するが、それまでは相対パスで問題なし

実装を開始する際は、まず「Phase 1のDI導入から始める」と明確に伝えてください。
