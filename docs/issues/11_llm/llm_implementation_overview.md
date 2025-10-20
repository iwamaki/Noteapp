## LLM実装の概要: フロントエンドとバックエンドの関係と責任

このドキュメントは、LLM（大規模言語モデル）の実装におけるフロントエンドとバックエンドの主要なファイルと、それぞれの責任範囲を明確にすることを目的としています。これにより、LLM関連の機能開発やデバッグを行う際に、関係者が迅速にコードベースを理解し、適切な変更箇所を特定できるようになります。

### 1. 全体アーキテクチャの概要

本アプリケーションのLLM機能は、フロントエンド（React Native）とバックエンド（FastAPI + Langchain）が連携して動作します。

*   **フロントエンド:** ユーザーインターフェースを提供し、ユーザーからのチャット入力や画面コンテキストを収集します。収集した情報をバックエンドのLLMサービスに送信し、LLMからの応答（テキスト、コマンド）を受け取ってUIに反映したり、コマンドを実行したりします。
*   **バックエンド:** フロントエンドから受け取った情報に基づき、Langchainエージェントを介してLLMと対話します。LLMの推論結果を処理し、必要に応じてファイル操作などのコマンドを生成してフロントエンドに返します。また、LLMプロバイダー（Gemini, OpenAIなど）との連携も担当します。

### 2. 主要ファイルと責任

#### 2.1. フロントエンド関連ファイル

*   **`app/features/chat/types.ts`**
    *   **責任:** チャット機能および画面コンテキストに関するTypeScriptの型定義を提供します。
    *   `ActiveScreenContext`: アクティブな画面からLLMに送信されるコンテキスト情報のインターフェース。
    *   `ActiveScreenContextProvider`: 画面が `ChatService` にコンテキストを提供するメカニズムのインターフェース。
    *   `NotelistScreenContext`, `EditScreenContext`: 各画面固有のコンテキスト情報のインターフェース（バックエンドのPydanticモデルと同期）。

*   **`app/features/chat/index.ts`**
    *   **責任:** `ChatService` クラス（シングルトン）の実装。アプリケーション全体でチャットの状態を一元的に管理します。
    *   `ActiveScreenContextProvider` の登録/解除、コマンドハンドラの管理。
    *   `ActiveScreenContext` から `ChatContext` を構築し、バックエンドの `APIService` を介してLLMに送信。
    *   LLMからの応答（テキスト、コマンド）を受け取り、UI更新やコマンドディスパッチを処理。

*   **`app/features/chat/hooks/useChat.ts`**
    *   **責任:** チャットUIのロジックをカプセル化するカスタムフック。チャットメッセージの表示、ローディング状態、チャットエリアの高さ調整などを管理します。
    *   `ChatService` と連携し、メッセージの送受信を行います。

*   **`app/features/chat/hooks/useNoteEditChatContext.ts`**
    *   **責任:** ノート編集画面に特化したチャットコンテキストを提供するカスタムフック。
    *   ノート編集画面の情報を `ActiveScreenContextProvider` として `ChatService` に登録します。
    *   `edit_file` や `read_file` など、LLMからの特定のコマンドを処理するハンドラを `ChatService` に登録します。

*   **`app/features/chat/llmService/api.ts`**
    *   **責任:** バックエンドのLLM関連APIエンドポイントとの通信を抽象化するサービス層。
    *   `ChatContext` を含むチャットメッセージをバックエンドに送信し、`ChatResponse` を受け取ります。

*   **`app/features/chat/llmService/types/types.ts`**
    *   **責任:** フロントエンドで使用されるLLM関連の共通型定義（`ChatMessage`, `LLMCommand`, `LLMResponse` など）を提供します。バックエンドのPydanticモデルと整合性を保つ必要があります。

#### 2.2. バックエンド関連ファイル

*   **`server/src/llm/models.py`**
    *   **責任:** FastAPIアプリケーションで使用されるデータモデル（Pydanticモデル）を定義します。LLMとの間で送受信されるデータの構造（`ChatMessage`, `ChatContext`, `LLMCommand`, `ChatResponse`, `LLMProvider` など）を規定する「単一の信頼できる情報源」です。
    *   `NotelistScreenContext`, `EditScreenContext` など、画面固有のコンテキストモデルもここに定義されます。

*   **`server/src/llm/providers/base.py`**
    *   **責任:** LLMプロバイダーの抽象基底クラス (`BaseLLMProvider`, `BaseAgentLLMProvider`) を定義します。
    *   Langchainエージェントのセットアップ、システムプロンプトの構築、フロントエンドから受け取った `ChatContext` の情報をツールが利用できるグローバルコンテキストへの注入、エージェントの実行、そしてエージェントの結果から `LLMCommand` を抽出するロジックを実装します。

*   **`server/src/llm/providers/gemini.py` / `server/src/llm/providers/openai.py`**
    *   **責任:** 特定のLLMプロバイダー（Gemini, OpenAI）との連携を実装する具体的なクラス。`BaseAgentLLMProvider` を継承し、プロバイダー固有のLLMクライアントの初期化を行います。

*   **`server/src/llm/routers/chat_router.py`**
    *   **責任:** FastAPIのルーティングを定義し、フロントエンドからのチャットリクエストを受け取るAPIエンドポイントを提供します。
    *   リクエストを `chat_service.py` に渡し、その応答をフロントエンドに返します。

*   **`server/src/llm/services/chat_service.py`**
    *   **責任:** バックエンドにおけるチャット機能のビジネスロジックを実装します。LLMプロバイダーの選択、会話履歴の管理、LLMへのリクエスト送信などを調整します。

*   **`server/src/llm/tools/file_tools.py`**
    *   **責任:** LLMが呼び出し可能なファイル操作関連のツール（`edit_file`, `read_file`, `search_files`, `list_directory`, `create_directory`, `move_item`, `delete_item`）を定義します。
    *   これらのツールは、LLMの推論に基づいてフロントエンドで実行されるべきコマンドを生成します。
    *   ツールが利用するグローバルコンテキスト（`_current_file_context` など）の管理も行います。
