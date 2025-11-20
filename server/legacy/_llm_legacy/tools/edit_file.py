from langchain.tools import tool


@tool
def edit_file(title: str, content: str) -> str:
    """
    ファイルの内容を編集します（フラット構造）。

    このツールはフロントエンドでファイル編集を実行するためのコマンドを生成します。
    実際のファイル編集はフロントエンドで行われます。

    Args:
        title: 編集するファイルの名前（例: "会議メモ"）
        content: ファイルの新しい内容（全文）

    Returns:
        編集コマンドが生成されたことを示すメッセージ
    """
    return f"ファイル '{title}' の編集コマンドを生成しました。フロントエンドで編集が実行されます。"
