from typing import Any, cast

from langchain.tools import tool

from src.api.websocket import manager
from src.core.logger import logger
from src.llm.tools.context_manager import get_all_files_context, get_client_id, get_file_context


@tool
async def read_file(title: str) -> str:
    """
    指定されたファイルの内容を読み取ります（フラット構造、WebSocket経由）。

    このツールは、ファイル名（title）を指定してファイルの内容を動的に取得します。

    動作フロー:
    1. まず、現在開いているファイルかチェック（編集画面のコンテキスト）
    2. そうでない場合、WebSocket経由でフロントエンドにファイル内容をリクエスト
    3. フロントエンドはExpo FileSystemからファイルを読み取り、レスポンスを返す
    4. バックエンドはレスポンスを受け取り、LLMに内容を返す

    これにより、LLMが必要なファイルだけを動的に取得できます（効率的）。

    Args:
        title: 読み取るファイルの名前（例: "会議メモ", "新しいドキュメント"）

    Returns:
        ファイルの内容、またはファイルが見つからない/取得できない場合はエラーメッセージ
    """
    logger.info(f"read_file tool called: title={title}")

    # 1. まず、現在開いているファイルかチェック（編集画面）
    current_file_context = get_file_context()
    if current_file_context:
        current_filename = current_file_context.get('filename') or ''
        current_content = current_file_context.get('content') or ''

        # ファイル名の比較
        if title.strip() == current_filename.strip():
            logger.info(f"File content found in current context: {title}")
            if current_content:
                return f"ファイル '{current_filename}' の内容:\n\n{current_content}"
            else:
                return f"ファイル '{current_filename}' は空です。"

    # 2. allFilesコンテキストからファイルの存在を確認
    all_files = get_all_files_context()
    if not all_files:
        return f"エラー: ファイルシステム情報が利用できません。ファイル '{title}' を読み取れません。"

    # titleで検索
    file_exists = False
    file_info = None
    for f in all_files:
        if f.get('type') == 'file' and f.get('title', '').strip() == title.strip():
            file_exists = True
            file_info = f
            break

    if not file_exists:
        # ファイルが見つからない
        available_files = [f.get('title', '') for f in all_files if f.get('type') == 'file']
        return f"エラー: ファイル '{title}' が見つかりませんでした。\n\n利用可能なファイル:\n" + "\n".join(available_files[:10])

    # 3. WebSocket経由でフロントエンドにファイル内容をリクエスト
    client_id = get_client_id()
    if not client_id:
        logger.error("No client_id available for WebSocket request")
        return f"エラー: WebSocket接続が確立されていません。ファイル '{title}' を読み取れません。アプリを再起動してください。"

    try:
        logger.info(f"Requesting file content via WebSocket: title={title}, client_id={client_id}")

        # フロントエンドにリクエスト（30秒タイムアウト）
        content = await manager.request_file_content(client_id, title, timeout=30)

        if content is None or content == "":
            return f"ファイル '{title}' は空です。"

        # メタデータも含めて返す（LLMが理解しやすいように）
        result_parts = [f"ファイル '{title}' の内容:"]
        if file_info:
            category = file_info.get('category', '')
            tags: list[Any] = cast(list[Any], file_info.get('tags', []))
            if category:
                result_parts.append(f"\nカテゴリー: {category}")
            if tags:
                result_parts.append(f"\nタグ: {', '.join(tags)}")

        result_parts.append(f"\n\n{content}")

        logger.info(f"File content successfully retrieved: title={title}, length={len(content)}")
        return "".join(result_parts)

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error requesting file content: title={title}, error={error_msg}")

        # エラーメッセージをユーザーフレンドリーに変換
        if "is not connected" in error_msg:
            return f"エラー: サーバーとの接続が切断されています。ファイル '{title}' を読み取れません。\n\nアプリを再起動するか、しばらく待ってから再試行してください。"
        elif "タイムアウト" in error_msg or "Timeout" in error_msg:
            return f"エラー: ファイル '{title}' の取得がタイムアウトしました。ネットワーク接続を確認してください。"
        else:
            return f"エラー: ファイル '{title}' の取得に失敗しました: {error_msg}"
