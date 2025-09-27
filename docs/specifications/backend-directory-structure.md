# バックエンドディレクトリ構造

[プロジェクト全体構造はこちらを参照してください。](overall-project-structure.md)

## バックエンド構造（server/）
```
server/
├── src/                     # バックエンドのソースコードを格納
│   ├── core/                # 核となる設定・共通機能
│   │   ├── __init__.py     # Pythonパッケージの初期化ファイル
│   │   ├── config.py       # 設定管理
│   │   ├── database.py     # DB接続
│   │   ├── security.py     # セキュリティ関連の機能
│   │   └── exceptions.py   # カスタム例外定義
│   ├── models/              # データモデル定義（FastAPIのPydanticモデルなど）
│   │   ├── __init__.py     # Pythonパッケージの初期化ファイル
│   │   ├── note.py         # ノートモデル
│   │   ├── user.py         # ユーザーモデル
│   │   └── version.py      # バージョンモデル
│   ├── routers/             # APIエンドポイントのルーティング定義
│   │   ├── __init__.py     # Pythonパッケージの初期化ファイル
│   │   ├── notes.py        # ノート関連API
│   │   ├── llm.py          # LLM関連API
│   │   ├── auth.py         # 認証API
│   │   └── health.py       # ヘルスチェックAPI
│   ├── services/            # ビジネスロジックを実装するサービス層
│   │   ├── __init__.py     # Pythonパッケージの初期化ファイル
│   │   ├── note_service.py # ノート関連のビジネスロジック
│   │   ├── llm_service.py  # LLM関連のビジネスロジック
│   │   ├── diff_service.py # 差分関連のビジネスロジック
│   │   └── version_service.py # バージョン関連のビジネスロジック
│   ├── clients/             # 外部サービス（LLMなど）との連携クライアント
│   │   ├── __init__.py     # Pythonパッケージの初期化ファイル
│   │   ├── openai_client.py # OpenAIクライアント
│   │   └── local_llm_client.py # ローカルLLMクライアント
│   ├── utils/               # バックエンドのユーティリティ関数
│   │   ├── __init__.py     # Pythonパッケージの初期化ファイル
│   │   └── helpers.py      # 汎用ヘルパー関数
│   └── main.py              # FastAPIアプリケーションのエントリポイント
├── tests/                   # バックエンドのテストコードを格納
├── migrations/              # データベースマイグレーションファイル
├── Dockerfile               # Dockerイメージをビルドするための設定ファイル
├── requirements.txt         # Pythonの依存関係リスト
├── .env.example             # 環境変数の例
├── docker-compose.yml       # 開発環境用のDocker Compose設定ファイル
└── README.md                # バックエンドに関する説明ファイル
```
