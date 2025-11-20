from langchain.tools import tool


@tool
def create_file(title: str, content: str = "", category: str = "", tags: str = "") -> str:
    """
    新しいファイルを作成します（フラット構造）。

    このツールはフロントエンドでファイル作成を実行するためのコマンドを生成します。
    実際のファイル作成はフロントエンドで行われます。

    Args:
        title: 作成するファイルの名前（例: "会議メモ", "新しいアイデア"）
        content: ファイルの初期内容（省略可）
        category: カテゴリー（階層パス形式、例: "仕事/議事録", "研究/AI"）
        tags: タグ（カンマ区切り、例: "重要,至急"）

    Returns:
        作成コマンドが生成されたことを示すメッセージ
    """
    msg_parts = [f"ファイル '{title}' を作成するコマンドを生成しました。"]

    if category:
        msg_parts.append(f"カテゴリー: {category}")
    if tags:
        msg_parts.append(f"タグ: {tags}")

    msg_parts.append("フロントエンドでファイル作成が実行されます。")

    return " ".join(msg_parts)
