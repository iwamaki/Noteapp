# AI File Manager バックエンド説明書

このドキュメントは、AI File Managerアプリケーションの主要なソースコードファイルについて、そのパス、概要、および責任をまとめたものです。

## ファイル一覧

### 1. `index.html`

*   **パス**: `/home/iwash/Noteapp/docs/参考/index.html`
*   **概要**: AI File ManagerアプリケーションのメインHTML構造を定義します。UI要素の配置、スタイルシートとJavaScriptの読み込みを行います。
*   **責任**: アプリケーションのユーザーインターフェースの骨格を提供し、各種コンポーネント（ファイルリスト、ファイルビュー、チャット、モーダルなど）のコンテナとなります。


### 2. `server_pythonver/main.py`
*   **パス**: `/home/iwash/Noteapp/docs/参考/server_pythonver/main.py`
*   **概要**: FastAPIアプリケーションのエントリポイントであり、AIチャットエージェントとWeb検索サービスを統合します。LLMプロバイダーとの対話、会話履歴の管理、および各種サービスの状態監視のためのAPIエンドポイントを提供します。
*   **責任**: FastAPIアプリケーションの初期化とライフサイクル管理。AIチャットエージェントとWeb検索サービスへのリクエストのルーティングと処理。LLMプロバイダー情報、会話履歴、およびサービスの状態に関するAPIエンドポイントの公開。静的ファイルの配信。

### 3. `server_pythonver/langchain_agent/chat_agent.py`
*   **パス**: `/home/iwash/Noteapp/docs/参考/server_pythonver/langchain_agent/chat_agent.py`
*   **概要**: LangChainフレームワークを使用して、AIチャットエージェントを実装します。Web検索やファイル操作などのツールを活用し、ユーザーの問い合わせに対して適切な応答を生成します。
*   **責任**: 会話履歴の管理、LLM（大規模言語モデル）との連携、ツールの選択と実行、およびユーザーへの最終応答の生成。

### 4. `server_pythonver/tool/web_search_service.py`
*   **パス**: `/home/iwash/Noteapp/docs/参考/server_pythonver/tool/web_search_service.py`
*   **概要**: 複数の検索プロバイダー（Tavily, Google Custom Search, DuckDuckGo）を統合し、Web検索機能を提供します。検索クエリの実行、結果のフィルタリング、および検索履歴の管理を行います。
*   **責任**: 外部のWeb検索サービスとの連携、検索結果の整形とフィルタリング、検索履歴の保持、および利用可能な検索プロバイダーの管理。

### 5. `server_pythonver/langchain_tools/web_search_tool.py`
*   **パス**: `/home/iwash/Noteapp/docs/参考/server_pythonver/langchain_tools/web_search_tool.py`
*   **概要**: LangChainエージェントがWeb検索機能を利用するためのツールとして機能します。`WebSearchService`をラップし、エージェントがインターネット上の情報を検索し、その結果を整形して取得できるようにします。
*   **責任**: LangChainエージェントからのWeb検索リクエストを受け取り、`WebSearchService`を介して検索を実行し、結果をエージェントが利用しやすい形式で返却する。

### 6. `server_pythonver/langchain_tools/file_tool.py`
*   **パス**: `/home/iwash/Noteapp/docs/参考/server_pythonver/langchain_tools/file_tool.py`
*   **概要**: LangChainエージェントがファイルシステム操作（作成、読み込み、削除、一覧表示、コピー、移動）を実行するためのツールを提供します。
*   **責任**: LangChainエージェントからのファイル操作リクエストを解析し、指定されたファイルシステム操作を安全に実行し、その結果をエージェントに返却する。
