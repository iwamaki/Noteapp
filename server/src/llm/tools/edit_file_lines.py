from langchain.tools import tool

@tool
def edit_file_lines(title: str, start_line: int, end_line: int, content: str) -> str:
    """
    ファイルの特定の行範囲を編集します（部分編集）。

    このツールは大きなファイルの一部だけを編集する際に便利です。
    ファイル全体を書き換える必要がなく、トークン消費を削減できます。

    このツールはフロントエンドでファイル編集を実行するためのコマンドを生成します。
    実際のファイル編集はフロントエンドで行われます。

    Args:
        title: 編集するファイルの名前（例: "会議メモ"）
        start_line: 編集開始行（1から始まる、この行を含む）
        end_line: 編集終了行（1から始まる、この行を含む）
        content: 新しい内容（複数行の場合は改行を含む文字列）

    Returns:
        編集コマンドが生成されたことを示すメッセージ

    Examples:
        - 3行目から5行目を置換: edit_file_lines("メモ.txt", 3, 5, "新しい3行目\\n新しい4行目\\n新しい5行目")
        - 1行だけ置換: edit_file_lines("メモ.txt", 10, 10, "新しい10行目")
        - 行を削除: edit_file_lines("メモ.txt", 3, 5, "")
    """
    line_count = end_line - start_line + 1
    return f"ファイル '{title}' の{start_line}行目から{end_line}行目（{line_count}行）を編集するコマンドを生成しました。フロントエンドで編集が実行されます。"
