/**
 *  差分表示ユーティリティ
 *  差分表示に関する各種機能を提供します。
 */

export interface DiffLine {
  type: 'common' | 'added' | 'deleted';
  content: string;
  originalLineNumber: number | null;
  newLineNumber: number | null;
  changeBlockId: number | null;
}

export interface DiffViewProps {
  diff: DiffLine[];
  selectedBlocks: Set<number>;
  onBlockToggle: (blockId: number) => void;
  onAllToggle: () => void;
  onApply: () => void;
  onCancel: () => void;
}

/**
 * 差分管理クラス
 */
export class DiffManager {
  private static selectedBlocks = new Set<number>();

  static getSelectedBlocks(): Set<number> {
    return this.selectedBlocks;
  }

  static initializeDiff(diff: DiffLine[]): void {
    this.selectedBlocks.clear();

    if (diff) {
      const changeBlocks = new Set<number>();
      diff.forEach((line) => {
        if (line.changeBlockId !== null) {
          changeBlocks.add(line.changeBlockId);
        }
      });
      this.selectedBlocks = changeBlocks;
    }
  }

  static toggleBlockSelection(blockId: number): void {
    if (this.selectedBlocks.has(blockId)) {
      this.selectedBlocks.delete(blockId);
    } else {
      this.selectedBlocks.add(blockId);
    }
  }

  static toggleAllSelection(diff: DiffLine[]): void {
    const allChangeBlocks = new Set<number>();
    diff?.forEach((line) => {
      if (line.changeBlockId !== null) {
        allChangeBlocks.add(line.changeBlockId);
      }
    });

    const allSelected = allChangeBlocks.size > 0 &&
      [...allChangeBlocks].every(blockId => this.selectedBlocks.has(blockId));

    this.selectedBlocks.clear();

    if (!allSelected) {
      this.selectedBlocks = new Set(allChangeBlocks);
    }
  }

  static generateSelectedContent(diff: DiffLine[]): string | null {
    if (!diff) return null;

    const newLines: string[] = [];

    diff.forEach((line) => {
      switch (line.type) {
        case 'common':
          newLines.push(line.content);
          break;
        case 'added':
          if (line.changeBlockId !== null && this.selectedBlocks.has(line.changeBlockId)) {
            newLines.push(line.content);
          }
          break;
        case 'deleted':
          if (line.changeBlockId === null || !this.selectedBlocks.has(line.changeBlockId)) {
            newLines.push(line.content);
          }
          break;
      }
    });

    return newLines.join('\n');
  }

  static reset(): void {
    this.selectedBlocks.clear();
  }
}

// 差分生成ユーティリティクラス
export class DiffUtils {
  /**
   * 2つのテキストの差分を生成する
   */
  static generateDiff(originalText: string, newText: string): DiffLine[] {
    const originalLines = (originalText || '').split('\n');
    const newLines = (newText || '').split('\n');

    const lcs = this.computeLCS(originalLines, newLines);

    const diff: DiffLine[] = [];
    let originalIndex = 0;
    let newIndex = 0;
    let lcsIndex = 0;
    let changeBlockId = 0;

    while (originalIndex < originalLines.length || newIndex < newLines.length) {
      const originalLine = originalLines[originalIndex];
      const newLine = newLines[newIndex];
      const commonLine = lcs[lcsIndex];

      if (originalLine === commonLine && newLine === commonLine) {
        diff.push({
          type: 'common',
          content: originalLine,
          originalLineNumber: originalIndex + 1,
          newLineNumber: newIndex + 1,
          changeBlockId: null
        });
        originalIndex++;
        newIndex++;
        lcsIndex++;
      } else if (originalLine === commonLine) {
        diff.push({
          type: 'added',
          content: newLine,
          originalLineNumber: null,
          newLineNumber: newIndex + 1,
          changeBlockId: changeBlockId
        });
        newIndex++;
        changeBlockId++;
      } else if (newLine === commonLine) {
        diff.push({
          type: 'deleted',
          content: originalLine,
          originalLineNumber: originalIndex + 1,
          newLineNumber: null,
          changeBlockId: changeBlockId
        });
        originalIndex++;
        changeBlockId++;
      } else {
        const currentBlockId = changeBlockId;

        if (originalIndex < originalLines.length) {
          diff.push({
            type: 'deleted',
            content: originalLine,
            originalLineNumber: originalIndex + 1,
            newLineNumber: null,
            changeBlockId: currentBlockId
          });
          originalIndex++;
        }
        if (newIndex < newLines.length) {
          diff.push({
            type: 'added',
            content: newLine,
            originalLineNumber: null,
            newLineNumber: newIndex + 1,
            changeBlockId: currentBlockId
          });
          newIndex++;
        }
        changeBlockId++;
      }
    }

    return diff;
  }

  /**
   * LCS(最長共通部分列)を計算する
   */
  private static computeLCS(arr1: string[], arr2: string[]): string[] {
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
  }
}