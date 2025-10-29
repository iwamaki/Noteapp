/**
 * @file FlatListContext.tsx
 * @summary フラットリスト用のContext
 */

import { createContext } from 'react';
import { FlatListContextType } from './types';

/**
 * フラットリストContext
 */
export const FlatListContext = createContext<FlatListContextType | undefined>(
  undefined
);
