# @file config.py
# @summary LLMプロバイダーの設定と定数を定義します。
# @responsibility すべてのLLMプロバイダーで共通利用される設定値、定数を一元管理します。

from typing import Final

# Agent設定
MAX_AGENT_ITERATIONS: Final[int] = 5
"""エージェントがツールを呼び出せる最大回数"""

AGENT_VERBOSE: Final[bool] = False
"""エージェント実行時の詳細ログ出力フラグ"""

HANDLE_PARSING_ERRORS: Final[bool] = True
"""パースエラーを自動処理するかどうか"""

RETURN_INTERMEDIATE_STEPS: Final[bool] = True
"""中間ステップを返すかどうか（コマンド抽出に必要）"""

# パス設定
DEFAULT_ROOT_PATH: Final[str] = '/'
"""デフォルトのルートパス"""

# プロンプト設定
DEFAULT_SYSTEM_PROMPT: Final[str] = (
    "あなたは親切で有能なAIアシスタントです。ユーザーのノート作成と編集をサポートします。\n"
    "利用可能なツールを使って、ユーザーの要求に応えてください。\n"
    "ファイルはtitle（ファイル名）で識別します。ファイルはフラット構造で管理されており、"
    "ディレクトリやパスの概念はありません。カテゴリーやタグで分類されています。"
)
"""デフォルトのシステムプロンプト（フラット構造対応）"""

# コンテキストメッセージテンプレート
CONTEXT_MSG_EDIT_SCREEN: Final[str] = "\n\n[現在開いているファイル情報]\nファイルパス: {file_path}\n内容:\n---\n{content}\n---"
"""編集画面用のコンテキストメッセージテンプレート"""

CONTEXT_MSG_FILELIST_SCREEN: Final[str] = "\n\n[現在表示中のファイルリスト（フラット構造）]\n{file_list}"
"""ファイルリスト画面用のコンテキストメッセージテンプレート（フラット構造）"""

CONTEXT_MSG_ATTACHED_FILE: Final[str] = "\n\n[添付ファイル情報]\nファイル名: {filename}\n内容:\n---\n{content}\n---"
"""添付ファイル用のコンテキストメッセージテンプレート"""
