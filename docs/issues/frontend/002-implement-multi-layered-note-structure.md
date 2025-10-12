---
title: "B_002_ノートの多層ディレクトリ構造対応の実装"
id: 2
status: in_progress
priority: medium
attempt_count: 1
tags: [frontend, backend, feature, data-model, storage, ui]
---

## 概要 (Overview)

現在のノート管理システムは、ノートをフラットなリストとして扱っています。このissueでは、ユーザーがノートをフォルダに整理し、階層的なディレクトリ構造で管理できるように、アプリケーションのデータ構造、ストレージロジック、UI、およびLLM連携を拡張することを目的とします。これにより、ノートの整理と検索性が向上し、より大規模な知識ベースの管理が可能になります。

## 背景 (Background)

現在のノート管理は、すべてのノートが単一のリストに表示されるフラットな構造です。ユーザーからは、ノートの数が増えるにつれて整理が困難になるという課題が提起されており、より直感的な管理のためにフォルダによる階層構造の導入が求められています。また、LLMがより現実的なファイルシステムを模倣したコンテキストで動作できるよう、この変更は重要です。

## 実装方針 (Implementation Strategy)

*   **データモデルの拡張:** ノートにパス情報または親フォルダIDを追加し、必要に応じてフォルダエンティティを導入して階層構造を表現します。
*   **ストレージロジックの更新:** `AsyncStorage` を利用した既存のストレージサービスを、新しい階層構造に対応するように変更します。ノートとフォルダのCRUD操作がパスベースで機能するようにします。
*   **UIの再設計:** ノート一覧画面を、フォルダとノートを区別して表示し、フォルダ間のナビゲーションを可能にするように再設計します。
*   **LLM連携の強化:** LLMに提供するコンテキストに階層構造を含め、LLMがフォルダ操作を含む新しいファイルシステムツールを利用できるようにバックエンドツールを拡張します。

## 受け入れ条件 (Acceptance Criteria)

- [x] ノートがフォルダ内に保存され、階層的に表示されること。
- [x] ユーザーが新しいフォルダを作成できること。
- [x] ユーザーがフォルダの名前を変更できること。
- [x] ユーザーがフォルダを削除できること（フォルダ内のノートも適切に処理されること）。
- [x] ユーザーがノートをフォルダ間で移動できること。
- [ ] LLMが現在のフォルダ構造を認識し、`read_file` や `edit_file` コマンドでフルパスを指定してノートを操作できること。
- [ ] LLMが `create_directory`, `list_directory`, `move_item`, `delete_item` などの新しいファイルシステムツールを利用できること。


## 関連ファイル (Related Files)

-   `shared/types/note.ts`
-   `app/screen/note-edit/noteStorage.ts`
-   `app/screen/note-list/noteStorage.ts`
-   `app/screen/note-list/NoteListScreen.tsx`
-   `app/screen/note-list/hooks/useNoteListLogic.ts`
-   `app/features/chat/hooks/useNoteListChatContext.ts`
-   `app/features/chat/hooks/useNoteEditChatContext.ts`
-   `app/services/llmService/types/`
-   `app/components/ListItem.tsx`
-   `server/src/tools/file_tools.py`

## 制約条件 (Constraints)

-   **既存データとの互換性:** 既存のフラットなノートデータは、新しい階層構造にシームレスに移行できること。
-   **パフォーマンス:** 大量のノートや深い階層構造を持つ場合でも、UIの応答性やストレージの読み書き性能が許容範囲内であること。
-   **UI/UX:** ユーザーが直感的にフォルダ構造を操作できるような、分かりやすいUI/UXデザインを維持すること。
-   **LLMのプロンプトエンジニアリング:** LLMが新しいファイルシステムツールを効果的に利用し、適切なパスを生成できるように、プロンプトの調整が必要になる。
-   **AsyncStorageの限界:** `AsyncStorage` の特性を考慮し、複雑なクエリや大量のデータ操作におけるパフォーマンスボトルネックを避ける設計とすること。

## 開発ログ (Development Log)

---
### 試行 #1

-   **試みたこと:** issue文書の作成。
-   **結果:** ユーザーのフィードバークに基づき、テンプレートに沿って文書を生成。
-   **メモ:** 次のステップは、このissue文書を基に具体的な実装計画を立てること。

---
### 試行 #2

