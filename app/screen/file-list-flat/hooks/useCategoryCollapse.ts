/**
 * @file useCategoryCollapse.ts
 * @summary カテゴリーの展開/折りたたみ状態管理hooks
 * @description
 * 階層的なカテゴリー表示における展開/折りたたみ機能を提供。
 * - 展開状態の管理
 * - 親カテゴリーが折りたたまれた場合の子カテゴリー非表示
 * - 初回ロード時の全ルートカテゴリー自動展開
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { FileCategorySectionHierarchical } from '@data/core/typesFlat';
import { logger } from '../../../utils/logger';

interface UseCategoryCollapseProps {
  sections: FileCategorySectionHierarchical[];
}

interface UseCategoryCollapseReturn {
  expandedCategories: Set<string>;
  handleToggleCategory: (fullPath: string) => void;
  visibleSections: FileCategorySectionHierarchical[];
}

/**
 * カテゴリーの展開/折りたたみ状態を管理するカスタムhook
 *
 * @param sections - 全カテゴリーセクションの配列
 * @returns 展開状態、トグル関数、表示対象セクション
 *
 * @example
 * const { expandedCategories, handleToggleCategory, visibleSections } = useCategoryCollapse({
 *   sections: allSections,
 * });
 *
 * @remarks
 * - 初回ロード時に全ルートカテゴリー（parent === null）を自動展開
 * - 親が折りたたまれている場合、その子孫カテゴリーは自動的に非表示
 * - visibleSections は親の展開状態に基づいてフィルタリング済み
 */
export const useCategoryCollapse = ({
  sections,
}: UseCategoryCollapseProps): UseCategoryCollapseReturn => {
  // 展開状態を管理（Set<fullPath>）
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  /**
   * カテゴリーの展開/折りたたみを切り替え
   */
  const handleToggleCategory = useCallback((fullPath: string) => {
    logger.info('file', `Toggling category: ${fullPath}`);
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(fullPath)) {
        next.delete(fullPath);
      } else {
        next.add(fullPath);
      }
      return next;
    });
  }, []);

  /**
   * 初回データロード時に全ルートカテゴリーを展開状態にする
   */
  useEffect(() => {
    if (sections.length > 0 && expandedCategories.size === 0) {
      const rootCategories = sections
        .filter(s => s.parent === null)
        .map(s => s.fullPath);
      logger.info('file', `Auto-expanding ${rootCategories.length} root categories`);
      setExpandedCategories(new Set(rootCategories));
    }
  }, [sections, expandedCategories.size]);

  /**
   * 表示するセクションのフィルタリング（折りたたみ対応）
   * 親が折りたたまれている場合、その子カテゴリーは非表示にする
   */
  const visibleSections = useMemo(() => {
    return sections.filter(section => {
      // ルートカテゴリーは常に表示
      if (section.parent === null) {
        return true;
      }

      // 親が展開されているかチェック（再帰的に全ての祖先をチェック）
      let currentParent: string | null = section.parent;
      while (currentParent !== null) {
        if (!expandedCategories.has(currentParent)) {
          return false; // 親が折りたたまれているので非表示
        }
        // さらに上の親をチェック
        const parentSection = sections.find(s => s.fullPath === currentParent);
        currentParent = parentSection ? parentSection.parent : null;
      }

      return true;
    });
  }, [sections, expandedCategories]);

  return {
    expandedCategories,
    handleToggleCategory,
    visibleSections,
  };
};
