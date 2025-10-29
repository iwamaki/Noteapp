---
filename:  00_llm_context_misinterpretation # "[id]_[issueのタイトル]"
id: 0 # issueのユニークID
status: new # new | in-progress | blocked | pending-review | done
priority: medium # A:high | B:medium | C:low
attempt_count: 0 # このissueへの挑戦回数。失敗のたびにインクリメントする
tags: [LLM, prompt, context] # 例: [UI, navigation, bug]
---

## 概要 (Overview)

LLMへのプロンプト送信時、動的に追加されるコンテキスト情報（ファイル内容、ファイルリストなど）がユーザーの実際のチャットメッセージと連続した`HumanMessage`として扱われるため、LLMがこれらを連結された単一のメッセージとして誤解釈する可能性がある。これにより、LLMがユーザーの意図を正確に把握できない場合がある。

## 背景 (Background)

LLMプロバイダー（特にGemini）のAPI制約により、動的に追加されるコンテキスト情報は`SystemMessage`としてではなく`HumanMessage`として会話履歴に挿入されている。このため、LLMに送信されるメッセージシーケンスにおいて、コンテキスト情報を示す`HumanMessage`と、その後に続くユーザーの実際の質問を示す`HumanMessage`が連続して出現する。LLMがこれらの連続する`HumanMessage`を区別せず、一つの長いユーザー発言として処理してしまうことで、コンテキスト情報と実際の質問の境界が曖昧になり、LLMの応答精度に影響を与える可能性がある。

## 実装方針 (Implementation Strategy)

LLMが動的コンテキスト情報をより適切に解釈できるよう、`HumanMessage`として送信されるコンテキストメッセージの**内容**の調整を検討する。LLMがコンテキストブロックとユーザーの実際の質問を明確に区別し、意図を正確に把握できるようにするための様々なプロンプトエンジニアリング手法を模索する。これには、明確な区切り文字の導入、コンテキスト内での明示的な指示の追加、情報のフォーマット改善などが含まれる可能性があるが、最適なアプローチはさらなる検討と検証が必要である。

## 受け入れ条件 (Acceptance Criteria)

- [ ] LLMが動的コンテキスト情報とユーザーの実際の質問を明確に区別して応答できること。
- [ ] LLMがコンテキスト情報をユーザーの質問の一部として連結して解釈する挙動が改善されること。
- [ ] 提案されたプロンプト調整が、LLMの応答の関連性や正確性を向上させること。

## 関連ファイル (Related Files)

- `server/src/llm/providers/config.py` (動的コンテキストメッセージのテンプレート定義)
- `server/src/llm/providers/base.py` (プロンプトテンプレートの構築)
- `server/src/llm/providers/context_builder.py` (動的コンテキストメッセージの生成と会話履歴への追加)

## 制約条件 (Constraints)

- Gemini APIの制約により、動的コンテキストメッセージは`HumanMessage`として送信する必要がある。`SystemMessage`として直接送信することはできない。

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:** LLMへのプロンプト構造の分析。動的コンテキストが`HumanMessage`として追加されていることを確認。
- **結果:** LLMがコンテキストとユーザーメッセージを連結して解釈する可能性が示唆された。
- **メモ:** `HumanMessage`のコンテンツを調整することで、LLMの解釈を改善できる可能性がある。

---

## AIへの申し送り事項 (Handover to AI)

- **現在の状況:** LLMが動的コンテキストとユーザーメッセージを誤解釈する問題が特定された。原因は、API制約により動的コンテキストが`HumanMessage`として送信されていることにある。
- **次のアクション:** `HumanMessage`として送信される動的コンテキストメッセージの**内容**を最適化するためのプロンプトエンジニアリング手法を検討し、実装案を提案する。特に、LLMがコンテキスト情報とユーザーの実際の質問を明確に区別できるよう、様々なアプローチを評価する。
- **考慮事項/ヒント:** `server/src/llm/providers/config.py`内のコンテキストメッセージテンプレートが主な調整対象となる。最適な解決策を見つけるために、複数のプロンプト調整案を比較検討することが望ましい。
