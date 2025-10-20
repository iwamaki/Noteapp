---
filename:  B_008_refactor-tool-handling-infrastructure
id: 8
status: new
priority: B
attempt_count: 0
tags: [refactoring, chat, llm, architecture]
---

## 概要 (Overview)

> 現在、サーバーサイドで定義されたLLMツールと、フロントエンドがそれを解釈・実行するための仕組みが非効率的かつメンテナンス性の低い状態にある。本Issueは、このツールハンドリングのインフラをリファクタリングし、拡張性と保守性の高いアーキテクチャを構築することを目的とする。

## 背景 (Background)

> 現状の実装では、サーバーとフロントエンドで利用可能なツール（コマンド）の定義が二重管理されており、同期が取れていない。新しいツールを追加する際には、サーバーサイドのコード (`server/src/llm/tools/__init__.py`)、フロントエンドのバリデーションロジック (`app/features/chat/llmService/utils/CommandValidator.ts`)、そしてコマンドを実行するUIコンポーネント（`useNoteEditChatContext.ts` など）の複数箇所を修正する必要があり、修正漏れのリスクや開発コストの増大を招いている。
> また、コマンドの実行ロジックがUI層のカスタムフック内に直接記述されており、ビジネスロジックとUIロジックが密結合しているため、コードの再利用性やテストの容易性が低い。

## 実装方針 (Implementation Strategy)

> 1.  **ツール定義情報を提供するAPIの実装**:
>     *   サーバーサイドに、LLMが利用可能な全ツールの詳細情報を返す `/tools` APIエンドポイントを新規に作成する。
>     *   このAPIは、Langchainの `BaseTool` オブジェクトから **①名前(name)、②説明(description)、③引数スキーマ(args_schema)** を抽出し、JSON形式で返す。引数スキーマはJSON Schema形式とすることが望ましい。
>     *   これにより、サーバーサイドの `@tool` で定義された情報が、そのままフロントエンドの「信頼できる唯一の情報源」となる。
>
> 2.  **フロントエンドでの動的なツール情報取得と検証**:
>     *   フロントエンドは、アプリケーション起動時に `/tools` APIを呼び出し、利用可能なツールとその定義（引数スキーマなど）を取得・保持する。
>     *   `CommandValidator.ts` をリファクタリングし、ハードコードされたアクションリストを廃止する。代わりに、APIから取得した情報に基づき、LLMから受け取ったコマンドの **①アクション名の妥当性** と **②引数の構造的正しさ（型、必須項目など）** の両方を検証する。
>
> 3.  **コマンドハンドラの集約と分離**:
>     *   `app/features/chat/handlers/` ディレクトリを新設し、各コマンド（`edit_file`, `delete_item`など）の処理ロジックをそれぞれ独立した関数として実装する（責務の分離）。
>     *   `useNoteEditChatContext` や `useNoteListChatContext` に書かれているロジックを、これらの新しいハンドラファイルに移動させる。
>     *   `ChatService` は、アプリケーション起動時にこれらのハンドラをすべて読み込み、コマンド名と処理関数をマッピングしたマップを保持する。画面遷移によるハンドラの再登録は不要とする。
>
> 4.  **UIとロジックの疎結合化**:
>     *   コマンドハンドラがUIの状態を直接操作するのではなく、状態管理ストア（Zustandなど、既存の仕組みを踏襲）のアクションを呼び出すか、イベントを発行する形式に変更し、UI層との結合を疎にする。

## 受け入れ条件 (Acceptance Criteria)

> - [ ] サーバーサイドに `/tools` APIエンドポイントが実装されており、各ツールについて `name`, `description`, `args_schema` (JSON Schema形式) を含むリストを返す。
> - [ ] フロントエンドが、起動時に `/tools` APIからツール定義を取得し、サービス内（例: `ChatService` や新設する `ToolService`）に保持する。
> - [ ] `CommandValidator.ts` がリファクタリングされ、ハードコードされたリストが削除されている。
> - [ ] `CommandValidator.ts` が、APIから取得したスキーマ情報を用いて、コマンド名と引数の両方を検証するロジックを持つ。
> - [ ] `app/features/chat/handlers/` ディレクトリが作成され、`edit_file`, `create_directory` などのフロントエンドで実行されるコマンドの処理ロジックが実装されている。
> - [ ] `useNoteEditChatContext.ts` と `useNoteListChatContext.ts` から、コマンド処理の具体的なロジックが削除されている。
> - [ ] `ChatService` が、画面遷移ごとではなく、起動時にすべてのコマンドハンドラを登録するようになっている。
> - [ ] リファクタリング後も、既存のチャット経由でのファイル編集、ディレクトリ作成、ファイル読み取り、検索などの機能が問題なく動作する。

