from langchain.tools import tool

@tool
def delete_item(path: str) -> str:
    """
    ファイルまたはフォルダを削除します。

    このツールはフロントエンドでアイテム削除を実行するためのコマンドを生成します。

    Args:
        path: 削除するアイテムのフルパス

    Returns:
        削除コマンドが生成されたことを示すメッセージ
    """
    return f"アイテム '{path}' を削除するコマンドを生成しました。フロントエンドで削除が実行されます。"
