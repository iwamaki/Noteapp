import { Dimensions, Platform, StatusBar, AppState, AppStateStatus, PixelRatio, Appearance, ColorSchemeName, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { logger } from './logger';
import { useEffect, useState } from 'react';

// ===== 定数定義 =====
const { width, height } = Dimensions.get('window');
const { width: screenWidth, height: screenHeight } = Dimensions.get('screen');

// ===== レイアウト情報 =====
export const Layout = {
  window: { width, height },
  screen: { width: screenWidth, height: screenHeight },
  isSmallDevice: width < 375,
  pixelRatio: PixelRatio.get(),
  fontScale: PixelRatio.getFontScale(),
  isPortrait: height >= width,
  isLandscape: width > height,
  os: Platform.OS,
  osVersion: Platform.Version,
  isPad: Platform.OS === 'ios' ? Platform.isPad : false,
  isTV: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.isTV : false,
};

// ===== ヘルパー関数 =====
const getStatusBarHeight = (insets: any): number => {
  return Platform.select({
    ios: insets.top,
    android: StatusBar.currentHeight || insets.top,
    default: insets.top,
  }) as number;
};

const createPlatformInfoLog = (
  trigger: string,
  currentColorScheme: string | null | undefined,
  statusBarHeight: number,
  bottomNavBarHeight: number,
  insets: any,
  keyboardHeight: number
): string => {
  return [
    `Window: ${Math.round(width)}x${Math.round(height)}`,
    `Screen: ${Math.round(screenWidth)}x${Math.round(screenHeight)}`,
    `Small Device: ${Layout.isSmallDevice}`,
    `Pixel Ratio: ${Layout.pixelRatio.toFixed(2)}`,
    `Font Scale: ${Layout.fontScale.toFixed(2)}`,
    `Orientation: ${Layout.isPortrait ? 'Portrait' : 'Landscape'}`,
    `OS: ${Layout.os} ${Layout.osVersion}`,
    `Device Type: Pad=${Layout.isPad}, TV=${Layout.isTV}`,
    `Status Bar Height: ${Math.round(statusBarHeight)}`,
    `Bottom Nav Bar Height: ${Math.round(bottomNavBarHeight)}`,
    `Insets: T=${Math.round(insets.top)}, B=${Math.round(insets.bottom)}, L=${Math.round(insets.left)}, R=${Math.round(insets.right)}`,
    `Color Scheme: ${currentColorScheme}`,
    `Keyboard Height: ${Math.round(keyboardHeight)}`,
  ].join(', ');
};

// ===== カスタムフック =====
export const usePlatformInfo = () => {
  const insets = useSafeAreaInsets();
  const [colorScheme, setColorScheme] = useState(Appearance.getColorScheme());
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const statusBarHeight = getStatusBarHeight(insets);
  const bottomNavBarHeight = insets.bottom;

  // ログ出力ヘルパー
  const logPlatformInfo = (trigger: string, currentColorScheme: string | null | undefined) => {
    const formattedLog = createPlatformInfoLog(
      trigger,
      currentColorScheme,
      statusBarHeight,
      bottomNavBarHeight,
      insets,
      keyboardHeight
    );
    logger.debug('platformInfo', `usePlatformInfo Info (${trigger}): ${formattedLog}`);
  };

  // キーボードイベントリスナーの設定
  useEffect(() => {
    console.log('usePlatformInfo: useEffect mounted');

    const keyboardShowEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const keyboardHideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const keyboardWillShowSub = Keyboard.addListener(keyboardShowEvent, (e) => {
      console.log('KEYBOARD_HEIGHT_DEBUG:', e.endCoordinates.height);
      setKeyboardHeight(e.endCoordinates.height);
    });

    const keyboardWillHideSub = Keyboard.addListener(keyboardHideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      console.log('usePlatformInfo: useEffect cleanup');
      keyboardWillShowSub.remove();
      keyboardWillHideSub.remove();
    };
  }, []);

  // カラースキームとアプリ状態の監視
  useEffect(() => {
    logPlatformInfo('initial_mount', colorScheme);

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        const currentSystemColorScheme = Appearance.getColorScheme();
        setColorScheme(currentSystemColorScheme);
        logPlatformInfo('app_active', currentSystemColorScheme);
      }
    };

    const handleColorSchemeChange = ({ colorScheme: newColorScheme }: { colorScheme: ColorSchemeName }) => {
      setColorScheme(newColorScheme);
      logPlatformInfo('color_scheme_change', newColorScheme);
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    const colorSchemeSubscription = Appearance.addChangeListener(handleColorSchemeChange);

    return () => {
      appStateSubscription.remove();
      colorSchemeSubscription.remove();
    };
  }, [colorScheme]);

  return {
    ...Layout,
    insets,
    statusBarHeight,
    bottomNavBarHeight,
    colorScheme,
    keyboardHeight,
  };
};
