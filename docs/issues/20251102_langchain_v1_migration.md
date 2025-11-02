---
filename: 20251102_langchain_v1_migration
status: in-progress
priority: high
attempt_count: 1
tags: [backend, langchain, migration, web-search]
date: 2025/11/02
---

## 概要 (Overview)

LangChain 0.1.x → 1.0.x へのメジャーバージョンアップに伴い、既存のLLMエージェントシステムを新しいAPIに移行する。
移行完了後、Web検索機能を追加する。

## 背景 (Background)

- Web検索機能を追加しようとしたところ、LangChainのバージョンが1.0.3に上がっていた
- LangChain 1.0では`AgentExecutor`や`create_tool_calling_agent`などの従来のAPIが削除/変更されている
- 既存コード（`base.py`, `context_builder.py`など）が`langchain.schema`や`langchain.agents`を使用しており、互換性がない
- 一時的にバージョンダウンも検討したが、今後を考えると1.0対応が必要

## 実装方針 (Implementation Strategy)

### フェーズ1: LangChain 1.0への移行
1. **インポート文の修正**
   - `langchain.schema` → `langchain_core.messages`
   - `langchain.prompts` → `langchain_core.prompts`
   - `langchain.agents.AgentExecutor` → 新しいエージェントAPI

2. **エージェントシステムの書き換え**
   - `BaseAgentLLMProvider`（base.py）を新しいLangChain 1.0のエージェントAPIに対応
   - `create_tool_calling_agent` → 新しい方法（`create_agent`など）
   - `AgentExecutor` → 新しい実行方法

3. **動作確認**
   - 既存の機能（ファイル操作ツール）が正常に動作することを確認
   - OpenAI/Geminiプロバイダーの動作確認

### フェーズ2: Web検索機能の追加
1. `WebSearchService`の実装
2. `web_search`ツールの実装
3. 既存ツールシステムへの統合

## 受け入れ条件 (Acceptance Criteria)

- [ ] LangChain 1.0でサーバーが正常に起動する
- [ ] 既存の全てのツール（create_file, edit_file, read_file等）が動作する
- [ ] OpenAI/Geminiプロバイダーでチャットが動作する
- [ ] Web検索機能が実装され、エージェントから呼び出せる
- [ ] Docker環境で正常にビルド・起動できる
- [ ] ruff/mypyのエラーがない

## 関連ファイル (Related Files)

- `server/requirements.txt` - 依存関係の定義
- `server/src/llm/providers/base.py` - エージェントシステムの基底クラス
- `server/src/llm/providers/context_builder.py` - コンテキスト構築
- `server/src/llm/providers/openai.py` - OpenAIプロバイダー
- `server/src/llm/providers/gemini.py` - Geminiプロバイダー
- `server/src/llm/tools/__init__.py` - ツール登録
- `server/src/llm/services/` - サービスレイヤー（Web検索追加予定）

## 制約条件 (Constraints)

- Docker環境で動作すること
- 既存の機能を壊さないこと
- requirements.txtは現在のバージョン（langchain==1.0.3等）を維持
- 型チェック（mypy）とlint（ruff）をパスすること

## 開発ログ (Development Log)

---
### 試行 #1 (2025/11/02)

- **試みたこと:**
  - 参考実装（~/02_Repository/Noteapp/docs/reference/server_pythonver）のWeb検索システムを確認
  - WebSearchService、web_searchツールを実装
  - requirements.txtに依存関係追加（langchain-tavily, duckduckgo-search）
  - Docker再ビルド

- **結果:**
  - ビルドは成功したが、起動時にImportError発生
  - `langchain.schema` → `langchain_core.messages`に修正
  - `langchain.agents.AgentExecutor`が見つからないエラー
  - LangChain 1.0では`AgentExecutor`が削除されていることが判明

- **メモ:**
  - Web検索機能の実装自体は完了していた（後でリストア可能）
  - `git restore .`で全変更を破棄
  - 新ブランチ`feature/langchain-v1-migration`を作成
  - まずLangChain 1.0への移行を完了させる必要がある

---

## AIへの申し送り事項 (Handover to AI)

### 現在の状況
- 新ブランチ`feature/langchain-v1-migration`で作業中
- クリーンな状態（変更なし）
- requirements.txtのバージョン: langchain==1.0.3

### 次のアクション
1. **LangChain 1.0の新しいエージェントAPIを調査**
   - 公式ドキュメントまたはコンテナ内でAPIを確認
   - `AgentExecutor`の代替方法を特定
   - `create_tool_calling_agent`の代替方法を特定

2. **base.pyを書き換え**
   - `BaseAgentLLMProvider._setup_agent()`を新しいAPIに対応
   - `BaseAgentLLMProvider.chat()`の実行部分を修正
   - インポート文を全て修正

3. **動作確認**
   - Dockerコンテナが起動することを確認
   - 既存のツールが動作することをテスト

4. **Web検索機能の追加**
   - 移行完了後、以前実装したコードを参考に再実装

### 考慮事項/ヒント
- LangChain 1.0では`create_agent`や新しいランナブル（Runnable）APIが使われている可能性
- `docker exec server-api-1 python -c "..."`でコンテナ内でのAPI確認が可能
- 参考実装は0.1.x系のため、直接は使えない
- tools（AVAILABLE_TOOLS）は変更不要の可能性が高い（LangChainのtoolデコレータは互換性あり）
