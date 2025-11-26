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

# 会話要約設定
MAX_CONVERSATION_TOKENS: Final[int] = 4000
"""会話履歴の推奨最大トークン数（この値を超えると要約が推奨される）"""

PRESERVE_RECENT_MESSAGES: Final[int] = 3
"""要約時に保持する最新メッセージ数"""

# 文書要約設定
MIN_DOCUMENT_CONTENT_LENGTH: Final[int] = 100
"""文書要約に必要な最小文字数"""

# ツール有効/無効設定
TOOLS_ENABLED: Final[dict[str, bool]] = {
    "create_file": True,          # ファイル作成ツール
    "edit_file": True,            # ファイル編集ツール（全体置換）
    "edit_file_lines": True,      # ファイル編集ツール（行単位）
    "read_file": True,            # ファイル読み込みツール
    "delete_file": True,          # ファイル削除ツール
    "rename_file": True,          # ファイルリネームツール
    "search_files": True,         # ファイル検索ツール
    "web_search": True,           # Web検索ツール
    "web_search_with_rag": True,  # Web検索+RAGツール
    "search_knowledge_base": True # ナレッジベース検索ツール
}
"""各ツールの有効/無効設定。Falseに設定するとLLMがそのツールを認識できなくなります。"""
