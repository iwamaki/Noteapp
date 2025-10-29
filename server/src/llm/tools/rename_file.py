from langchain.tools import tool

@tool
def rename_file(title: str, new_title: str) -> str:
    """
    ファイル名を変更します（フラット構造）。

    このツールはフロントエンドでファイル名変更を実行するためのコマンドを生成します。
    実際のファイル名変更はフロントエンドで行われます。

    Args:
        title: 現在のファイル名（例: "古い名前"）
        new_title: 新しいファイル名（例: "新しい名前"）

    Returns:
        リネームコマンドが生成されたことを示すメッセージ
    """
    return f"ファイル '{title}' を '{new_title}' に変更するコマンドを生成しました。フロントエンドで名前変更が実行されます。"
