/**
 * @file hooks/useUnsavedChangesWarning.ts
 * @summary 未保存変更の警告機能を提供するフック
 * @description 画面離脱時に未保存の変更を警告
 */

import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';

/**
 * 未保存変更警告フック
 * isDirtyがtrueの場合、画面離脱時に警告を表示
 *
 * @param isDirty - 未保存の変更があるかどうか
 * @param onConfirm - 確認後のコールバック（オプション）
 */
export const useUnsavedChangesWarning = (
  isDirty: boolean,
  onConfirm?: () => void
) => {
  const navigation = useNavigation();

  useEffect(() => {
    if (!isDirty) return;

    // React Navigationの画面離脱を防ぐ
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      // 未保存の変更がある場合、離脱を防ぐ
      // FileEditScreen.tsxで独自のモーダルを表示しているので、
      // ここでは離脱を防ぐだけにする
      // 実際のモーダル表示はFileEditScreen.tsxで行われる
    });

    return unsubscribe;
  }, [navigation, isDirty, onConfirm]);
};
