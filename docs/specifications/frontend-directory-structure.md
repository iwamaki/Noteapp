# フロントエンドディレクトリ構造 (機能ベース)

[プロジェクト全体構造はこちらを参照してください。](overall-project-structure.md)

## フロントエンド構造 (`src/`)

```
src/
├─ App.tsx
├─ index.ts
├─ components/
│  ├─ ChatButton.tsx
│  ├─ CustomHeader.tsx
│  ├─ FabButton.tsx
│  ├─ HeaderButton.tsx
│  └─ ListItem.tsx
├─ features/
│  ├─ chat/
│  │  ├─ ChatPanel.tsx
│  │  └─ hooks/
│  │      └─ useChat.ts
│  ├─ diff-view/
│  │  ├─ DiffViewScreen.tsx
│  │  ├─ components/
│  │  │  └─ DiffViewer.tsx
│  │  ├─ hooks/
│  │  └─ utils
│  ├─ note-edit/
│  │  ├─ NoteEditScreen.tsx
│  │  ├─ components/
│  │  │  └─ FileEditor.tsx
│  │  └─ hooks/
│  │      └─ useNoteEditor.ts
│  ├─ note-list/
│  │  ├─ NoteListScreen.tsx
│  │  └─ hooks/
│  │      └─ useNotes.ts
│  ├─ settings/
│  │  └─ SettingsScreen.tsx
│  └─ version-history/
│      └─ VersionHistoryScreen.tsx
├─ hooks/
│  └─ useDiffManager.ts
├─ navigation/
│  ├─ RootNavigator.tsx
│  └─ types.ts
├─ services/
│  ├─ api.ts
│  ├─ diffService.ts
│  ├─ llmService.ts
│  └─ storageService.ts
├─ store/
│  ├─ index.ts
│  ├─ noteStore.ts
│  └─ settingsStore.ts
├─ types/
│  ├─ api.ts
│  ├─ index.ts
│  └─ note.ts
├─ utils/
│  ├─ commonStyles.ts
│  ├─ constants.ts
│  └─ formatUtils.ts
└─ __tests__/
```

## 実装方針

このディレクトリ構造は、メンテナンス性と開発効率の向上を目的とした**機能ベース (Feature-Based)** のアーキテクチャを採用しています。

- **`components/` (トップレベル)**:  
  複数の機能（feature）で再利用される汎用的なUIコンポーネントを配置

- **`features/`**:  
  アプリケーションの各機能を配置。各機能フォルダは画面コンポーネントと、その機能固有の `components/` や `hooks/` を含む。必要に応じて `utils/` や `services/` を追加する場合もある。

- **`hooks/` (トップレベル)**:  
  複数の機能で共有される汎用的なカスタムフックを配置

- **`navigation/`**:  
  React Navigationを用いた画面遷移の定義（ナビゲーター）や関連する型定義を配置

- **`services/`**:  
  APIクライアントや外部サービスとの通信、ローカルストレージ操作など、非同期処理や副作用を伴うロジックを集約。

- **`store/`**:  
  状態管理ライブラリとして **Zustand** を使用。複数の機能をまたいで共有される状態やアプリケーション全体に影響するUIの状態を管理

- **`types/`**:  
  TypeScriptの型定義ファイルを配置

- **`utils/`**:  
  汎用的なユーティリティ関数を配置

- **`__tests__/`**:  
  アプリケーション全体の統合テストや、トップレベルのユーティリティ関数のテストを配置。機能ごとのテストは各 `__tests__/features/` 内に配置する。
