from langchain.tools import tool

@tool
def delete_file(title: str) -> str:
    """
    ファイルを削除します（フラット構造）。

    このツールはフロントエンドでファイル削除を実行するためのコマンドを生成します。
    実際のファイル削除はフロントエンドで行われます。

    Args:
        title: 削除するファイルの名前（例: "古いメモ"）

    Returns:
        削除コマンドが生成されたことを示すメッセージ
    """
    return f"ファイル '{title}' を削除するコマンドを生成しました。フロントエンドで削除が実行されます。"
