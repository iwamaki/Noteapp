/**
 * 差分計算サービス
 * 2つのテキスト間の差分を計算する純粋なロジックを提供します。
 */
import { diff_match_patch, DIFF_DELETE, DIFF_INSERT, DIFF_EQUAL } from 'diff-match-patch';

export interface DiffLine {
  type: 'common' | 'added' | 'deleted' | 'hunk-header';
  content: string;
  originalLineNumber: number | null;
  newLineNumber: number | null;
  changeBlockId?: number | null;
}

/**
 * 2つのテキストの差分を生成する（Git Unified Diff形式）
 * 行ベースでの差分を計算し、文字レベルの分割問題を回避
 * @param originalText 元のテキスト
 * @param newText 新しいテキスト
 * @param contextLines コンテキスト行数（デフォルト: 3）
 * @returns 差分行の配列
 */
export const generateDiff = (originalText: string, newText: string, contextLines: number = 3): DiffLine[] => {
  const dmp = new diff_match_patch();
  const diffs = dmp.diff_main(originalText || '', newText || '');
  dmp.diff_cleanupSemantic(diffs);

  const originalLines = (originalText || '').split('\n');
  const newLines = (newText || '').split('\n');
  const diffLines: DiffLine[] = [];

  let originalLineNumber = 1;
  let newLineNumber = 1;
  let changeBlockId = 1;

  // diff-match-patchの結果を行単位に変換
  const lineChanges: { type: 'equal' | 'delete' | 'insert'; content: string; }[] = [];

  for (const [op, text] of diffs) {
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (i === lines.length - 1 && line === '' && text.endsWith('\n')) {
        continue; // 最後の空行は無視
      }

      const changeType = op === DIFF_EQUAL ? 'equal' : op === DIFF_DELETE ? 'delete' : 'insert';
      lineChanges.push({ type: changeType, content: line });
    }
  }

  // 変更ブロック（ハンク）を特定
  const hunks: { start: number; end: number; originalStart: number; newStart: number; originalCount: number; newCount: number; }[] = [];
  let currentHunk: { start: number; end: number; } | null = null;

  for (let i = 0; i < lineChanges.length; i++) {
    const change = lineChanges[i];
    if (change.type !== 'equal') {
      if (currentHunk === null) {
        currentHunk = { start: Math.max(0, i - contextLines), end: i };
      }
      currentHunk.end = Math.min(lineChanges.length - 1, i + contextLines);
    } else if (currentHunk !== null) {
      // 等価行が続く場合、コンテキスト行数以上離れていればハンクを終了
      let nextChangeIndex = -1;
      for (let j = i + 1; j < lineChanges.length; j++) {
        if (lineChanges[j].type !== 'equal') {
          nextChangeIndex = j;
          break;
        }
      }

      if (nextChangeIndex === -1 || nextChangeIndex > i + contextLines * 2) {
        // ハンクを終了
        currentHunk.end = Math.min(lineChanges.length - 1, i + contextLines);

        // ハンクの行数を計算
        let originalCount = 0;
        let newCount = 0;
        let originalStart = originalLineNumber;
        let newStart = newLineNumber;
        let tempOrigLine = 1;
        let tempNewLine = 1;

        for (let j = 0; j < currentHunk.start; j++) {
          if (lineChanges[j].type === 'equal' || lineChanges[j].type === 'delete') tempOrigLine++;
          if (lineChanges[j].type === 'equal' || lineChanges[j].type === 'insert') tempNewLine++;
        }
        originalStart = tempOrigLine;
        newStart = tempNewLine;

        for (let j = currentHunk.start; j <= currentHunk.end; j++) {
          if (lineChanges[j].type === 'equal' || lineChanges[j].type === 'delete') originalCount++;
          if (lineChanges[j].type === 'equal' || lineChanges[j].type === 'insert') newCount++;
        }

        hunks.push({
          start: currentHunk.start,
          end: currentHunk.end,
          originalStart,
          newStart,
          originalCount,
          newCount
        });

        currentHunk = null;
      }
    }
  }

  // 最後のハンクが残っている場合
  if (currentHunk !== null) {
    let originalCount = 0;
    let newCount = 0;
    let originalStart = 1;
    let newStart = 1;
    let tempOrigLine = 1;
    let tempNewLine = 1;

    for (let j = 0; j < currentHunk.start; j++) {
      if (lineChanges[j].type === 'equal' || lineChanges[j].type === 'delete') tempOrigLine++;
      if (lineChanges[j].type === 'equal' || lineChanges[j].type === 'insert') tempNewLine++;
    }
    originalStart = tempOrigLine;
    newStart = tempNewLine;

    for (let j = currentHunk.start; j <= currentHunk.end; j++) {
      if (lineChanges[j].type === 'equal' || lineChanges[j].type === 'delete') originalCount++;
      if (lineChanges[j].type === 'equal' || lineChanges[j].type === 'insert') newCount++;
    }

    hunks.push({
      start: currentHunk.start,
      end: currentHunk.end,
      originalStart,
      newStart,
      originalCount,
      newCount
    });
  }

  // ハンクがない場合は空配列を返す
  if (hunks.length === 0) {
    return [];
  }

  // ハンクごとに差分行を生成
  for (const hunk of hunks) {
    // ハンクヘッダーを追加
    const hunkHeader = `@@ -${hunk.originalStart},${hunk.originalCount} +${hunk.newStart},${hunk.newCount} @@`;
    diffLines.push({
      type: 'hunk-header',
      content: hunkHeader,
      originalLineNumber: null,
      newLineNumber: null,
      changeBlockId: null
    });

    // ハンク内の行を処理
    let origLineNum = hunk.originalStart;
    let newLineNum = hunk.newStart;
    let currentChangeBlockId: number | null = null;

    for (let i = hunk.start; i <= hunk.end; i++) {
      const change = lineChanges[i];

      switch (change.type) {
        case 'equal':
          diffLines.push({
            type: 'common',
            content: change.content,
            originalLineNumber: origLineNum++,
            newLineNumber: newLineNum++,
            changeBlockId: null
          });
          currentChangeBlockId = null;
          break;
        case 'delete':
          if (currentChangeBlockId === null) {
            currentChangeBlockId = changeBlockId++;
          }
          diffLines.push({
            type: 'deleted',
            content: change.content,
            originalLineNumber: origLineNum++,
            newLineNumber: null,
            changeBlockId: currentChangeBlockId
          });
          break;
        case 'insert':
          if (currentChangeBlockId === null) {
            currentChangeBlockId = changeBlockId++;
          }
          diffLines.push({
            type: 'added',
            content: change.content,
            originalLineNumber: null,
            newLineNumber: newLineNum++,
            changeBlockId: currentChangeBlockId
          });
          break;
      }
    }
  }

  return diffLines;
};