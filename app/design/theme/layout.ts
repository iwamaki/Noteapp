import { Dimensions, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export const Layout = {
  window: {
    width,
    height,
  },
  isSmallDevice: width < 375,
  // Add other common layout values here
};

export const useAppLayout = () => {
  const insets = useSafeAreaInsets();

  // Estimate status bar height (can be more precise with StatusBar.currentHeight on Android)
  const statusBarHeight = Platform.select({
    ios: insets.top,
    android: StatusBar.currentHeight || insets.top, // StatusBar.currentHeight is more accurate on Android
    default: insets.top,
  });

  // Estimate bottom navigation bar height (if applicable, often corresponds to bottom inset)
  const bottomNavBarHeight = insets.bottom;

  return {
    ...Layout,
    insets,
    statusBarHeight,
    bottomNavBarHeight,
    // You can add more derived layout values here
  };
};
