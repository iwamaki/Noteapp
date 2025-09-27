# フロントエンドディレクトリ構造

[プロジェクト全体構造はこちらを参照してください。](overall-project-structure.md)

## フロントエンド構造（mobile/）
```
mobile/
├── src/                     # フロントエンドのソースコードを格納
│   ├── components/           # 再利用可能なUIコンポーネント
│   │   ├── common/          # 汎用的なコンポーネント
│   │   ├── diff/            # 差分表示関連コンポーネント
│   │   ├── editor/          # エディタ関連コンポーネント
│   │   └── chat/            # チャット関連コンポーネント
│   ├── screens/             # 各画面に対応するコンポーネント
│   │   ├── NoteListScreen.tsx       # ノート一覧画面
│   │   ├── NoteEditScreen.tsx       # ノート編集画面
│   │   ├── DiffViewScreen.tsx       # 差分表示適用画面
│   │   ├── VersionHistoryScreen.tsx # バージョン履歴画面
│   │   └── SettingsScreen.tsx       # 設定画面
│   ├── navigation/          # アプリケーションのナビゲーション設定
│   │   ├── RootNavigator.tsx        # ルートナビゲーター
│   │   └── types.ts                 # ナビゲーションの型定義
│   ├── services/            # API通信や外部サービス連携
│   │   ├── api.ts                   # APIクライアント
│   │   ├── llmService.ts            # LLMサービス連携
│   │   └── storageService.ts        # ストレージサービス
│   ├── store/               # 状態管理（Zustandなど）
│   │   ├── index.ts                 # ストアのエントリポイント
│   │   ├── noteStore.ts             # ノートの状態管理
│   │   └── settingsStore.ts         # 設定の状態管理
│   ├── types/               # フロントエンド固有の型定義
│   │   ├── index.ts                 # 型定義のエントリポイント
│   │   ├── note.ts                  # ノート関連の型定義
│   │   └── api.ts                   # API関連の型定義
│   ├── utils/               # フロントエンドのユーティリティ関数
│   │   ├── diffUtils.ts             # 差分処理ユーティリティ
│   │   ├── formatUtils.ts           # フォーマットユーティリティ
│   │   └── constants.ts             # 定数
│   ├── hooks/               # カスタムReactフック
│   │   ├── useNotes.ts              # ノート関連のカスタムフック
│   │   ├── useDiff.ts               # 差分関連のカスタムフック
│   │   └── useChat.ts               # チャット関連のカスタムフック
│   └── assets/              # 静的ファイル（画像、フォントなど）
├── __tests__/               # フロントエンドのテストコード
├── app.json                 # Expoの設定ファイル
├── package.json             # Node.jsプロジェクトの設定ファイル（依存関係、スクリプトなど）
├── tsconfig.json            # TypeScriptの設定ファイル
├── .env.example             # 環境変数の例
└── README.md                # フロントエンドに関する説明ファイル
```
