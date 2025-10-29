---
title: "B_001_Refactor llmService.ts for improved modularity"
id: 001
status: done
priority: medium
attempt_count: 0
tags: [refactoring, code-structure, maintainability]
---

## 概要 (Overview)

`app/services/llmService.ts` ファイルが肥大化し、複数の異なる責務を担っているため、コードの可読性、保守性、テスト容易性が低下しています。このissueは、`llmService.ts` 内のコンポーネントをより小さな、単一責務のモジュールに分割し、`app/services/llmService` ディレクトリ配下に再編成することで、コードベースの健全性を向上させることを目的とします。

## 背景 (Background)

現在の `app/services/llmService.ts` は、LLM関連の型定義、エラーハンドリング、会話履歴管理、コマンド検証、主要なLLMサービスロジック、さらにはパスユーティリティまで、多岐にわたる機能を含んでいます。これにより、ファイルが約400行に達し、特定の機能の変更が他の機能に意図しない影響を与えるリスクが高まっています。また、新規開発者がコードを理解する際の障壁にもなっています。単一責任の原則に従い、各コンポーネントを分離することで、将来的な機能追加や変更が容易になり、コードの品質が向上します。

## 受け入れ条件 (Acceptance Criteria)

- [ ] `app/services/llmService` という新しいディレクトリが作成されていること。
- [ ] 以下の型定義が `app/services/llmService/types.ts` に移動されていること:
    - `ChatMessage`
    - `ChatContext`
    - `LLMProvider`
    - `LLMCommand`
    - `LLMResponse`
    - `LLMHealthStatus`
    - `LLMConfig`
- [ ] `LLMError` クラスが `app/services/llmService/LLMError.ts` に移動されていること。
- [ ] `ConversationHistory` クラスが `app/services/llmService/ConversationHistory.ts` に移動されていること。
- [ ] `CommandValidator` クラスが `app/services/llmService/CommandValidator.ts` に移動されていること。
- [ ] `PathUtils` クラスが `app/utils/pathUtils.ts` に移動されていること。
- [ ] 元の `app/services/llmService.ts` は、上記で分割されたモジュールをインポートし、主要な `LLMService` クラスのみを含む `app/services/llmService/index.ts` または `app/services/llmService/LLMService.ts` として再構成されていること。
- [ ] 既存のコードベースで `app/services/llmService.ts` をインポートしている箇所が、新しいパスに正しく更新されていること。
- [ ] 全ての機能がリファクタリング後も期待通りに動作すること（既存のテストがあればパスすること）。

## 関連ファイル (Related Files)

- `app/services/llmService.ts` (リファクタリング対象)
- `app/utils/loggerConfig.ts` (既存のインポート元)
- `app/screen/note-edit/hooks/useNoteEditHeader.tsx` (LLMServiceを使用している可能性のあるファイル例)
- `app/features/chat/hooks/useChat.ts` (LLMServiceを使用している可能性のあるファイル例)
- `app/navigation/RootNavigator.tsx` (LLMServiceを使用している可能性のあるファイル例)
- `app/App.tsx` (LLMServiceを使用している可能性のあるファイル例)

## 制約条件 (Constraints)

- 既存の機能の動作を変更しないこと。
- 新しいライブラリやフレームワークを導入しないこと。
- TypeScriptの型安全性を維持すること。
- 既存のコーディングスタイルと命名規則を遵守すること。

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:** `app/services/llmService.ts` の内容を分析し、責任の分離と新しいディレクトリ構造の提案を行った。
- **結果:** `app/services/llmService` ディレクトリの作成、`types.ts`, `LLMError.ts`, `ConversationHistory.ts`, `CommandValidator.ts` への分割、`PathUtils.ts` の `app/utils` への移動、そして主要な `LLMService` クラスの再構成という計画が策定された。
- **メモ:** ユーザーは `llmService` をフォルダ名として採用することに同意した。

---

## AIへの申し送り事項 (Handover to AI)

- **現在の状況:** `app/services/llmService.ts` のリファクタリング計画が策定され、issueテンプレートにまとめられました。
- **次のアクション:** このissueは分析段階であり、実装は不要です。ユーザーからの次の指示を待ちます。
- **考慮事項/ヒント:** なし。
