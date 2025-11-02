/**
 * @file responsive.ts
 * @summary このファイルは、画面サイズに応じたレスポンシブデザインのユーティリティを提供します。
 * @responsibility 異なる画面サイズに対応するための値の計算と、画面サイズの判定機能を提供します。
 */
import { Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const responsive = {
  screenWidth,
  screenHeight,
  isSmallScreen: screenWidth < 375,
  isMediumScreen: screenWidth >= 375 && screenWidth < 414,
  isLargeScreen: screenWidth >= 414,
  getResponsiveSize: (small: number, medium: number, large: number) => {
    if (screenWidth < 375) return small;
    if (screenWidth < 414) return medium;
    return large;
  },
};
