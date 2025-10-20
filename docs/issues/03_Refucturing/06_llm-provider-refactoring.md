---
title: "B_008_LLMプロバイダーのリファクタリング"
id: 8
status: new
priority: medium
attempt_count: 0
tags: [refactoring, LLM, backend]
---

## 概要 (Overview)

LLMプロバイダー（Gemini, OpenAI）間のコード重複を解消し、共通ロジックを抽象化することで、コードの保守性と拡張性を向上させます。

## 背景 (Background)

現在のLLMプロバイダーの実装では、`GeminiProvider` と `OpenAIProvider` の間で、Langchainエージェントのセットアップ、コンテキスト設定、チャット処理、コマンド抽出ロジックに多くの重複が見られます。これにより、新しいLLMプロバイダーを追加する際の開発コストが高く、既存プロバイダーの変更が複雑になっています。

## 実装方針 (Implementation Strategy)

1.  `src/llm/providers/base.py` に、`BaseLLMProvider` を継承する新しい抽象基底クラス `BaseAgentLLMProvider` を作成します。
2.  `GeminiProvider` と `OpenAIProvider` に共通する以下のロジックを `BaseAgentLLMProvider` に移動します。
    *   Langchainエージェントのプロンプトテンプレート作成。
    *   `create_tool_calling_agent` および `AgentExecutor` の初期化。
    *   `chat` メソッド全体のロジック（コンテキスト設定、会話履歴構築、AgentExecutorの実行、応答処理）。
    *   `_extract_commands_from_agent_result` メソッド。
3.  `GeminiProvider` と `OpenAIProvider` を `BaseAgentLLMProvider` を継承するように変更し、それぞれのLLMクライアント（`ChatGoogleGenerativeAI`, `ChatOpenAI`）の初期化のみを行うように修正します。

## 受け入れ条件 (Acceptance Criteria)

- [ ] `BaseAgentLLMProvider` クラスが `src/llm/providers/base.py` に定義されていること。
- [ ] `GeminiProvider` と `OpenAIProvider` が `BaseAgentLLMProvider` を継承していること。
- [ ] `GeminiProvider` と `OpenAIProvider` から重複するエージェント関連ロジックが削除されていること。
- [ ] `GeminiProvider` と `OpenAIProvider` が、それぞれのLLMクライアントの初期化のみを独自に実装していること。
- [ ] リファクタリング後も、GeminiおよびOpenAIのLLMプロバイダーが正しく機能すること（既存のテストがあればパスすること）。

## 関連ファイル (Related Files)

- `server/src/llm/providers/base.py`
- `server/src/llm/providers/gemini.py`
- `server/src/llm/providers/openai.py`
- `server/src/llm/models.py`
- `server/src/llm/tools/file_tools.py`

## 制約条件 (Constraints)

- 既存のLLMプロバイダーの外部インターフェース（`chat` メソッドのシグネチャなど）は変更しないこと。
- Langchainの既存のツール呼び出しメカニズムを維持すること。
- ログ出力の挙動は変更しないこと。

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:** LLMプロバイダーのリファクタリング計画を策定し、issueドキュメントを作成した。
- **結果:** 計画は承認され、issueドキュメントが作成された。
- **メモ:** 次のステップは、計画に基づいたコードの実装。

---

## AIへの申し送り事項 (Handover to AI)

- **現在の状況:** LLMプロバイダーのリファクタリング計画が承認され、issueドキュメントが作成されました。
- **次のアクション:** 上記「実装方針」に従い、`BaseAgentLLMProvider` の作成と、`GeminiProvider` および `OpenAIProvider` の修正を行ってください。
- **考慮事項/ヒント:** まず `base.py` に `BaseAgentLLMProvider` を追加し、その後 `gemini.py` と `openai.py` を修正するのが効率的です。修正後、既存のテストを実行して機能が損なわれていないことを確認してください。