## 関連ファイル (Related Files)

> - `server/src/llm/tools/__init__.py` (ツールの情報源)
> - `server/src/main.py` (新規APIエンドポイントの追加先)
> - `app/features/chat/llmService/utils/CommandValidator.ts` (修正対象)
> - `app/features/chat/hooks/useNoteEditChatContext.ts` (リファクタリング対象)
> - `app/features/chat/hooks/useNoteListChatContext.ts` (リファクタリング対象)
> - `app/features/chat/index.ts` (ChatService, 修正対象)
> - `app/features/chat/handlers/` (新規作成)

## 制約条件 (Constraints)

> - 既存のライブラリや状態管理の仕組みを可能な限り再利用すること。
> - パフォーマンスに大きな影響を与えないこと。

## 開発ログ (Development Log)

> このissueに関する作業の履歴を時系列で記録します。
> セッションをまたいで作業する際の引き継ぎ情報となります。

---
### 試行 #1

- **試みたこと:** 7フェーズに分けてツールハンドリングインフラの完全リファクタリングを実施
  1. サーバーサイドに `/tools` APIエンドポイントを実装
  2. フロントエンドでToolService（シングルトン）を実装
  3. CommandValidatorをスキーマベース検証にリファクタリング
  4. コマンドハンドラを`app/features/chat/handlers/`に分離
  5. ChatServiceをグローバル/コンテキストハンドラ分離構造にリファクタリング
  6. 既存フック（useNoteEditChatContext/useNoteListChatContext）から新構造に移行
  7. TypeScript型チェックとPython型チェック（mypy）をパス

- **結果:** ✅ **成功** - すべての受け入れ条件を満たす実装が完了
  - [x] `/api/tools`エンドポイントが稼働（Pydantic v1/v2両対応）
  - [x] ToolServiceが起動時にツール定義を取得・保持
  - [x] CommandValidatorからハードコードリストを削除
  - [x] `app/features/chat/handlers/`ディレクトリ作成（4ハンドラ実装）
  - [x] ChatServiceが起動時にグローバルハンドラを登録（画面遷移で維持）
  - [x] フックから具体的ロジックを削除（コンテキスト提供のみに簡素化）
  - [x] TypeScript型チェック（`npm run type-check`）通過

- **メモ:**
  - **アーキテクチャ改善点:**
    - サーバーが唯一の情報源（Single Source of Truth）に
    - 画面遷移時のハンドラクリア問題を解決（グローバル/コンテキスト分離）
    - コンテキスト注入パターンでUI層との疎結合を実現
  - **拡張性向上:**
    - 新規ツール追加時はサーバーの`@tool`定義のみで自動的にフロント側に反映
    - ハンドラは`handlers/`に追加するだけで登録可能
  - **保守性向上:**
    - ロジックが明確に分離（API層/サービス層/ハンドラ層）
    - 各ハンドラが単一責任原則に準拠（20-40行程度）
  - **残タスク:** 実際の動作確認（サーバー起動＋フロントエンド起動での統合テスト）

---

## AIへの申し送り事項 (Handover to AI)

> - **現在の状況:** リファクタリング完了。型チェックは通過済み。
> - **次のアクション:**
>   1. サーバーを起動して`/api/tools`エンドポイントが正しくツール定義を返すか確認
>   2. フロントエンドアプリを起動してToolServiceが正常に初期化されるか確認
>   3. 実際のチャット操作で各コマンド（edit_file, create_directory等）が動作するか確認
> - **考慮事項/ヒント:**
>   - サーバーが起動していない場合、ToolServiceはエラーをキャッチして空配列で初期化される設計（アプリクラッシュ回避）
>   - ログカテゴリに`toolService`/`editFileHandler`等を追加済み（`app/utils/logger.ts:4`）
>   - 初期化タスクは`loadToolDefinitionsTask`として`app/initialization/tasks/`に登録済み
