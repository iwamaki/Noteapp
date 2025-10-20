from langchain.tools import tool

@tool
def move_item(source_path: str, dest_path: str) -> str:
    """
    ファイルまたはフォルダを移動します。

    このツールはフロントエンドでアイテム移動を実行するためのコマンドを生成します。

    Args:
        source_path: 移動元のアイテムのフルパス
        dest_path: 移動先のディレクトリパス

    Returns:
        移動コマンドが生成されたことを示すメッセージ
    """
    return f"アイテム '{source_path}' を '{dest_path}' に移動するコマンドを生成しました。フロントエンドで移動が実行されます。"
