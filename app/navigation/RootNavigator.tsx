/**
 * @file RootNavigator.tsx
 * @summary このファイルはアプリケーションのルートナビゲーターを定義します。
 * @responsibility アプリケーション全体のナビゲーションスタックを設定し、主要な画面間の遷移を管理する責任があります。
 */

import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import {
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { RootStackParamList } from './types';
import FileListScreen from '../screens/file-list-flat/FileListScreenFlat';
import FileEditScreen from '../screens/file-edit/FileEditScreen';
import SettingsScreen from '../settings/SettingsScreen';
import { TokenPurchaseScreen } from '../screens/token-purchase';
import { ModelSelectionScreen } from '../screens/model-selection/ModelSelectionScreen';

import { useTheme } from '../design/theme/ThemeContext';
import { ChatInputBar } from '../features/chat/components/ChatInputBar';
import { useLLMSettingsStore } from '../settings/settingsStore';
import { logger } from '../utils/logger';


// スタックナビゲーターの作成
const Stack = createStackNavigator<RootStackParamList>();

function RootNavigatorContent() {
  const navigationRef = useNavigationContainerRef();
  const [currentRouteName, setCurrentRouteName] = useState<string | undefined>(undefined);
  const { colors } = useTheme();
  const { settings } = useLLMSettingsStore();

  // RootNavigator マウント時のログ
  React.useEffect(() => {
    logger.info('init', '📱 RootNavigator mounted');
  }, []);

  const shouldShowChat = (currentRouteName === 'FileList' || currentRouteName === 'FileEdit') && settings.llmEnabled;

  return (
    <>
      <NavigationContainer
        ref={navigationRef}
        onReady={() => {
          logger.info('init', '🗺️  NavigationContainer ready');
          setCurrentRouteName(navigationRef.current?.getCurrentRoute()?.name);
        }}
        onStateChange={() => {
          setCurrentRouteName(navigationRef.current?.getCurrentRoute()?.name);
        }}
      >
        <Stack.Navigator
          initialRouteName="FileList"
          screenOptions={{
            headerTintColor: colors.text,

            // iOSスタイルの水平スライドアニメーション（最も高速）
            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,

            // アニメーション時間を短縮（デフォルトは300ms）
            transitionSpec: {
              open: {
                animation: 'timing',
                config: {
                  duration: 250, // 250ms（デフォルトより50ms短縮）
                },
              },
              close: {
                animation: 'timing',
                config: {
                  duration: 200, // 閉じる時はさらに短く
                },
              },
            },

            // 前の画面を早めにデタッチしてメモリ解放
            detachPreviousScreen: true,

            // 画面の背景色を設定してちらつき防止
            cardStyle: {
              backgroundColor: colors.background,
            },

            // アニメーション中の操作を制限
            freezeOnBlur: true,

            // ジェスチャー設定
            gestureEnabled: true,
            gestureDirection: 'horizontal',
          }}
        >
          {/* メイン画面 */}
          <Stack.Screen name="FileList" component={FileListScreen} options={{ title: 'Files' }} />
          <Stack.Screen name="FileEdit" component={FileEditScreen} options={{ title: 'Edit File' }} />

          {/* 設定関連画面 */}
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
          <Stack.Screen name="TokenPurchase" component={TokenPurchaseScreen} />
          <Stack.Screen name="ModelSelection" component={ModelSelectionScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>

      {/* ChatInputBar (LLM有効 & 対象画面でのみ表示) */}
      {shouldShowChat && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <ChatInputBar />
        </KeyboardAvoidingView>
      )}
    </>
  );
}

export default RootNavigatorContent;