-   **試みたこと:** 多層ディレクトリ構造の実装
-   **実装内容:**
    1. **データモデルの拡張** (`shared/types/note.ts`)
        - `Note` インターフェースに `path` プロパティを追加（例: "/", "/folder1/", "/folder1/subfolder/"）
        - `Folder`, `CreateFolderData`, `UpdateFolderData`, `FileSystemItem` 型を新規追加

    2. **ストレージロジックの実装** (`app/screen/note-list/noteStorage.ts`)
        - `PathUtils` クラスを実装（パス正規化、フルパス生成、パス解析機能）
        - フォルダCRUD操作を実装（`createFolder`, `updateFolder`, `deleteFolder`, `getAllFolders`）
        - パス指定による自動フォルダ作成機能 (`ensureFoldersExist`, `createNoteWithPath`)
        - 既存ノートの自動移行機能 (`migrateExistingNotes`)

    3. **ツリー構造の実装** (`app/screen/note-list/utils/treeUtils.ts`)
        - `TreeNode` インターフェースを定義（階層、展開状態、子要素を含む）
        - `buildTree` 関数: フラットなフォルダ/ノート配列から階層ツリーを構築
        - `flattenTree` 関数: ツリー構造をFlatListで表示可能な平坦配列に変換

    4. **UIコンポーネントの実装**
        - `CreateItemModal.tsx`: パス指定によるノート/フォルダ作成モーダル（例: "aaa/bbb/note.txt"）
        - `TreeListItem.tsx`: ツリー表示用リストアイテム（インデント、展開/折りたたみアイコン）

    5. **ロジックの更新** (`useNoteListLogic.ts`)
        - ツリー構造の状態管理（`treeNodes`, `expandedFolderIds`）
        - フォルダ展開/折りたたみ機能 (`toggleFolderExpand`)
        - フォルダタップ時の動作変更（画面遷移 → 展開/折りたたみ切替）

    6. **画面の更新** (`NoteListScreen.tsx`)
        - FlatListでツリー構造を表示
        - FABボタンから作成モーダルを表示

-   **結果:**
    - ✅ パス指定による階層的なフォルダ/ノート作成が可能に
    - ✅ ツリー構造の視覚的表示（インデント、📁アイコン、▶/▼展開アイコン）
    - ✅ フォルダの展開/折りたたみ機能
    - ✅ 既存データの自動移行機能
    - ✅ 型チェック、Lint通過

-   **メモ:**
    - LLM連携機能（`read_file`, `edit_file`, `create_directory`等のツール）は、フロントエンドのコンテキスト提供とバックエンドツールの連携強化が必要。
    - ノートのフォルダ間移動UIは実装済み。
    - フォルダ名変更UIは実装済み。

---

## AIへの申し送り事項 (Handover to AI)

-   **現在の状況:** フロントエンドにおける多層ディレクトリ構造の基本的な実装とUIアクションはほぼ完了しました。LLM連携機能の強化が次の主要なフェーズです。
-   **実装済み:**
    *   データモデル拡張（`path`プロパティベースで実装）
    *   ストレージロジック（フォルダCRUD、パス解析、自動移行、ノート/フォルダ移動時のパス更新）
    *   ツリー構造表示UI（展開/折りたたみ対応）
    *   パス指定による作成機能（例: "project/src/main.ts"で自動的にフォルダ作成）
    *   フォルダ名変更UI、ノート/フォルダ移動UI（ロジックは実装済み）
-   **次のアクション:**
    1. LLM連携機能の強化:
        *   `useNoteListChatContext` を更新し、LLMに現在のファイルシステム構造の完全なコンテキスト（フルパスを含む）を提供する。
        *   バックエンドの `read_file` および `list_directory` ツールが、フロントエンドの `AsyncStorage` に保存されている任意のパスのファイル/ディレクトリ情報を取得できるよう、フロントエンドとの連携メカニズムを実装する。
        *   LLMが `create_directory`, `move_item`, `delete_item` などのツールを呼び出した際に、フロントエンドで対応するアクションが適切に実行されることを確認する。
    2. 実機でのテストと動作確認
-   **考慮事項/ヒント:**
    *   `AsyncStorage`では、`@notes`キーと`@folders`キーで分けて管理する戦略を採用しました。
    *   ツリー構造は`buildTree()`でメモリ上で構築し、`flattenTree()`でFlatList用に平坦化しています。
    *   `PathUtils`クラスがパス操作の中心となっており、パス正規化（末尾の"/"）を一貫して行っています。
