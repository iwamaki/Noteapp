/*
*　差分サービスのテスト
*/

import { generateDiff } from '../services/diffService';

describe('generateDiff', () => {
  it('should correctly identify added and deleted lines', () => {
    const originalText = 'a\nb\nc\nd\ne';
    const newText = 'a\nb\nX\nd\ne';
    const diff = generateDiff(originalText, newText);

    expect(diff).toEqual([
      { type: 'common', content: 'a', originalLineNumber: 1, newLineNumber: 1, changeBlockId: null },
      { type: 'common', content: 'b', originalLineNumber: 2, newLineNumber: 2, changeBlockId: null },
      { type: 'deleted', content: 'c', originalLineNumber: 3, newLineNumber: null, changeBlockId: 1 },
      { type: 'added', content: 'X', originalLineNumber: null, newLineNumber: 3, changeBlockId: 1 },
      { type: 'common', content: 'd', originalLineNumber: 4, newLineNumber: 4, changeBlockId: null },
      { type: 'common', content: 'e', originalLineNumber: 5, newLineNumber: 5, changeBlockId: null },
    ]);
  });

  it('should correctly identify added line in the middle', () => {
    const originalText = 'a\nb\nc\nd\ne';
    const newText = 'a\nb\nc\nX\nd\ne';
    const diff = generateDiff(originalText, newText);

    expect(diff).toEqual([
      { type: 'common', content: 'a', originalLineNumber: 1, newLineNumber: 1, changeBlockId: null },
      { type: 'common', content: 'b', originalLineNumber: 2, newLineNumber: 2, changeBlockId: null },
      { type: 'common', content: 'c', originalLineNumber: 3, newLineNumber: 3, changeBlockId: null },
      { type: 'added', content: 'X', originalLineNumber: null, newLineNumber: 4, changeBlockId: 1 },
      { type: 'common', content: 'd', originalLineNumber: 4, newLineNumber: 5, changeBlockId: null },
      { type: 'common', content: 'e', originalLineNumber: 5, newLineNumber: 6, changeBlockId: null },
    ]);
  });

  it('should correctly identify deleted line in the middle', () => {
    const originalText = 'a\nb\nc\nd\ne';
    const newText = 'a\nb\nd\ne';
    const diff = generateDiff(originalText, newText);

    expect(diff).toEqual([
      { type: 'common', content: 'a', originalLineNumber: 1, newLineNumber: 1, changeBlockId: null },
      { type: 'common', content: 'b', originalLineNumber: 2, newLineNumber: 2, changeBlockId: null },
      { type: 'deleted', content: 'c', originalLineNumber: 3, newLineNumber: null, changeBlockId: 1 },
      { type: 'common', content: 'd', originalLineNumber: 4, newLineNumber: 3, changeBlockId: null },
      { type: 'common', content: 'e', originalLineNumber: 5, newLineNumber: 4, changeBlockId: null },
    ]);
  });

  it('should handle multiple changes', () => {
    const originalText = 'line1\nline2\nline3\nline4\nline5';
    const newText = 'line1\nNEW_line2\nline3_MODIFIED\nline4\nNEW_line5';
    const diff = generateDiff(originalText, newText);

    expect(diff).toEqual([
      { type: 'common', content: 'line1', originalLineNumber: 1, newLineNumber: 1, changeBlockId: null },
      { type: 'deleted', content: 'line2', originalLineNumber: 2, newLineNumber: null, changeBlockId: 1 },
      { type: 'added', content: 'NEW_line2', originalLineNumber: null, newLineNumber: 2, changeBlockId: 1 },
      { type: 'deleted', content: 'line3', originalLineNumber: 3, newLineNumber: null, changeBlockId: 2 },
      { type: 'added', content: 'line3_MODIFIED', originalLineNumber: null, newLineNumber: 3, changeBlockId: 2 },
      { type: 'common', content: 'line4', originalLineNumber: 4, newLineNumber: 4, changeBlockId: null },
      { type: 'deleted', content: 'line5', originalLineNumber: 5, newLineNumber: null, changeBlockId: 3 },
      { type: 'added', content: 'NEW_line5', originalLineNumber: null, newLineNumber: 5, changeBlockId: 3 },
    ]);
  });

  it('should handle empty original text', () => {
    const originalText = '';
    const newText = 'a\nb';
    const diff = generateDiff(originalText, newText);

    expect(diff).toEqual([
      { type: 'added', content: 'a', originalLineNumber: null, newLineNumber: 1, changeBlockId: 1 },
      { type: 'added', content: 'b', originalLineNumber: null, newLineNumber: 2, changeBlockId: 1 },
    ]);
  });

  it('should handle empty new text', () => {
    const originalText = 'a\nb';
    const newText = '';
    const diff = generateDiff(originalText, newText);

    expect(diff).toEqual([
      { type: 'deleted', content: 'a', originalLineNumber: 1, newLineNumber: null, changeBlockId: 1 },
      { type: 'deleted', content: 'b', originalLineNumber: 2, newLineNumber: null, changeBlockId: 1 },
    ]);
  });

  it('should handle no changes', () => {
    const originalText = 'a\nb\nc';
    const newText = 'a\nb\nc';
    const diff = generateDiff(originalText, newText);

    expect(diff).toEqual([
      { type: 'common', content: 'a', originalLineNumber: 1, newLineNumber: 1, changeBlockId: null },
      { type: 'common', content: 'b', originalLineNumber: 2, newLineNumber: 2, changeBlockId: null },
      { type: 'common', content: 'c', originalLineNumber: 3, newLineNumber: 3, changeBlockId: null },
    ]);
  });
});
