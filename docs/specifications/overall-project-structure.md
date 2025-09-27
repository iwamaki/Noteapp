# ディレクトリ構造（小規模アプリ最適化版）

## プロジェクト全体構造
```
NoteApp/
├── mobile/                  # フロントエンド（React Native + Expo）
├── server/                  # バックエンド（Python FastAPI + Docker）
├── shared/                  # 共通型定義・ユーティリティ
│   ├── types/               # 共通の型定義ファイル
│   │   ├── note.ts         # ノート関連の型定義
│   │   ├── diff.ts         # 差分関連の型定義
│   │   └── api.ts          # API関連の型定義
│   └── utils/               # 共通のユーティリティ関数や定数
│       └── constants.ts    # 共通定数
├── docs/                   # プロジェクトのドキュメントを格納
├── .github/                # GitHub Actionsの設定
│   └── workflows/          # CI/CDなどのワークフロー定義
├── docker-compose.dev.yml  # 開発環境用のDocker Compose設定ファイル
├── .gitignore              # Gitが追跡しないファイルやディレクトリを指定する設定ファイル
└── README.md               # プロジェクトの概要やセットアップ方法などを記述したファイル
```
