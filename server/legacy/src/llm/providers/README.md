# LLM Providers Module

## 概要

このモジュールは、異なるLLMプロバイダー（Gemini、OpenAIなど）との統合を提供します。
共通のインターフェースと再利用可能なコンポーネントにより、保守性と拡張性を最大化しています。

## アーキテクチャ

### クラス構成

```
BaseLLMProvider (抽象基底クラス)
    └── BaseAgentLLMProvider (Langchainエージェント実装)
            ├── GeminiProvider
            └── OpenAIProvider
```

### 責務分離

このモジュールは、Single Responsibility Principle（単一責任の原則）に基づいて設計されています：

- **base.py**: プロバイダーの基底クラスとチャット処理のオーケストレーション
- **config.py**: 定数と設定値の一元管理
- **context_builder.py**: チャットコンテキストの構築と変換
- **command_extractor.py**: エージェント実行結果からのコマンド抽出

## コンポーネント詳細

### 1. base.py

#### BaseLLMProvider
すべてのLLMプロバイダーが実装すべき抽象インターフェース。

#### BaseAgentLLMProvider
Langchainエージェントを使用する共通実装。

**主要メソッド:**
- `chat()`: チャット処理のエントリーポイント
- `_execute_agent()`: エージェント実行
- `_build_response()`: レスポンス構築
- `_log_*()`: ログ記録ヘルパー

**プロバイダー固有の実装が必要なメソッド:**
- `_get_provider_name()`: プロバイダー名を返す
- `_create_llm_client()`: プロバイダー固有のLLMクライアントを作成

### 2. config.py

アプリケーション全体で使用される定数を定義。

**定数カテゴリー:**
- エージェント設定（最大イテレーション数、ログレベルなど）
- デフォルトパス設定
- プロンプトテンプレート

**利点:**
- 設定値の一元管理
- マジックナンバーの排除
- 変更の容易性

### 3. context_builder.py

#### ChatContextBuilder
入力されたChatContextから、LLMとツールに必要なコンテキストを構築。

**責務:**
- アクティブスクリーン（Edit/Filelist）からのコンテキスト抽出
- フォールバック用の古い形式のサポート
- ツール用のグローバルコンテキスト設定
- LLM用の会話履歴構築

**主要メソッド:**
- `build()`: コンテキスト構築のエントリーポイント
- `_setup_edit_screen_context()`: 編集画面用コンテキスト設定
- `_setup_filelist_screen_context()`: ファイルリスト画面用コンテキスト設定

**戻り値:**
- `BuiltContext`: 構築されたコンテキスト情報を保持するデータクラス

### 4. command_extractor.py

#### AgentCommandExtractor
エージェント実行結果から、フロントエンドで実行すべきコマンドを抽出・変換。

**責務:**
- ツール呼び出し情報の解析
- LLMCommandオブジェクトへの変換
- 拡張可能なハンドラー登録システム

**サポートされるコマンド:**
- `edit_file`: ファイル編集
- `create_directory`: ディレクトリ作成
- `move_item`: アイテム移動
- `delete_item`: アイテム削除

**拡張方法:**
```python
extractor = AgentCommandExtractor()
extractor.register_handler('new_tool', handler_function)
```

## 処理フロー

```
1. ユーザーリクエスト受信
   ↓
2. ChatContextBuilder でコンテキスト構築
   - ファイル/ディレクトリコンテキスト設定
   - 会話履歴の変換
   ↓
3. エージェント実行
   - Langchain AgentExecutor による処理
   ↓
4. AgentCommandExtractor でコマンド抽出
   - ツール呼び出しを LLMCommand に変換
   ↓
5. ChatResponse 構築と返却
```

## 新しいプロバイダーの追加方法

新しいLLMプロバイダーを追加する場合は、以下の手順を実行してください：

### 1. プロバイダークラスの作成

```python
from src.llm.providers.base import BaseAgentLLMProvider

class NewProvider(BaseAgentLLMProvider):
    def _get_provider_name(self) -> str:
        return "new_provider"

    def _create_llm_client(self, api_key: str, model: str):
        # プロバイダー固有のLLMクライアント初期化
        from langchain_new_provider import ChatNewProvider
        return ChatNewProvider(api_key=api_key, model=model)
```

### 2. （オプション）システムプロンプトのカスタマイズ

プロバイダー固有のプロンプトが必要な場合：

```python
def _get_system_prompt(self) -> str:
    return "カスタムプロンプト..."
```

### 3. プロバイダーの登録

ファクトリーメソッドやDIコンテナに新しいプロバイダーを登録します。

## 新しいツールコマンドの追加方法

新しいツールをサポートする場合：

### 1. ツール定義の追加
`src/llm/tools/` にツール定義を追加

### 2. コマンドハンドラーの登録

```python
def _handle_new_tool(tool_input: Dict[str, Any]) -> Optional[LLMCommand]:
    return LLMCommand(
        action='new_tool_action',
        path=tool_input.get('path'),
        # その他のパラメータ
    )

# command_extractor.py に登録
extractor.register_handler('new_tool', _handle_new_tool)
```

### 3. LLMCommand モデルの拡張（必要に応じて）
`src/llm/models.py` でLLMCommandに新しいフィールドを追加

## テスト戦略

各コンポーネントは独立してテスト可能です：

### ChatContextBuilder のテスト
```python
def test_edit_screen_context():
    builder = ChatContextBuilder()
    context = ChatContext(activeScreen=EditScreenContext(...))
    result = builder.build(context)
    assert result.has_file_context == True
```

### AgentCommandExtractor のテスト
```python
def test_command_extraction():
    extractor = AgentCommandExtractor()
    result = {"intermediate_steps": [...]}
    commands = extractor.extract_commands(result)
    assert len(commands) == expected_count
```

## 設計の利点

### 1. 保守性
- 各クラスが単一の責務を持つ
- 変更の影響範囲が明確
- コードの理解が容易

### 2. 拡張性
- 新しいプロバイダーの追加が容易
- 新しいツールコマンドの追加が容易
- プラグイン的な拡張が可能

### 3. テスト可能性
- 各コンポーネントが独立してテスト可能
- モックやスタブの作成が容易
- 統合テストと単体テストの分離が明確

### 4. 可読性
- chatメソッドが簡潔で処理フローが明確
- 複雑なロジックが適切に分離
- ドキュメント化された責務

## パフォーマンス考慮事項

- **コンテキスト構築**: O(n) where n = 会話履歴とファイルリストの合計
- **コマンド抽出**: O(m) where m = intermediate_stepsの数
- **メモリ使用**: ファイルコンテンツのサイズに依存

## 今後の改善案

1. **キャッシング**: コンテキストビルダーでの結果キャッシュ
2. **並列処理**: 複数のツール呼び出しの並列実行
3. **ストリーミング**: レスポンスのストリーミング対応
4. **メトリクス**: より詳細なパフォーマンスメトリクスの収集
5. **エラーリカバリー**: より高度なエラーハンドリングとリトライロジック

## トラブルシューティング

### コンテキストが正しく設定されない
- `logger.info()` の出力を確認
- `ChatContext` の構造が期待通りか確認
- `activeScreen` の型が正しいか確認

### コマンドが抽出されない
- `intermediate_steps` の内容をログで確認
- ツール名が `_handlers` に登録されているか確認
- ツール入力の形式が期待通りか確認

### プロバイダーが正しく動作しない
- `_create_llm_client()` の実装を確認
- APIキーと認証情報を確認
- Langchainのバージョン互換性を確認
