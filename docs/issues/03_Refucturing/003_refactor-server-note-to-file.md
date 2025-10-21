---
filename: 003_refactor-server-note-to-file # "[id]_[issueのタイトル]"
id: 003
status: new
priority: high
attempt_count: 0
tags: [refactoring, server, terminology, backend, llm]
---

## 概要 (Overview)

`server`フォルダ内の、コンテンツ単位を表す用語「note」を「file」に統一します。これはフロントエンドおよび共有型定義との一貫性を確保し、特にLLM関連のモデルやツール定義において、ファイルシステムモデルに合わせた用語統一を行います。

## 背景 (Background)

フロントエンドおよび`shared`フォルダで「note」が「file」にリファクタリングされることに伴い、バックエンドのLLM関連機能も新しい用語に合わせる必要があります。現在、バックエンドでは「note」と「file」の用語が混在しており、LLMがファイルシステムを理解する上で一貫性のない情報を提供している可能性があります。このリファクタリングにより、LLMのファイル操作に関する理解をより明確にし、全体的なシステムの一貫性を向上させます。

## 実装方針 (Implementation Strategy)

`server`フォルダ内のコードベース全体で、コンテンツ単位を指す「note」という用語を「file」に置き換えます。これには、LLMモデルの定義、LLMツールのパラメータや説明文、LLMコンテキストを構築するプロバイダー内の用語の更新が含まれます。既存の命名規則やコードスタイルに厳密に従い、変更を進めます。

## 受け入れ条件 (Acceptance Criteria)

- [ ] `server`フォルダ内のコードベース全体で、コンテンツ単位を表す用語が「note」から「file」に統一されていること。
- [ ] LLMモデル、ツール、プロバイダーにおいて、「file」という用語が適切に使用され、ファイルシステムとしての概念が明確になっていること。
- [ ] サーバーがエラーなく起動し、LLMとの連携機能が期待通りに動作すること。
- [ ] LLMがファイル操作に関する指示をより正確に理解し、実行できること。

## 関連ファイル (Related Files)

- `server/src/llm/models.py`
- `server/src/llm/tools/edit_file.py`
- `server/src/llm/tools/read_file.py`
- `server/src/llm/tools/search_files.py`
- `server/src/llm/providers/context_builder.py`
- `server/src/llm/providers/config.py`

## 制約条件 (Constraints)

- このIssueでは、`server`フォルダ内のファイルのみを変更対象とします。
- `folder`関連の用語は、このIssueの範囲では変更しません。
- 変更は段階的に行い、各ステップで動作確認を行います。

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:** `server`フォルダ内の「note」関連の用語を「file」に統一するためのIssueを作成。
- **結果:** Issueドキュメントが正常に作成されました。
- **メモ:** このIssueはLLMの動作に直接影響するため、慎重な変更とテストが必要です。

---

## AIへの申し送り事項 (Handover to AI)

- **現在の状況:** `server`フォルダ内の「note」関連の用語を「file」に統一するためのIssueが作成されました。
- **次のアクション:** このIssueの「実装方針」と「受け入れ条件」に従って、`server`フォルダ内のコード変更を実施してください。まずは、LLMモデルの定義から着手し、その後、LLMツールやプロバイダーの変更に進むことを推奨します。
- **考慮事項/ヒント:** 変更後、サーバーを起動し、LLMとの対話を通じて機能が正常に動作することを確認してください。特に、LLMがファイル操作に関する指示を正しく解釈できるかを確認することが重要です。