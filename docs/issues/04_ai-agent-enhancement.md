---
filename: 04_ai-agent-enhancement
id: 4
status: new
priority: medium
attempt_count: 0
tags: [llm, agent, tools, thinking-mode, search, enhancement]
---

## 概要 (Overview)

現在のチャット機能（CRUD操作、WebSocket対応read_fileツール）をベースに、より高度で柔軟なAIエージェントシステムへと発展させる。具体的には、(1) 検索機能の追加、(2) 拡張思考モード（extended thinking）の実装、(3) ツールシステムの多様化・拡張性向上を目指す。

## 背景 (Background)

WebSocket対応により、LLMが動的にファイル内容を取得できるようになりました。これにより、以下のような次のステップが見えてきました：

1. **検索の必要性**: ファイルが増えると、「どのファイルに何が書いてあるか」を効率的に探す必要がある
2. **思考の深さ**: 複雑なタスク（リファクタリング、バグ修正、設計提案）では、AIの思考プロセスをユーザーに見せることが有用
3. **ツールの柔軟性**: 現在のツールは基本的なCRUD操作のみ。より多様な操作（検索、diff、統計など）が必要

Claude Code、Cursor、Windsurf等の先進的なAIエージェントシステムは、以下のような特徴を持っています：
- **リッチなツールセット**: コード検索、シンボル解析、依存関係グラフなど
- **マルチステップ推論**: 複雑なタスクを段階的に分解して実行
- **拡張思考モード**: Anthropic Extended Thinkingを活用した深い推論

## 実装方針 (Implementation Strategy)

### 1. 検索機能の追加

**目的**: ファイル横断検索、内容検索、タグ/カテゴリ検索を可能にする

**アプローチ案**:
- **ツール追加**: `search_files`ツールを実装
  - 引数: `query`（検索クエリ）、`search_type`（"title" | "content" | "tag" | "category"）
  - WebSocket経由でフロントエンドに検索リクエスト
  - フロントエンドはExpo FileSystemで全ファイルをスキャン、結果を返す
- **段階的実装**:
  1. まずタイトル検索（既存のallFilesから検索）
  2. 次に内容検索（WebSocket経由）
  3. 最後にタグ/カテゴリ検索

**参考実装**:
- Claude Code の `Grep` ツール
- Cursor の codebase-wide search

### 2. 拡張思考モード (Extended Thinking)

**目的**: 複雑なタスクに対して、AIが深く思考し、推論プロセスを可視化する

**アプローチ案**:
- **Anthropic Extended Thinking API の活用**:
  - モデル: `claude-3-7-sonnet-20250219` (extended thinking対応)
  - `thinking` ブロックをユーザーに表示（折りたたみ可能なUI）
  - 通常モードと思考モードを切り替え可能にする

- **実装レイヤー**:
  ```
  Frontend UI:
    - トグルスイッチ（通常モード/思考モード）
    - 思考ブロックの表示エリア（展開/折りたたみ）

  Backend:
    - `src/llm/models.py`: ChatRequestに`thinking_mode: bool`追加
    - `src/llm/agents/chat_agent.py`: thinking modeでモデル切り替え
    - thinking blockのパース・整形処理
  ```

- **UI/UX考慮点**:
  - 思考モードはデフォルトOFF（コスト削減）
  - 複雑なタスク時にユーザーが手動でON
  - 思考ブロックは折りたたまれた状態でレンダリング
  - 思考時間の表示（ユーザー体験向上）

**参考**:
- Anthropic Extended Thinking ドキュメント
- Claude Code の思考プロセス表示

### 3. ツールシステムの多様化・拡張性向上

**目的**: より多様なツールを追加し、AIの能力を拡張する。ツールの追加が容易な設計にする。

**追加候補ツール**:
- `search_files`: ファイル検索（上記）
- `get_file_metadata`: ファイルのメタ情報取得（作成日、更新日、サイズ、タグ、カテゴリ）
- `list_recent_files`: 最近編集したファイルのリスト
- `get_file_diff`: ファイルの変更履歴（バージョン間の差分）
- `analyze_structure`: ディレクトリ構造の解析・可視化
- `count_statistics`: 統計情報（ファイル数、総文字数、カテゴリ別集計など）

**拡張性向上のアプローチ**:
- **プラグイン的な設計**:
  ```python
  # server/src/llm/tools/base.py
  class BaseTool:
      def __init__(self):
          pass

      @property
      def name(self) -> str:
          raise NotImplementedError

      @property
      def description(self) -> str:
          raise NotImplementedError

      async def execute(self, **kwargs) -> str:
          raise NotImplementedError

  # server/src/llm/tools/registry.py
  class ToolRegistry:
      def __init__(self):
          self.tools = {}

      def register(self, tool: BaseTool):
          self.tools[tool.name] = tool

      def get_all_tools(self) -> list:
          return list(self.tools.values())
  ```

- **フロントエンド・バックエンドの連携強化**:
  - WebSocket経由で新しいツール用のメッセージタイプを追加
  - `message.type` に応じてフロントエンドが適切に処理
  - バックエンドは汎用的なリクエスト/レスポンス処理

