#!/usr/bin/env python3
"""B904エラーを自動修正するスクリプト（改良版）"""
import re
import sys
from pathlib import Path

def fix_b904_in_file(file_path: Path) -> tuple[int, bool]:
    """ファイル内のB904エラーを修正

    Returns:
        (修正数, 変更有無)
    """
    try:
        content = file_path.read_text(encoding='utf-8')
    except Exception as e:
        return 0, False

    original = content
    lines = content.split('\n')
    fixed_lines = []
    exception_var = None
    in_except_block = False
    except_indent = 0
    fixes = 0

    i = 0
    while i < len(lines):
        line = lines[i]

        # exceptブロックの開始を検出
        except_match = re.match(r'(\s*)except\s+\w+\s+as\s+(\w+):', line)
        if except_match:
            except_indent = len(except_match.group(1))
            exception_var = except_match.group(2)
            in_except_block = True
            fixed_lines.append(line)
            i += 1
            continue

        # インデントが減ったらexceptブロック終了
        if in_except_block and line.strip():
            current_indent = len(line) - len(line.lstrip())
            if current_indent <= except_indent:
                in_except_block = False
                exception_var = None

        # exceptブロック内のraise文を検出
        if in_except_block and exception_var:
            # raise で始まる行を検出
            if re.match(r'\s*raise\s+\w+\(', line):
                # すでに from がある場合はスキップ
                if ' from ' in line:
                    fixed_lines.append(line)
                    i += 1
                    continue

                # 複数行のraise文を収集
                raise_lines = [line]
                j = i + 1
                # 閉じ括弧を見つけるまで収集
                paren_count = line.count('(') - line.count(')')
                while j < len(lines) and paren_count > 0:
                    raise_lines.append(lines[j])
                    paren_count += lines[j].count('(') - lines[j].count(')')
                    j += 1

                # 最後の行を修正
                if raise_lines:
                    last_line = raise_lines[-1]
                    # 最後の閉じ括弧の後に from e を追加
                    last_line = re.sub(r'(\s*\))(\s*)$', rf'\1 from {exception_var}\2', last_line)
                    raise_lines[-1] = last_line
                    fixed_lines.extend(raise_lines)
                    fixes += 1
                    i = j
                    continue

        fixed_lines.append(line)
        i += 1

    new_content = '\n'.join(fixed_lines)
    changed = new_content != original

    if changed:
        file_path.write_text(new_content, encoding='utf-8')

    return fixes, changed

def main():
    server_dir = Path('/home/iwash/02_Repository/Noteapp/server')

    # 修正対象のPythonファイルを検索（venvを除外）
    python_files = [
        f for f in server_dir.rglob('*.py')
        if 'venv' not in str(f) and '.venv' not in str(f)
    ]

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
