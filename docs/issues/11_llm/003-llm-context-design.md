---
title: "[B]_[003]_LLMへの画面コンテキスト送信データ構造設計"
id: 003
status: new
priority: high
attempt_count: 0
tags: [LLM, context, frontend, backend, data-structure]
---

## 概要 (Overview)

LLMがチャットを通じてコマンドを効率的に生成できるよう、フロントエンドの各画面（ノート一覧、ノート編集）からバックエンドに送信すべき基本的なコンテキスト情報のデータ構造を設計する。

## 背景 (Background)

現在、フロントエンドとバックエンド間で `ChatContext` の `activeScreen` フィールドのデータ構造に不一致があり、また各画面がLLMにどのような情報を渡すべきかについて明確な定義がない。LLMがストレスなくコマンドを生成するためには、適切なコンテキスト情報が必要不可欠である。

## 実装方針 (Implementation Strategy)

1.  各画面（ノート一覧、ノート編集）がLLMに提供すべきコンテキスト情報の要素を洗い出す。
    - ノート編集画面 (`EditScreenContext`):
        - `name: 'edit'`
        - `filePath: string` (現在のファイルのフルパス)
        - `fileContent: string` (現在のファイルの内容)
    - ノート一覧画面 (`NotelistScreenContext`):
        - `name: 'notelist'`
        - `visibleFileList: Array<{ filePath: string; tags?: string[]; }>` (現在表示されているファイルのリスト)
        - `selectedFileList?: Array<{ filePath: string; tags?: string[]; }>` (現在選択されているファイルのリスト)
2.  洗い出した要素に基づき、バックエンドの `models.py` に定義された `NotelistScreenContext` および `EditScreenContext` のPydanticモデルを具体化する。
3.  フロントエンドの `app/features/chat/types.ts` に対応するTypeScriptインターフェースを定義する。
4.  `ChatService` および各画面のカスタムフック（例: `useNoteEditChatContext.ts`）を修正し、定義されたデータ構造に従ってコンテキストを構築・送信するようにする。

## 受け入れ条件 (Acceptance Criteria)

- [x] ユーザーと議論し、各画面（ノート一覧、ノート編集）がチャット時にバックエンドに送るべきコンテキスト情報のデータ構造が決定されていること。
    - ノート編集画面 (`EditScreenContext`): `name: 'edit'`, `filePath: string`, `fileContent: string`
    - ノート一覧画面 (`NotelistScreenContext`): `name: 'notelist'`, `visibleFileList: Array<{ filePath: string; tags?: string[]; }>`, `selectedFileList?: Array<{ filePath: string; tags?: string[]; }>`
- [ ] バックエンドの `server/src/llm/models.py` に、決定されたデータ構造を反映した `NotelistScreenContext` および `EditScreenContext` が定義されていること。
- [ ] フロントエンドの `app/features/chat/types.ts` に、決定されたデータ構造を反映したTypeScriptインターフェースが定義されていること。
- [ ] `ChatService` および関連するフロントエンドのカスタムフックが、新しいデータ構造に従ってコンテキストを構築・送信していること。

## 関連ファイル (Related Files)

- `server/src/llm/models.py`
- `server/src/llm/providers/base.py`
- `app/features/chat/types.ts`
- `app/features/chat/index.ts`
- `app/features/chat/hooks/useNoteEditChatContext.ts`
- `app/features/chat/hooks/useChat.ts`

### llm動作に関連する全ファイル
- `docs/issues/11_llm/llm_implementation_overview.md`

## 制約条件 (Constraints)

- LLMがコマンドを生成する際に、必要な情報が不足しないようにすること。
- 不要な情報や機密情報がLLMに送信されないように配慮すること。
- フロントエンドとバックエンドのデータ構造の一貫性を保つこと。

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:** LLMへの画面コンテキスト送信データ構造設計に関する議論の必要性を認識し、そのためのissueを作成した。
- **結果:** issueファイル `docs/issues/003-llm-context-design.md` を作成した。
- **メモ:** 今後の議論の出発点とする。

---

## AIへの申し送り事項 (Handover to AI)

- **現在の状況:** フロントエンドとバックエンドのデータ構造の不一致が確認され、特に `ChatContext.activeScreen` の詳細なデータ構造について議論が必要な状況です。このissueは、その議論と設計を進めるために作成されました。
- **次のアクション:** このissueに記載された内容に基づき、ユーザーと協力して各画面からLLMに送信すべきコンテキスト情報のデータ構造を設計してください。
- **考慮事項/ヒント:** `read_file` コマンドを例に、LLMがファイル名を解決するためにどのような情報（例: 現在のディレクトリのファイルリスト、開いているファイルのパスなど）が必要かを検討してください。
