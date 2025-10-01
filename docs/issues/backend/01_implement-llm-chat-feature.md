---
title: "バックエンドLLMチャット機能の実装とフロントエンド連携"
id: 01
status: new
priority: high
attempt_count: 0
tags: [backend, LLM, FastAPI, LangChain, chat]
---

## 概要 (Overview)

フロントエンドのLLMチャット機能がバックエンドとの連携ができておらず、「サーバーが起動しているか確認してください」という警告が表示され、機能していません。このIssueでは、FastAPIとLangChainを使用してバックエンドにLLMチャット機能を実装し、フロントエンドの `LLMService` が期待するAPIエンドポイントを提供することで、チャット機能を完全に動作させます。

## 背景 (Background)

ユーザーはLLMとのチャット機能を通じて、ノートの編集、要約、情報検索などを行いたいと考えています。現在、フロントエンドにはチャットUIとバックエンドとの連携を想定した `src/services/llmService.ts` が存在しますが、バックエンドのLLM関連の実装が不足しているため、機能が利用できません。

`docs/参考/server_pythonver/main.py` には、FastAPIとLangChainを用いたLLMバックエンドのプロトタイプが存在し、これが実装の強力な参考となります。このプロトタイプをベースに、既存のプロジェクト構造に統合し、フロントエンドの要求を満たすバックエンドを構築します。

## 受け入れ条件 (Acceptance Criteria)

- [ ] `server/requirements.txt` が、必要なPythonパッケージ（`fastapi`, `uvicorn`, `langchain`, `langchain-openai`, `python-dotenv`, `pydantic`, `sqlalchemy`, `psycopg2-binary`, `requests`, `beautifulsoup4`, `tiktoken`, `fastapi-cors`, `python-multipart` など）で適切に作成されていること。
- [ ] `server/src/main.py` がFastAPIアプリケーションとして機能し、CORSミドルウェアが設定され、LLM関連のルーターが組み込まれていること。
- [ ] `server/src/routers/llm.py` が、フロントエンドの `LLMService` が期待する以下のエンドポイントを実装していること:
    - `POST /api/chat`
    - `GET /api/chat`
    - `GET /api/llm-providers`
    - `GET /api/health`
    - 必要に応じて、プロトタイプにある追加のエンドポイント（`/api/conversation-status`, `/api/search-status`, `/api/agent-status`, `/api/dispatch`, `/api/clear-history`）も実装されていること。
- [ ] `server/src/services/llm_service.py` が、LangChainを使用してLLMとの対話を管理するロジックを実装していること。
    - `process_chat` メソッドが `message`, `provider`, `model`, `context` を受け取り、`LLMResponse` を返すこと。
    - `ChatContext` からの `conversationHistory` や `currentFileContent` などの情報をLLMに適切に渡していること。
    - 必要に応じて `LLMCommand` を生成するロジックが組み込まれていること。
- [ ] `server/src/langchain_agent/chat_agent.py` が、LangChainのAgentとして機能し、LLMとの対話ロジックをカプセル化していること。
- [ ] `server/src/tool/web_search_service.py` が、Web検索機能を提供し、LangChainのツールとして統合されていること。
- [ ] `server/src/clients/openai_client.py` および `server/src/clients/local_llm_client.py` が、LangChainのLLMクラス（例: `ChatOpenAI`, `Ollama` など）を使用して、各LLMプロバイダーとの接続を確立していること。
- [ ] `server/src/core/config.py` が、LLMサービスに必要なAPIキーやURL（`openai_api_key`, `local_llm_url` など）を環境変数から正しくロードし、利用可能にしていること。
- [ ] `Dockerfile` および `docker-compose.yml` が更新され、FastAPIサーバーがDocker環境で正常に起動し、必要な依存関係がインストールされること。
- [ ] フロントエンドからLLMチャット機能が正常に利用でき、バックエンドからの応答が表示されること。

## 関連ファイル (Related Files)

- `server/requirements.txt`
- `server/src/main.py`
- `server/src/routers/llm.py`
- `server/src/services/llm_service.py`
- `server/src/langchain_agent/chat_agent.py` (新規作成)
- `server/src/tool/web_search_service.py` (新規作成)
- `server/src/clients/openai_client.py`
- `server/src/clients/local_llm_client.py`
- `server/src/core/config.py`
- `server/Dockerfile`
- `server/docker-compose.yml`
- `src/services/llmService.ts` (フロントエンドの参照用)
- `docs/参考/server_pythonver/main.py` (プロトタイプ参照用)

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:**
    - `src/services/llmService.ts` を分析し、フロントエンドが期待するバックエンドAPIの仕様を把握した。
    - `server/src/main.py`, `server/src/routers/llm.py`, `server/src/services/llm_service.py`, `server/src/clients/openai_client.py`, `server/src/clients/local_llm_client.py`, `server/requirements.txt` が未実装または空であることを確認した。
    - `server/src/core/config.py` がLLM関連の設定を扱う準備ができていることを確認した。
    - `docs/参考/server_pythonver/main.py` に存在するプロトタイプを分析し、実装の具体的な指針を得た。
    - 上記分析に基づき、本Issueのドラフトを作成した。
- **結果:** バックエンドのLLM機能が未実装であることが明確になり、フロントエンドのエラーの原因が特定できた。プロトタイプから具体的な実装方針を確立できた。
- **メモ:** 次のステップは、`server/requirements.txt` の作成と、`server/src/main.py` の基本的なFastAPIアプリケーションのセットアップから始める。
---
