from langchain.tools import tool

@tool
def create_directory(name: str, path: str = "/") -> str:
    """
    新しいフォルダを作成します。

    このツールはフロントエンドでフォルダ作成を実行するためのコマンドを生成します。

    Args:
        name: 作成するフォルダの名前
        path: フォルダを作成する親ディレクトリのパス（デフォルト: "/"）

    Returns:
        フォルダ作成コマンドが生成されたことを示すメッセージ
    """
    return f"フォルダ '{name}' を '{path}' に作成するコマンドを生成しました。フロントエンドで作成が実行されます。"