- **設定ファイルでツールを管理**:
  ```yaml
  # tools.yaml
  tools:
    - name: read_file
      enabled: true
      timeout: 30
    - name: search_files
      enabled: true
      timeout: 60
    - name: extended_thinking
      enabled: false  # デフォルトOFF
  ```

**参考実装**:
- LangChain の Tool 抽象化
- Claude Code のツール設計
- OpenAI Function Calling パターン

### 4. マルチステップ推論・エージェントループ

**目的**: 複雑なタスクを自動的に分解し、ツールを組み合わせて実行する

**アプローチ案**:
- **ReAct (Reasoning + Acting) パターン**:
  1. Thought: タスクを理解し、次の行動を計画
  2. Action: ツールを実行
  3. Observation: 結果を観察
  4. Repeat: 必要に応じて繰り返し
  5. Final Answer: 最終結果を返す

- **実装**:
  ```python
  # server/src/llm/agents/react_agent.py
  class ReActAgent:
      async def run(self, user_query: str, max_iterations: int = 10):
          for i in range(max_iterations):
              # 1. LLMに思考・行動を生成させる
              response = await self.llm.generate(...)

              # 2. ツール呼び出しがあるか確認
              if response.tool_calls:
                  results = await self.execute_tools(response.tool_calls)
                  # 結果をコンテキストに追加して次のイテレーション
              else:
                  # 最終回答
                  return response.content
  ```

- **UI表示**:
  - 各ステップをリアルタイムでストリーミング表示
  - 「思考中...」「ファイル検索中...」などの状態表示
  - プログレスインジケーター

**参考**:
- LangChain Agent Executor
- AutoGPT のタスク分解アプローチ

## 受け入れ条件 (Acceptance Criteria)

このissueは段階的に実装するため、以下のマイルストーンに分割できます。

### Phase 1: 検索機能
- [ ] `search_files`ツールの実装（タイトル検索）
- [ ] WebSocket経由での検索リクエスト/レスポンス
- [ ] UIでの検索結果表示
- [ ] 内容検索の実装

### Phase 2: 拡張思考モード
- [ ] Extended Thinking対応モデルの統合
- [ ] thinking blockのパース・表示
- [ ] UIでのモード切り替え機能
- [ ] 思考プロセスの可視化

### Phase 3: ツール拡張
- [ ] ツールレジストリの設計・実装
- [ ] 最低3つの新規ツール追加（metadata, recent_files, statistics）
- [ ] ツール設定ファイルの導入

### Phase 4: マルチステップ推論
- [ ] ReActパターンの実装
- [ ] エージェントループの動作確認
- [ ] ステップごとのUI表示

## 関連ファイル (Related Files)

### バックエンド
- `server/src/llm/tools/` - ツール実装
- `server/src/llm/agents/chat_agent.py` - エージェント本体
- `server/src/llm/models.py` - リクエスト/レスポンスモデル
- `server/src/api/websocket.py` - WebSocket通信

### フロントエンド
- `app/features/chat/` - チャット画面
- `app/features/chat/services/websocketService.ts` - WebSocketクライアント
- `app/features/chat/llmService/index.ts` - LLM API呼び出し

## 制約条件 (Constraints)

- **コスト管理**: Extended Thinking モードはコストが高いため、デフォルトOFF
- **レスポンス速度**: マルチステップ推論は時間がかかるため、タイムアウト設定が重要
- **UI/UX**: 複雑な処理でもユーザーに状態を分かりやすく伝える
- **後方互換性**: 既存のツール（read_file, create_file等）の動作に影響を与えないこと
- **モバイル制約**: Expo環境での実行を前提とする（ネイティブモジュールは慎重に）

## 開発ログ (Development Log)

---
### 試行 #1

（未着手）

---

## AIへの申し送り事項 (Handover to AI)

このissueは今後の発展方向を示すアドバイス的なドキュメントです。実装は段階的に進めることを推奨します。

### 推奨される実装順序

1. **まず検索機能から着手**:
   - 既存のread_fileツールと同じパターンで実装できる
   - WebSocket通信の仕組みは既に整っている
   - ユーザーにとって即座に価値がある機能

2. **次に拡張思考モード**:
   - Anthropic APIの機能なので、統合は比較的容易
   - UIの工夫が重要（思考ブロックの表示方法）
   - コスト管理の仕組みを忘れずに

3. **ツール拡張の基盤整備**:
   - ツールレジストリパターンの導入
   - 新規ツールの追加が容易になる設計
   - 将来的な拡張性を確保

4. **最後にマルチステップ推論**:
   - 最も複雑な機能
   - 他の機能が整ってから取り組む方が良い

### 参考リソース

- [Anthropic Extended Thinking](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking)
- [LangChain Tools](https://python.langchain.com/docs/modules/agents/tools/)
- [ReAct Pattern](https://arxiv.org/abs/2210.03629)
- Claude Code のツール実装（オープンソース部分）

### 注意事項

- このissueは大規模な機能追加のため、複数のissueに分割することを検討してください
- 各フェーズは独立したブランチで開発し、段階的にマージすることを推奨
- ユーザーフィードバックを得ながら優先順位を調整してください

---

**最終更新**: 2025-10-29
