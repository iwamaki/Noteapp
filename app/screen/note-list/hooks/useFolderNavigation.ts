/**
 * @file useFolderNavigation.ts
 * @summary フォルダナビゲーション用のフック
 * @responsibility 現在のフォルダパスの管理とナビゲーション機能を提供
 */

import { useState, useCallback } from 'react';
import { PathUtils } from '../utils/pathUtils';

export const useFolderNavigation = () => {
  const [currentPath, setCurrentPath] = useState<string>('/');

  // フォルダに移動
  const navigateToFolder = useCallback((path: string) => {
    setCurrentPath(PathUtils.normalizePath(path));
  }, []);

  // 親フォルダに移動
  const navigateToParent = useCallback(() => {
    const parentPath = PathUtils.getParentPath(currentPath);
    setCurrentPath(parentPath);
  }, [currentPath]);

  // ルートに移動
  const navigateToRoot = useCallback(() => {
    setCurrentPath('/');
  }, []);

  // 現在のフォルダ名を取得
  const getCurrentFolderName = useCallback(() => {
    return PathUtils.getFolderName(currentPath);
  }, [currentPath]);

  // パンくずリストを取得
  const getBreadcrumbs = useCallback(() => {
    if (currentPath === '/') {
      return [{ name: 'ルート', path: '/' }];
    }

    const parts = currentPath.slice(1, -1).split('/');
    const breadcrumbs = [{ name: 'ルート', path: '/' }];

    let accumulatedPath = '';
    parts.forEach(part => {
      accumulatedPath += `/${part}`;
      breadcrumbs.push({
        name: part,
        path: `${accumulatedPath}/`,
      });
    });

    return breadcrumbs;
  }, [currentPath]);

  // 親フォルダがあるかどうか
  const hasParent = useCallback(() => {
    return currentPath !== '/';
  }, [currentPath]);

  return {
    currentPath,
    navigateToFolder,
    navigateToParent,
    navigateToRoot,
    getCurrentFolderName,
    getBreadcrumbs,
    hasParent,
  };
};
