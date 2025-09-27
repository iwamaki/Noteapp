# フロントエンドディレクトリ構造 (機能ベース)

[プロジェクト全体構造はこちらを参照してください。](overall-project-structure.md)

## フロントエンド構造 (`src/`)

```
src/
├── features/
│   ├── note-list/
│   │   ├── components/
│   │   └── NoteListScreen.tsx
│   ├── note-edit/
│   │   ├── components/
│   │   └── NoteEditScreen.tsx
│   ├── diff-view/
│   │   ├── components/
│   │   └── DiffViewScreen.tsx
│   ├── version-history/
│   │   ├── components/
│   │   └── VersionHistoryScreen.tsx
│   ├── chat/
│   │   ├── components/
│   │   └── ChatPanel.tsx
│   └── settings/
│       └── SettingsScreen.tsx
│
├── components/
├── hooks/
├── store/
├── services/
├── navigation/
├── types/
└── utils/
```

## 実装方針

このディレクトリ構造は、メンテナンス性と開発効率の向上を目的とした**機能ベース (Feature-Based)** のアーキテクチャを採用しています。

- **`features/`**:
  - アプリケーションの各機能（主に画面単位）をこのディレクトリ内に配置します。
  - 各機能フォルダは、画面コンポーネント（例: `NoteListScreen.tsx`）と、その画面でのみ使用される `components/` を含みます。
  - 機能固有のロジック（カスタムフックなど）も、必要に応じて各機能フォルダ内に `hooks/` を作成して配置できます。

- **`components/` (トップレベル)**:
  - `Button`や`Input`など、複数の機能（feature）で再利用される汎用的なUIコンポーネントを配置します。

- **`store/`**:
  - 状態管理ライブラリとして **Zustand** を使用します。
  - `noteStore.ts` のように複数の機能をまたいで共有される状態や、`chatStore.ts` のようにアプリケーション全体に影響するUI（チャットパネルの開閉など）の状態を管理します。

- **`hooks/` (トップレベル)**:
  - 複数の機能で再利用可能な、UIに直接関連しないロジック（例: `useKeyboard`）や、複数のストアを組み合わせるような複雑なカスタムフックを配置します。

- **`services/`**:
  - APIクライアントや外部サービスとの通信など、非同期処理や副作用を伴うロジックを集約します。

- **`navigation/`**:
  - React Navigationを用いた画面遷移の定義（ナビゲーター）や、関連する型定義を配置します。