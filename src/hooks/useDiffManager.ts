import { useState, useMemo, useCallback } from 'react';
import { DiffLine } from '../services/diffService';

export const useDiffManager = (diff: DiffLine[]) => {
  // 差分ブロックの全IDを取得
  const allChangeBlockIds = useMemo(() => {
    const blockIds = new Set<number>();
    diff.forEach(line => {
      if (line.changeBlockId !== null && line.changeBlockId !== undefined) {
        blockIds.add(line.changeBlockId);
      }
    });
    return blockIds;
  }, [diff]);

  // 選択されたブロックの状態
  const [selectedBlocks, setSelectedBlocks] = useState<Set<number>>(allChangeBlockIds);

  // ブロックの選択をトグルする
  const toggleBlockSelection = useCallback((blockId: number) => {
    setSelectedBlocks(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(blockId)) {
        newSelected.delete(blockId);
      } else {
        newSelected.add(blockId);
      }
      return newSelected;
    });
  }, []);

  // すべてのブロックの選択をトグルする
  const toggleAllSelection = useCallback(() => {
    setSelectedBlocks(prevSelected => {
      if (prevSelected.size === allChangeBlockIds.size) {
        // すべて選択されている場合はすべて解除
        return new Set<number>();
      } else {
        // それ以外の場合はすべて選択
        return new Set(allChangeBlockIds);
      }
    });
  }, [allChangeBlockIds]);

  // 選択された内容から新しいコンテンツを生成する
  const generateSelectedContent = useCallback(() => {
    const newLines: string[] = [];
    diff.forEach(line => {
      switch (line.type) {
        case 'common':
          newLines.push(line.content);
          break;
        case 'added':
          if (line.changeBlockId !== null && line.changeBlockId !== undefined && selectedBlocks.has(line.changeBlockId)) {
            newLines.push(line.content);
          }
          break;
        case 'deleted':
          // 選択されていない削除ブロックは元のコンテンツとして残す
          if (line.changeBlockId === null || line.changeBlockId === undefined || !selectedBlocks.has(line.changeBlockId)) {
            newLines.push(line.content);
          }
          break;
        case 'hunk-header':
          // ハンクヘッダーは無視
          break;
      }
    });
    return newLines.join('\n');
  }, [diff, selectedBlocks]);

  return {
    selectedBlocks,
    toggleBlockSelection,
    toggleAllSelection,
    generateSelectedContent,
    allChangeBlockIds,
  };
};
