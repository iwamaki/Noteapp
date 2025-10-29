/**
 * @file useFlatListContext.ts
 * @summary フラットリストContextのカスタムフック
 */

import { useContext } from 'react';
import { FlatListContext } from './FlatListContext';

/**
 * フラットリストContextを使用するカスタムフック
 *
 * @throws Providerの外で使用された場合はエラー
 */
export const useFlatListContext = () => {
  const context = useContext(FlatListContext);

  if (context === undefined) {
    throw new Error(
      'useFlatListContext must be used within a FlatListProvider'
    );
  }

  return context;
};
