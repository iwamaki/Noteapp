/**
 * @file diffService.ts
 * @summary このファイルは、2つのテキスト間の差分を計算し、その結果を構造化された形式で提供するサービスロジックをカプセル化します。
 * 主に、GitのUnified Diff形式に似た行ベースの差分を生成し、データの整合性検証機能を提供します。
 * @responsibility テキストの差分計算（LCSアルゴリズムに基づく）、差分行の型定義、および生成された差分データの整合性検証を行います。
 * これにより、変更履歴の表示や適用などの機能で利用される差分情報の正確性と信頼性を保証します。
 */

export interface DiffLine {
  type: 'common' | 'added' | 'deleted' | 'hunk-header';
  content: string;
  originalLineNumber: number | null;
  newLineNumber: number | null;
  changeBlockId?: number | null;
}

/**
 * データ整合性を検証する
 * @param originalText 元のテキスト
 * @param newText 新しいテキスト
 * @param diffLines 生成された差分行
 * @returns 整合性チェック結果
 */
export const validateDataConsistency = (originalText: string, newText: string, diffLines: DiffLine[]): { isValid: boolean; error?: string } => {
  // 差分から元テキストを再構築
  const reconstructedOriginal: string[] = [];
  const reconstructedNew: string[] = [];

  diffLines.forEach(line => {
    switch (line.type) {
      case 'common':
        reconstructedOriginal.push(line.content);
        reconstructedNew.push(line.content);
        break;
      case 'deleted':
        reconstructedOriginal.push(line.content);
        break;
      case 'added':
        reconstructedNew.push(line.content);
        break;
      case 'hunk-header':
        // ハンクヘッダーは無視
        break;
    }
  });

  const reconstructedOriginalText = reconstructedOriginal.join('\n');
  const reconstructedNewText = reconstructedNew.join('\n');

  if (reconstructedOriginalText !== originalText) {
    return { isValid: false, error: `元テキストの再構築に失敗: 期待値と実際値が不一致` };
  }

  if (reconstructedNewText !== newText) {
    return { isValid: false, error: `新テキストの再構築に失敗: 期待値と実際値が不一致` };
  }

  return { isValid: true };
};

/**
 * 2つのテキストの差分を生成する（Git Unified Diff形式）
 * 行ベースでの差分を計算し、文字レベルの分割問題を回避
 * @param originalText 元のテキスト
 * @param newText 新しいテキスト
 * @returns 差分行の配列
 */
/**
 * 行ベースのLCS（Longest Common Subsequence）アルゴリズムを使用した差分計算
 */
const calculateLineDiff = (originalLines: string[], newLines: string[]): { type: 'equal' | 'delete' | 'insert'; content: string; }[] => {
  const m = originalLines.length;
  const n = newLines.length;

  // LCSテーブルを構築
  const lcs: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (originalLines[i - 1] === newLines[j - 1]) {
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
    if (i > 0 && j > 0 && originalLines[i - 1] === newLines[j - 1]) {
      changes.unshift({ type: 'equal', content: originalLines[i - 1] });
      i--;
      j--;
    } else if (i > 0 && (j === 0 || lcs[i - 1][j] >= lcs[i][j - 1])) {
      changes.unshift({ type: 'delete', content: originalLines[i - 1] });
      i--;
    } else if (j > 0) {
      changes.unshift({ type: 'insert', content: newLines[j - 1] });
      j--;
    }
  }

  return changes;
};

export const generateDiff = (originalText: string, newText: string): DiffLine[] => {
  // 入力テキストの正規化
  const normalizedOriginal = (originalText || '').replace(/\r\n/g, '\n');
  const normalizedNew = (newText || '').replace(/\r\n/g, '\n');

  // テキストが同一の場合は空配列を返す
  if (normalizedOriginal === normalizedNew) {
    return [];
  }

  // 行ベースで差分を計算（文字レベル処理を完全に排除）
  const originalLines = normalizedOriginal.split('\n');
  const newLines = normalizedNew.split('\n');

  // LCSアルゴリズムで行レベル差分を計算
  const lineChanges = calculateLineDiff(originalLines, newLines);

  // ハンクを使わず、全ての行を差分に含める（簡略化）
  const diffLines: DiffLine[] = [];
  let changeBlockId = 1;
  let origLineNum = 1;
  let newLineNum = 1;
  let currentChangeBlockId: number | null = null;

  // 全ての行変更を差分行に変換
  for (const change of lineChanges) {
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

  return diffLines;
};