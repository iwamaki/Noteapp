/**
 * @file diffService.ts
 * @summary このファイルは、2つのテキスト間の文字単位の差分を計算し、その結果をUI表示に適した形式で提供するサービスロジックをカプセル化します。
 * @responsibility テキストの差分計算（LCSアルゴリズムに基づく）、差分行の型定義、および生成された差分データの整合性検証を行います。
 */

/**
 * 文字レベルの変更情報を表すインターフェース
 */
export interface InlineChange {
  type: 'equal' | 'delete' | 'insert';
  content: string;
  startIndex: number;
  endIndex: number;
}

export interface DiffLine {
  type: 'common' | 'added' | 'deleted';
  content: string;
  originalLineNumber: number | null;
  newLineNumber: number | null;
  changeBlockId?: number | null;

  // 新規追加: 文字レベル差分情報（変更された行の詳細を表示するため）
  inlineChanges?: InlineChange[];
}

/**
 * データ整合性を検証する（文字ベース差分用）
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
    }
  });

  const reconstructedOriginalText = reconstructedOriginal.join('\n');
  const reconstructedNewText = reconstructedNew.join('\n');

  const normalizedOriginal = (originalText || '').replace(/\r\n/g, '\n');
  const normalizedNew = (newText || '').replace(/\r\n/g, '\n');

  if (reconstructedOriginalText !== normalizedOriginal) {
    return { isValid: false, error: `元テキストの再構築に失敗: 期待値と実際値が不一致` };
  }

  if (reconstructedNewText !== normalizedNew) {
    return { isValid: false, error: `新テキストの再構築に失敗: 期待値と実際値が不一致` };
  }

  return { isValid: true };
};

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
 * 文字レベル差分をInlineChange配列に変換する
 * @param charChanges 文字レベルの差分結果
 * @returns InlineChange配列
 */
const convertToInlineChanges = (charChanges: { type: 'equal' | 'delete' | 'insert'; content: string; }[]): InlineChange[] => {
  const inlineChanges: InlineChange[] = [];
  let currentIndex = 0;

  for (const change of charChanges) {
    const startIndex = currentIndex;
    const endIndex = startIndex + change.content.length;

    inlineChanges.push({
      type: change.type,
      content: change.content,
      startIndex,
      endIndex
    });

    // delete の場合はインデックスを進めない（削除された文字はターゲット文字列に存在しないため）
    if (change.type !== 'delete') {
      currentIndex = endIndex;
    }
  }

  return inlineChanges;
};

/**
 * 2つのテキストのハイブリッド差分を生成し、DiffLine配列として返す
 * 行ベースの差分を基本とし、変更された行については文字レベルの詳細情報も提供する
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

  // Phase 1: 行レベルで差分を計算
  const originalLines = normalizedOriginal.split('\n');
  const newLines = normalizedNew.split('\n');
  const lineChanges = calculateLineDiff(originalLines, newLines);

  const diffLines: DiffLine[] = [];
  let changeBlockIdCounter = 1;
  let origLineNum = 1;
  let newLineNum = 1;

  let i = 0;
  while (i < lineChanges.length) {
    const change = lineChanges[i];

    if (change.type === 'equal') {
      // 共通行はそのまま追加
      diffLines.push({
        type: 'common',
        content: change.content,
        originalLineNumber: origLineNum++,
        newLineNumber: newLineNum++,
        changeBlockId: null
      });
      i++;
    } else {
      // Phase 2: 変更ブロックの検出と処理
      const currentChangeBlockId = changeBlockIdCounter++;
      const deletedLines: string[] = [];
      const addedLines: string[] = [];
      const deletedLineNumbers: number[] = [];
      const addedLineNumbers: number[] = [];

      // 連続する削除・追加行を収集
      let j = i;
      while (j < lineChanges.length && lineChanges[j].type !== 'equal') {
        const currentChange = lineChanges[j];
        if (currentChange.type === 'delete') {
          deletedLines.push(currentChange.content);
          deletedLineNumbers.push(origLineNum++);
        } else if (currentChange.type === 'insert') {
          addedLines.push(currentChange.content);
          addedLineNumbers.push(newLineNum++);
        }
        j++;
      }

      // Phase 3: 削除行と追加行のペアリングと文字レベル差分の適用
      const minLength = Math.min(deletedLines.length, addedLines.length);

      // ペアになる行については文字レベル差分を計算
      for (let k = 0; k < minLength; k++) {
        const deletedLine = deletedLines[k];
        const addedLine = addedLines[k];

        // 文字レベル差分を計算
        const charChanges = calculateCharDiff(deletedLine, addedLine);
        const inlineChanges = convertToInlineChanges(charChanges);

        // 削除行を追加（文字レベル詳細付き）
        diffLines.push({
          type: 'deleted',
          content: deletedLine,
          originalLineNumber: deletedLineNumbers[k],
          newLineNumber: null,
          changeBlockId: currentChangeBlockId,
          inlineChanges: inlineChanges.filter(c => c.type !== 'insert')
        });

        // 追加行を追加（文字レベル詳細付き）
        diffLines.push({
          type: 'added',
          content: addedLine,
          originalLineNumber: null,
          newLineNumber: addedLineNumbers[k],
          changeBlockId: currentChangeBlockId,
          inlineChanges: inlineChanges.filter(c => c.type !== 'delete')
        });
      }

      // ペアにならない残りの削除行（行全体が削除）
      for (let k = minLength; k < deletedLines.length; k++) {
        diffLines.push({
          type: 'deleted',
          content: deletedLines[k],
          originalLineNumber: deletedLineNumbers[k],
          newLineNumber: null,
          changeBlockId: currentChangeBlockId
          // inlineChangesは設定しない（行全体が削除のため）
        });
      }

      // ペアにならない残りの追加行（行全体が追加）
      for (let k = minLength; k < addedLines.length; k++) {
        diffLines.push({
          type: 'added',
          content: addedLines[k],
          originalLineNumber: null,
          newLineNumber: addedLineNumbers[k],
          changeBlockId: currentChangeBlockId
          // inlineChangesは設定しない（行全体が追加のため）
        });
      }

      i = j; // 次の処理は変更ブロックの次から
    }
  }

  return diffLines;
};