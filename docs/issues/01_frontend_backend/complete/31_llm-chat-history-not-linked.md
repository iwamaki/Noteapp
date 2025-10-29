---
title: "チャット機能におけるLLMへの会話履歴の未連携"
id: 31
status: done
priority: high
attempt_count: 0
tags: [chat, LLM, backend, conversation-history, bug]
---

## 概要 (Overview)

> チャット機能において、LLM（大規模言語モデル）が過去の会話履歴を考慮して応答を生成できていません。

## 背景 (Background)

> 現在のチャット機能では、フロントエンドはユーザーとAIの会話履歴を管理し、新しいメッセージと共にバックエンドに送信しています。しかし、バックエンドのLLMサービス（`SimpleLLMService.process_chat`）は、この会話履歴をLLMへの入力メッセージリストに含めていません。このため、LLMは直前のユーザーメッセージと、もしあれば現在のファイルコンテンツのみに基づいて応答を生成しており、会話の文脈を理解できていません。

## 受け入れ条件 (Acceptance Criteria)

> このissueが「完了」と見なされるための具体的な条件をチェックリスト形式で記述します。
>
> - [x] LLMが過去の会話履歴に基づいて、より文脈に沿った応答を生成できること。
> - [x] OpenAIおよびGoogle Geminiの両方のLLMプロバイダーで、会話履歴が正しく処理されること。

## 関連ファイル (Related Files)

> このissueに関連すると思われるファイルやディレクトリのリストです。
> LLMがコード分析を始める際のヒントになります。
>
> - `app/features/chat/hooks/useChat.ts` (フロントエンドでの履歴管理と送信元)
> - `app/services/llmService.ts` (フロントエンドでの履歴管理と送信元)
> - `server/src/main.py` (バックエンドでのリクエスト受け取り)
> - `server/src/models.py` (会話履歴を含む`ChatContext`の定義)
> - `server/src/services.py` (LLMへのメッセージ構築ロジック)

## 制約条件 (Constraints)

> このissueを解決する際に守るべき制約やルール、考慮すべき技術的・運用的な条件を記述します。
> 例: 使用禁止のライブラリ、パフォーマンス要件、UIデザインガイドライン、セキュリティ要件など。
>
> - 既存のフロントエンドの会話履歴管理ロジック（`ConversationHistory`クラス）は変更しないこと。
> - LLMへの入力メッセージ形式はLangchainの `HumanMessage` および `AIMessage` に準拠すること。
> - LLMへの入力メッセージリストの構築時に、`SystemMessage`、会話履歴、現在のユーザーメッセージ、および`currentFileContent`（存在する場合）の順序を考慮すること。

## 開発ログ (Development Log)

> このissueに関する作業の履歴を時系列で記録します。
> セッションをまたいで作業する際の引き継ぎ情報となります。

---
### 試行 #1

- **試みたこと:** 
- **結果:** 
- **メモ:** 

---
