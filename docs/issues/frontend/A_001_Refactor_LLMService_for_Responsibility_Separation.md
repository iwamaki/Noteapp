---
title: "A_001_Refactor_LLMService_for_Responsibility_Separation"
id: 001
status: new
priority: high
attempt_count: 0
tags: [refactoring, llmService, architecture]
---

## 概要 (Overview)

`app/services/llmService` ディレクトリ内の `LLMService` クラスを、単一責任の原則に基づいて複数のコンポーネントに分離する大規模なリファクタリングを実施します。これにより、コードの保守性、テスト容易性、および拡張性を向上させます。

## 背景 (Background)

現在の `LLMService` クラス (`app/services/llmService/index.ts` に定義) は、API通信、設定管理、会話履歴管理、プロバイダー/モデル選択、レートリミット処理など、多くの責務を担っています。この責務過多な状態は、コードの理解を困難にし、変更時のリスクを高め、テストを複雑にしています。また、`index.ts` というファイル名が、その主要な内容を適切に表現していないという指摘もありました。このリファクタリングは、これらの課題を解決し、より堅牢でスケーラブルなアーキテクチャを構築することを目的とします。

## 受け入れ条件 (Acceptance Criteria)

- [ ] `app/services/llmService/index.ts` が `app/services/llmService/LLMService.ts` にリネームされていること。
- [ ] API通信ロジックが `LLMApiClient.ts` という新しいファイルに分離され、`LLMService` はこのクライアントを利用してAPIと通信すること。
- [ ] LLMプロバイダーとモデルの管理ロジック (`availableProviders`, `currentProvider`, `currentModel` および関連メソッド) が `LLMProviderManager.ts` という新しいファイルに分離され、`LLMService` はこのマネージャーを利用すること。
- [ ] レートリミット処理が `RateLimiter.ts` または `LLMApiClient` 内の適切な場所に分離されていること。
- [ ] `LLMService` は、`ConversationHistory`、`LLMApiClient`、`LLMProviderManager` などのコンポーネントを調整する役割に特化していること。
- [ ] 既存の機能がすべて維持され、リファクタリング前後で外部からの動作に変更がないこと。
- [ ] すべての関連するファイルで import パスが正しく更新されていること。
- [ ] プロジェクトのビルド、リンティング、テストがすべて成功すること。

## 関連ファイル (Related Files)

- `app/services/llmService/CommandValidator.ts`
- `app/services/llmService/ConversationHistory.ts`
- `app/services/llmService/LLMError.ts`
- `app/services/llmService/index.ts` (リネーム対象)
- `app/services/llmService/types.ts`
- `app/utils/loggerConfig.ts`
- `app/App.tsx`
- `app/features/chat/hooks/useChat.ts`
- `app/screen/note-edit/hooks/useNoteEditor.tsx`
- `app/screen/note-list/hooks/useNoteListLogic.ts`
- `app/navigation/RootNavigator.tsx`

## 制約条件 (Constraints)

- 既存の機能はすべて維持すること。
- 新しい外部ライブラリは導入しないこと。
- TypeScript の型安全性を維持すること。
- 既存のロギングメカニズム (`loggerConfig`) を引き続き利用すること。

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:** 
- **結果:** 
- **メモ:** 

---

## AIへの申し送り事項 (Handover to AI)

- **現在の状況:** `app/services/llmService` の大規模リファクタリング計画が承認され、issue ドキュメントが作成されました。
- **次のアクション:** 上記の「受け入れ条件」と「変更内容」に基づいて、リファクタリング作業を開始してください。まず、`index.ts` のリネームから着手し、その後、APIクライアント、プロバイダーマネージャーの分離を進めてください。
- **考慮事項/ヒント:** 各ステップで既存の機能が壊れていないか、こまめに確認しながら進めてください。特に import パスの更新は慎重に行ってください。
