/**
 * 差分計算サービス
 * 2つのテキスト間の差分を計算する純粋なロジックを提供します。
 */

export interface DiffLine {
  type: 'common' | 'added' | 'deleted';
  content: string;
  originalLineNumber: number | null;
  newLineNumber: number | null;
  changeBlockId: number | null;
}

/**
 * 2つのテキストの差分を生成する
 * @param originalText 元のテキスト
 * @param newText 新しいテキスト
 * @returns 差分行の配列
 */
export const generateDiff = (originalText: string, newText: string): DiffLine[] => {
  const originalLines = (originalText || '').split('\n');
  const newLines = (newText || '').split('\n');

  const lcs = computeLCS(originalLines, newLines);

  const diff: DiffLine[] = [];
  let originalIndex = 0;
  let newIndex = 0;
  let lcsIndex = 0;
  let changeBlockId = 0;
  let inChangeBlock = false;

  while (originalIndex < originalLines.length || newIndex < newLines.length) {
    const originalLine = originalLines[originalIndex];
    const newLine = newLines[newIndex];

    if (
      lcsIndex < lcs.length &&
      originalLine === lcs[lcsIndex] &&
      newLine === lcs[lcsIndex]
    ) {
      // Common line
      diff.push({
        type: 'common',
        content: originalLine,
        originalLineNumber: originalIndex + 1,
        newLineNumber: newIndex + 1,
        changeBlockId: null,
      });
      originalIndex++;
      newIndex++;
      lcsIndex++;
      inChangeBlock = false;
    } else {
      if (!inChangeBlock) {
        changeBlockId++;
        inChangeBlock = true;
      }
      const lookaheadOriginal = originalLines.slice(originalIndex).indexOf(lcs[lcsIndex]);
      const lookaheadNew = newLines.slice(newIndex).indexOf(lcs[lcsIndex]);

      const isOriginalNext = lcsIndex < lcs.length ? lookaheadOriginal !== -1 : false;
      const isNewNext = lcsIndex < lcs.length ? lookaheadNew !== -1 : false;

      if (isOriginalNext && (!isNewNext || lookaheadOriginal <= lookaheadNew)) {
        diff.push({
          type: 'deleted',
          content: originalLine,
          originalLineNumber: originalIndex + 1,
          newLineNumber: null,
          changeBlockId: changeBlockId,
        });
        originalIndex++;
      } else if (isNewNext && (!isOriginalNext || lookaheadNew < lookaheadOriginal)) {
        diff.push({
          type: 'added',
          content: newLine,
          originalLineNumber: null,
          newLineNumber: newIndex + 1,
          changeBlockId: changeBlockId,
        });
        newIndex++;
      } else {
        if (originalIndex < originalLines.length) {
          diff.push({
            type: 'deleted',
            content: originalLine,
            originalLineNumber: originalIndex + 1,
            newLineNumber: null,
            changeBlockId: changeBlockId,
          });
          originalIndex++;
        }
        if (newIndex < newLines.length) {
          diff.push({
            type: 'added',
            content: newLine,
            originalLineNumber: null,
            newLineNumber: newIndex + 1,
            changeBlockId: changeBlockId,
          });
          newIndex++;
        }
      }
    }
  }

  return diff;
};

/**
 * LCS(最長共通部分列)を計算する
 * @param arr1 文字列の配列1
 * @param arr2 文字列の配列2
 * @returns 最長共通部分列
 */
const computeLCS = (arr1: string[], arr2: string[]): string[] => {
  const m = arr1.length;
  const n = arr2.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (arr1[i - 1] === arr2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const lcs: string[] = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (arr1[i - 1] === arr2[j - 1]) {
      lcs.unshift(arr1[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
};
