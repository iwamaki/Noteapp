---
title: "バックエンドにLLMのTool Calling機能を実装し、ファイル編集コマンドを生成させる"
id: 2
status: done
priority: high
attempt_count: 1
tags: [backend, LLM, langchain, tool-calling]
---

## 概要 (Overview)

> 現在のバックエンドは、LLMからの自然言語の応答をそのままフロントエンドに返すだけで、ファイル編集のような具体的な操作を指示するコマンドを生成する機能がない。
> このissueでは、バックエンド (`server/src/main.py`) を改修し、LangChainのTool Calling（またはFunction Calling）機能を利用して、LLMが `edit_file` コマンドをJSON形式で生成できるようにする。

## 背景 (Background)

> フロントエンドのチャット画面からLLMにファイル編集を指示する機能（issue #01）の実装にあたり、バックエンドの調査を行った。その結果、バックエンドにはLLMに特定のツール（コマンド）を使わせる仕組みが全く実装されていないことが判明した。
> 現状では、フロントエンドが期待する `LLMCommand` 形式のJSONがバックエンドから返されることはない。この問題を解決し、チャット経由でのファイル編集機能を実現するため、バックエンドの機能拡張が必須となった。

## 受け入れ条件 (Acceptance Criteria)

> このissueが「完了」と見なされるための具体的な条件をチェックリスト形式で記述します。
> 
> - [x] バックエンドは、LLMがユーザーの意図を解釈し、ファイル編集操作が必要かどうかを判断できる仕組みを持つ。
> - [x] ファイル編集が必要だと判断した場合、バックエンドはフロントエンドが解釈可能な、構造化された編集コマンド（JSON）を生成する。
> - [x] 生成される編集コマンドには、最低限「編集アクションであること」と「編集後のファイル全文」の情報が含まれている。
> - [x] `/api/chat` エンドポイントは、生成した編集コマンドをレスポンス内の `commands` フィールド、またはそれに準ずる場所に含めて返却する。
> - [x] フロントエンドから編集指示を含むチャットを送信した際に、バックエンドが上記の仕様に沿ったレスポンスを返すことを確認できる。

## 関連ファイル (Related Files)
> このissueに関連すると思われるファイルやディレクトリのリストです。
> LLMがコード分析を始める際のヒントになります。
> 
> ### バックエンド (Backend)
> - **`server/src/services.py`**: **[最重要]** LLMとの対話ロジックが記述されており、ここにTool Callingを実装する中心的なファイル。
> - **`server/src/tools.py`**: **[最重要]** LLMが使用する `edit_file` などのツールを定義するファイル。
> - `server/src/main.py`: APIエンドポイントが定義されている。`services.py`を呼び出す。
> - `server/src/models.py`: `ChatResponse` や `LLMCommand` などのデータモデルが定義されている。
> 
> ### フロントエンド (Frontend)
> - `src/features/chat/hooks/useChat.ts`: チャットのUIロジックと状態を管理し、バックエンドからのコマンドを処理する起点。
> - `src/services/api.ts`: `APIService` としてバックエンドとの通信を抽象化している。
> - `src/services/llmService.ts`: `LLMCommand` などのフロントエンド側の型定義が含まれる。
> - `src/features/note-edit/NoteEditScreen.tsx`: 最終的にファイル編集結果が反映される画面。

## 開発ログ (Development Log)

> このissueに関する作業の履歴を時系列で記録します。
> セッションをまたいで作業する際の引き継ぎ情報となります。

---
### 試行 #1

- **試みたこと:** issueに記載された関連ファイルの妥当性を確認するため、ソースコード全体を調査した。
- **結果:** 
  - issue記載のファイルリストが不十分であることが判明した。
  - バックエンドの `server/src/services.py` がLLMロジックの中心であり、現状はTool Calling機能が実装されていないことを確認した。
  - `server/src/tools.py` は存在するが空であり、ここにツール定義が必要であることがわかった。
  - フロントエンドでは `useChat.ts` がバックエンドからのコマンドを処理する `onCommandReceived` コールバックを持っており、コマンド実行の起点となることを確認した。
- **メモ:** 
  - 次のステップとして、`server/src/services.py` にLangChainのTool Calling機能を実装する。
  - `server/src/tools.py` に `edit_file` ツールを具体的に定義する。

---
