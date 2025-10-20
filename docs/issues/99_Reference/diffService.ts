/**
 * @file diffService.ts
 * @summary このファイルは、2つのテキスト間の文字単位の差分を計算し、その結果をUI表示に適した形式で提供するサービスロジックをカプセル化します。
 * @responsibility テキストの差分計算（LCSアルゴリズムに基づく）、差分行の型定義を提供します。
 */

export interface DiffLine {
  type: 'common' | 'added' | 'deleted';
  content: string;
  originalLineNumber: number | null;
  newLineNumber: number | null;
  changeBlockId?: number | null;
}

/**
 * 文字ベースのLCS（Longest Common Subsequence）アルゴリズムを使用した差分計算
 */
const calculateCharDiff = (originalText: string, newText: string): { type: 'equal' | 'delete' | 'insert'; content: string; }[] => {
  const m = originalText.length;
  const n = newText.length;

  // LCSテーブルを構築
  const lcs: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (originalText[i - 1] === newText[j - 1]) {
        lcs[i][j] = lcs[i - 1][j - 1] + 1;
      } else {
        lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1]);
      }
    }
  }

  // バックトラッキングで差分を構築
  const changes: { type: 'equal' | 'delete' | 'insert'; content: string; }[] = [];
  let i = m, j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && originalText[i - 1] === newText[j - 1]) {
      changes.unshift({ type: 'equal', content: originalText[i - 1] });
      i--;
      j--;
    } else if (i > 0 && (j === 0 || lcs[i - 1][j] >= lcs[i][j - 1])) {
      changes.unshift({ type: 'delete', content: originalText[i - 1] });
      i--;
    } else if (j > 0) {
      changes.unshift({ type: 'insert', content: newText[j - 1] });
      j--;
    }
  }

  return changes;
};

/**
 * 2つのテキストの文字単位の差分を生成し、DiffLine配列として返す
 * @param originalText 元のテキスト
 * @param newText 新しいテキスト
 * @returns DiffLine配列
 */
export const generateDiff = (originalText: string, newText: string): DiffLine[] => {
  const normalizedOriginal = (originalText || '').replace(/\r\n/g, '\n');
  const normalizedNew = (newText || '').replace(/\r\n/g, '\n');

  // テキストが同一の場合は空配列を返す
  if (normalizedOriginal === normalizedNew) {
    return [];
  }

  // 文字レベルで差分を計算
  const charChanges = calculateCharDiff(normalizedOriginal, normalizedNew);

  if (charChanges.length === 0) {
    return [];
  }

  const diffLines: DiffLine[] = [];
  let changeBlockIdCounter = 1;
  let currentChangeBlockId: number | null = null;

  // 文字単位の差分を行単位のDiffLineに変換
  let currentLine = '';
  let currentType: 'common' | 'added' | 'deleted' =
    charChanges[0].type === 'equal' ? 'common' :
    (charChanges[0].type === 'delete' ? 'deleted' : 'added');

  for (const change of charChanges) {
    const changeType = change.type === 'equal' ? 'common' :
                      (change.type === 'delete' ? 'deleted' : 'added');

    // 改行を含む場合は分割処理
    const parts = change.content.split('\n');

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLastPart = i === parts.length - 1;

      // タイプが変わった場合、現在の行を確定
      if (changeType !== currentType && currentLine.length > 0) {
        // 変更ブロックIDの管理
        if (currentType !== 'common') {
          if (currentChangeBlockId === null) {
            currentChangeBlockId = changeBlockIdCounter++;
          }
        } else {
          currentChangeBlockId = null;
        }

        diffLines.push({
          type: currentType,
          content: currentLine,
          originalLineNumber: null,
          newLineNumber: null,
          changeBlockId: currentChangeBlockId
        });
        currentLine = '';
      }

      currentType = changeType;
      currentLine += part;

      // 改行がある場合（最後のパート以外）
      if (!isLastPart) {
        // 変更ブロックIDの管理
        if (currentType !== 'common') {
          if (currentChangeBlockId === null) {
            currentChangeBlockId = changeBlockIdCounter++;
          }
        } else {
          currentChangeBlockId = null;
        }

        diffLines.push({
          type: currentType,
          content: currentLine,
          originalLineNumber: null,
          newLineNumber: null,
          changeBlockId: currentChangeBlockId
        });
        currentLine = '';
      }
    }
  }

  // 最後の行を追加
  if (currentLine.length > 0) {
    if (currentType !== 'common') {
      if (currentChangeBlockId === null) {
        currentChangeBlockId = changeBlockIdCounter++;
      }
    } else {
      currentChangeBlockId = null;
    }

    diffLines.push({
      type: currentType,
      content: currentLine,
      originalLineNumber: null,
      newLineNumber: null,
      changeBlockId: currentChangeBlockId
    });
  }

  return diffLines;
};
