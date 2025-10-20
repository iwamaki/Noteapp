from langchain.tools import tool

@tool
def edit_file(filename: str, content: str) -> str:
    """
    ファイルの内容を編集します。

    このツールはフロントエンドでファイル編集を実行するためのコマンドを生成します。
    実際のファイル編集はフロントエンドで行われます。

    Args:
        filename: 編集するファイルのパス（例: "note.txt"）
        content: ファイルの新しい内容（全文）

    Returns:
        編集コマンドが生成されたことを示すメッセージ
    """
    return f"ファイル '{filename}' の編集コマンドを生成しました。フロントエンドで編集が実行されます。"
