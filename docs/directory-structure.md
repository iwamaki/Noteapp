# ディレクトリ構造（小規模アプリ最適化版）

## プロジェクト全体構造
```
NoteApp/
├── mobile/                  # フロントエンド（React Native + Expo）
├── server/                  # バックエンド（Python FastAPI + Docker）
├── shared/                  # 共通型定義・ユーティリティ
│   ├── types/
│   │   ├── note.ts         # ノート型定義
│   │   ├── diff.ts         # 差分型定義
│   │   └── api.ts          # API型定義
│   └── utils/
│       └── constants.ts    # 共通定数
├── docs/                   # ドキュメント
├── .github/                # GitHub Actions
│   └── workflows/
├── docker-compose.dev.yml  # 開発環境
├── .gitignore
└── README.md
```

## フロントエンド構造（mobile/）
```
mobile/
├── src/
│   ├── components/           # 再利用可能なコンポーネント
│   │   ├── common/          # 汎用コンポーネント
│   │   ├── diff/            # 差分表示関連コンポーネント
│   │   ├── editor/          # エディタ関連コンポーネント
│   │   └── chat/            # チャット関連コンポーネント
│   ├── screens/             # 画面コンポーネント
│   │   ├── NoteListScreen.tsx
│   │   ├── NoteEditScreen.tsx
│   │   ├── DiffViewScreen.tsx
│   │   ├── VersionHistoryScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── navigation/          # ナビゲーション
│   │   ├── RootNavigator.tsx
│   │   └── types.ts
│   ├── services/            # API・外部サービス
│   │   ├── api.ts
│   │   ├── llmService.ts
│   │   └── storageService.ts
│   ├── store/               # 状態管理
│   │   ├── index.ts
│   │   ├── noteStore.ts
│   │   └── settingsStore.ts
│   ├── types/               # 型定義
│   │   ├── index.ts
│   │   ├── note.ts
│   │   └── api.ts
│   ├── utils/               # ユーティリティ
│   │   ├── diffUtils.ts
│   │   ├── formatUtils.ts
│   │   └── constants.ts
│   ├── hooks/               # カスタムフック
│   │   ├── useNotes.ts
│   │   ├── useDiff.ts
│   │   └── useChat.ts
│   └── assets/              # 静的ファイル
├── __tests__/               # テスト
├── app.json                 # Expo設定
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## バックエンド構造（server/）
```
server/
├── src/
│   ├── core/                # 核となる設定・共通機能
│   │   ├── __init__.py
│   │   ├── config.py        # 設定管理
│   │   ├── database.py      # DB接続
│   │   ├── security.py      # セキュリティ関連
│   │   └── exceptions.py    # カスタム例外
│   ├── models/              # データモデル（統合）
│   │   ├── __init__.py
│   │   ├── note.py         # ノートモデル
│   │   ├── user.py         # ユーザーモデル
│   │   └── version.py      # バージョンモデル
│   ├── routers/             # APIルート
│   │   ├── __init__.py
│   │   ├── notes.py        # ノート関連API
│   │   ├── llm.py          # LLM関連API
│   │   ├── auth.py         # 認証API（必要であれば）
│   │   └── health.py       # ヘルスチェック
│   ├── services/            # ビジネスロジック
│   │   ├── __init__.py
│   │   ├── note_service.py
│   │   ├── llm_service.py
│   │   ├── diff_service.py
│   │   └── version_service.py
│   ├── clients/             # 外部サービスクライアント
│   │   ├── __init__.py
│   │   ├── openai_client.py
│   │   └── local_llm_client.py
│   ├── utils/               # ユーティリティ
│   │   ├── __init__.py
│   │   └── helpers.py
│   └── main.py              # FastAPIアプリケーション
├── tests/                   # テスト
├── migrations/              # DBマイグレーション
├── Dockerfile
├── requirements.txt
├── .env.example
├── docker-compose.yml       # 開発環境用
└── README.md
```
