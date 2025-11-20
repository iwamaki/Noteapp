#!/usr/bin/env python3
"""B904エラーを自動修正するスクリプト"""
import re
import sys
from pathlib import Path

def fix_b904_in_file(file_path: Path) -> tuple[int, bool]:
    """ファイル内のB904エラーを修正

    Returns:
        (修正数, 変更有無)
    """
    content = file_path.read_text(encoding='utf-8')
    original = content

    # exceptブロック内のraiseを検出して修正
    # パターン: except ... as <var>: に続く raise文
    lines = content.split('\n')
    fixed_lines = []
    exception_var = None
    in_except_block = False
    except_indent = 0
    fixes = 0

    for i, line in enumerate(lines):
        # exceptブロックの開始を検出
        except_match = re.match(r'(\s*)except\s+\w+\s+as\s+(\w+):', line)
        if except_match:
            except_indent = len(except_match.group(1))
            exception_var = except_match.group(2)
            in_except_block = True
            fixed_lines.append(line)
            continue

        # インデントが減ったらexceptブロック終了
        if in_except_block:
            current_indent = len(line) - len(line.lstrip())
            if line.strip() and current_indent <= except_indent:
                in_except_block = False
                exception_var = None

        # exceptブロック内のraise文を修正
        if in_except_block and exception_var:
            # raise HTTPException(...) や raise ValueError(...) などを検出
            # すでに from がある場合はスキップ
            if re.search(r'raise\s+\w+\([^)]*\)\s*$', line) and ' from ' not in line:
                line = line.rstrip() + f' from {exception_var}'
                fixes += 1

        fixed_lines.append(line)

    new_content = '\n'.join(fixed_lines)
    changed = new_content != original

    if changed:
        file_path.write_text(new_content, encoding='utf-8')

    return fixes, changed

def main():
    server_dir = Path('/home/iwash/02_Repository/Noteapp/server')

    # 修正対象のPythonファイルを検索
    python_files = list(server_dir.rglob('*.py'))

    total_fixes = 0
    changed_files = 0

    for py_file in python_files:
        try:
            fixes, changed = fix_b904_in_file(py_file)
            if changed:
                total_fixes += fixes
                changed_files += 1
                print(f"Fixed {fixes} errors in {py_file.relative_to(server_dir)}")
        except Exception as e:
            print(f"Error processing {py_file}: {e}", file=sys.stderr)

    print(f"\nTotal: Fixed {total_fixes} errors in {changed_files} files")

if __name__ == '__main__':
    main()
