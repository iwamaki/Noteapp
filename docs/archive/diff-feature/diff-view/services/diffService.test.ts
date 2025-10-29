/**
 * @file diffService.test.ts
 * @summary Test suite for hybrid diff implementation
 */

import { generateDiff, validateDataConsistency, DiffLine } from './diffService';

describe('Hybrid Diff Implementation', () => {
  describe('Line-level changes', () => {
    test('should detect line deletion', () => {
      const original = 'これは削除される行';
      const newText = '';
      const diff = generateDiff(original, newText);

      expect(diff).toHaveLength(1);
      expect(diff[0].type).toBe('deleted');
      expect(diff[0].content).toBe('これは削除される行');
      expect(diff[0].originalLineNumber).toBe(1);
      expect(diff[0].newLineNumber).toBeNull();
    });

    test('should detect line addition', () => {
      const original = '';
      const newText = 'これは追加される行';
      const diff = generateDiff(original, newText);

      expect(diff).toHaveLength(1);
      expect(diff[0].type).toBe('added');
      expect(diff[0].content).toBe('これは追加される行');
      expect(diff[0].originalLineNumber).toBeNull();
      expect(diff[0].newLineNumber).toBe(1);
    });

    test('should handle no changes', () => {
      const original = 'これは変更されない行';
      const newText = 'これは変更されない行';
      const diff = generateDiff(original, newText);

      expect(diff).toHaveLength(0);
    });
  });

  describe('Character-level inline changes', () => {
    test('should detect character addition within line', () => {
      const original = 'これは追加される""';
      const newText = 'これは追加される"文字"';
      const diff = generateDiff(original, newText);

      expect(diff).toHaveLength(2); // One deleted, one added

      const deletedLine = diff.find(d => d.type === 'deleted');
      const addedLine = diff.find(d => d.type === 'added');

      expect(deletedLine).toBeDefined();
      expect(addedLine).toBeDefined();

      // Check for inline changes
      expect(addedLine?.inlineChanges).toBeDefined();
      const insertChanges = addedLine?.inlineChanges?.filter(c => c.type === 'insert');
      expect(insertChanges?.some(c => c.content === '文字')).toBeTruthy();
    });

    test('should detect character deletion within line', () => {
      const original = 'これは削除される"文字"';
      const newText = 'これは削除される""';
      const diff = generateDiff(original, newText);

      expect(diff).toHaveLength(2);

      const deletedLine = diff.find(d => d.type === 'deleted');
      const addedLine = diff.find(d => d.type === 'added');

      expect(deletedLine).toBeDefined();
      expect(deletedLine?.inlineChanges).toBeDefined();

      const deleteChanges = deletedLine?.inlineChanges?.filter(c => c.type === 'delete');
      expect(deleteChanges?.some(c => c.content === '文字')).toBeTruthy();
    });

    test('should detect character replacement', () => {
      const original = 'これは変更される"文字"';
      const newText = 'これは変更される"学業"';
      const diff = generateDiff(original, newText);

      expect(diff).toHaveLength(2);

      const deletedLine = diff.find(d => d.type === 'deleted');
      const addedLine = diff.find(d => d.type === 'added');

      // Deleted line should have "文字" marked as deleted
      const deleteChanges = deletedLine?.inlineChanges?.filter(c => c.type === 'delete');
      expect(deleteChanges?.some(c => c.content === '文字')).toBeTruthy();

      // Added line should have "学業" marked as inserted
      const insertChanges = addedLine?.inlineChanges?.filter(c => c.type === 'insert');
      expect(insertChanges?.some(c => c.content === '学業')).toBeTruthy();
    });
  });

  describe('Line fragmentation prevention', () => {
    test('should NOT fragment lines with internal changes', () => {
      const original = 'これは削除される"文字"です';
      const newText = 'これは削除される""です';
      const diff = generateDiff(original, newText);

      // Should have exactly 2 lines (1 deleted, 1 added), not fragmented into more
      expect(diff).toHaveLength(2);

      // Each line should contain the full content
      const deletedLine = diff.find(d => d.type === 'deleted');
      const addedLine = diff.find(d => d.type === 'added');

      expect(deletedLine?.content).toBe('これは削除される"文字"です');
      expect(addedLine?.content).toBe('これは削除される""です');

      // Should have inline changes marking the differences
      expect(deletedLine?.inlineChanges).toBeDefined();
      expect(addedLine?.inlineChanges).toBeDefined();
    });

    test('should maintain line numbers correctly', () => {
      const original = `行1
削除される行
共通の行
変更前の文字`;
      const newText = `行1
追加される行
共通の行
変更後の文字`;

      const diff = generateDiff(original, newText);

      // Check that line numbers are sequential and correct
      const origLineNumbers = diff
        .filter(d => d.originalLineNumber !== null)
        .map(d => d.originalLineNumber);
      const newLineNumbers = diff
        .filter(d => d.newLineNumber !== null)
        .map(d => d.newLineNumber);

      // Line numbers should be in order
      for (let i = 1; i < origLineNumbers.length; i++) {
        expect(origLineNumbers[i]! >= origLineNumbers[i-1]!).toBeTruthy();
      }
      for (let i = 1; i < newLineNumbers.length; i++) {
        expect(newLineNumbers[i]! >= newLineNumbers[i-1]!).toBeTruthy();
      }
    });
  });

  describe('Data consistency validation', () => {
    test('should validate single line changes', () => {
      const testCases = [
        { original: 'これは削除される行', newText: '' },
        { original: '', newText: 'これは追加される行' },
        { original: 'これは変更される"文字"', newText: 'これは変更される"学業"' },
      ];

      testCases.forEach(({ original, newText }) => {
        const diff = generateDiff(original, newText);
        const validation = validateDataConsistency(original, newText, diff);

        expect(validation.isValid).toBeTruthy();
        expect(validation.error).toBeUndefined();
      });
    });

    test('should validate multi-line changes', () => {
      const original = `行1
行2
行3`;
      const newText = `行1
新行2
行3
行4`;

      const diff = generateDiff(original, newText);
      const validation = validateDataConsistency(original, newText, diff);

      expect(validation.isValid).toBeTruthy();
      expect(validation.error).toBeUndefined();
    });

    test('should handle empty texts', () => {
      const diff = generateDiff('', '');
      const validation = validateDataConsistency('', '', diff);

      expect(diff).toHaveLength(0);
      expect(validation.isValid).toBeTruthy();
    });
  });

  describe('Change block management', () => {
    test('should assign change block IDs to consecutive changes', () => {
      const original = `行1
削除行1
削除行2
共通行
変更前`;
      const newText = `行1
追加行1
追加行2
共通行
変更後`;

      const diff = generateDiff(original, newText);

      // Find the first change block
      const changeBlockLines = diff.filter(d => d.changeBlockId !== null);
      const blockIds = new Set(changeBlockLines.map(d => d.changeBlockId));

      // Should have change blocks
      expect(blockIds.size).toBeGreaterThan(0);

      // Lines in the same change block should be consecutive
      blockIds.forEach(blockId => {
        const blockLines = diff.filter(d => d.changeBlockId === blockId);
        const indices = blockLines.map(line => diff.indexOf(line));

        for (let i = 1; i < indices.length; i++) {
          expect(indices[i]).toBe(indices[i-1] + 1);
        }
      });
    });
  });
});