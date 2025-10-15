import { Dimensions, Platform, StatusBar, AppState, AppStateStatus, PixelRatio, Appearance, ColorSchemeName, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { logger } from './logger'; // Import logger
import { useEffect, useState } from 'react';

const { width, height } = Dimensions.get('window');
const { width: screenWidth, height: screenHeight } = Dimensions.get('screen');

export const Layout = {
  window: {
    width,
    height,
  },
  screen: {
    width: screenWidth,
    height: screenHeight,
  },
  isSmallDevice: width < 375,
  pixelRatio: PixelRatio.get(),
  fontScale: PixelRatio.getFontScale(),
  isPortrait: height >= width,
  isLandscape: width > height,
  os: Platform.OS,
  osVersion: Platform.Version,
  isPad: Platform.OS === 'ios' ? Platform.isPad : false,
  isTV: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.isTV : false, // isTV is available on iOS and Android, but more relevant for tvOS
  // Add other common layout values here
};

export const usePlatformInfo = () => {
  const insets = useSafeAreaInsets();
  const [colorScheme, setColorScheme] = useState(Appearance.getColorScheme());
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Estimate status bar height (can be more precise with StatusBar.currentHeight on Android)
  const statusBarHeight = Platform.select({
    ios: insets.top,
    android: StatusBar.currentHeight || insets.top, // StatusBar.currentHeight is more accurate on Android
    default: insets.top,
  });

  useEffect(() => {
    const keyboardWillShowSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardWillHideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShowSub.remove();
      keyboardWillHideSub.remove();
    };
  }, []);

  // Estimate bottom navigation bar height (if applicable, often corresponds to bottom inset)
  const bottomNavBarHeight = insets.bottom;

  const logPlatformInfo = (trigger: string, currentColorScheme: string | null | undefined) => {
    const formattedPlatformInfo = `Window Width: ${Math.round(width)}, Window Height: ${Math.round(height)}, Screen Width: ${Math.round(screenWidth)}, Screen Height: ${Math.round(screenHeight)}, Is Small Device: ${Layout.isSmallDevice}, Pixel Ratio: ${Layout.pixelRatio.toFixed(2)}, Font Scale: ${Layout.fontScale.toFixed(2)}, Is Portrait: ${Layout.isPortrait}, Is Landscape: ${Layout.isLandscape}, OS: ${Layout.os}, OS Version: ${Layout.osVersion}, Is Pad: ${Layout.isPad}, Is TV: ${Layout.isTV}, Status Bar Height: ${Math.round(statusBarHeight)}, Bottom Nav Bar Height: ${Math.round(bottomNavBarHeight)}, Insets Top: ${Math.round(insets.top)}, Insets Bottom: ${Math.round(insets.bottom)}, Insets Left: ${Math.round(insets.left)}, Insets Right: ${Math.round(insets.right)}, Color Scheme: ${currentColorScheme}, Keyboard Height: ${Math.round(keyboardHeight)}`;

    logger.debug('platformInfo', `usePlatformInfo Info (${trigger}): ${formattedPlatformInfo}`);
  };

  useEffect(() => {
    // Log once on initial mount
    logPlatformInfo('initial_mount', colorScheme);

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        const currentSystemColorScheme = Appearance.getColorScheme();
        setColorScheme(currentSystemColorScheme);
        logPlatformInfo('app_active', currentSystemColorScheme);
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    const handleColorSchemeChange = ({ colorScheme: newColorScheme }: { colorScheme: ColorSchemeName }) => {
      setColorScheme(newColorScheme);
      logPlatformInfo('color_scheme_change', newColorScheme);
    };

    const colorSchemeSubscription = Appearance.addChangeListener(handleColorSchemeChange);

    return () => {
      appStateSubscription.remove();
      colorSchemeSubscription.remove();
    };
  }, [colorScheme]); // Re-run effect if colorScheme changes to update logPlatformInfo closure

  return {
    ...Layout,
    insets,
    statusBarHeight,
    bottomNavBarHeight,
    colorScheme,
    keyboardHeight,
    // You can add more derived layout values here
  };
};
