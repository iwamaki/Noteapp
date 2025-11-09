/**
 * @file RootNavigator.tsx
 * @summary このファイルはアプリケーションのルートナビゲーターを定義します。
 * @responsibility アプリケーション全体のナビゲーションスタックを設定し、主要な画面間の遷移を管理する責任があります。
 */

import React, { useState } from 'react';
import {
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { RootStackParamList } from './types';
// import FileListScreen from '../screen/file-list/FileListScreen';
import FileListScreen from '../screen/file-list-flat/FileListScreenFlat';
import FileEditScreen from '../screen/file-edit/FileEditScreen';
import SettingsScreen from '../settings/SettingsScreen';
import { SubscriptionScreen } from '../screen/subscription/SubscriptionScreen';
import { TokenPurchaseScreen } from '../screen/token-purchase';

import { useTheme } from '../design/theme/ThemeContext';
import { KeyboardHeightProvider } from '../contexts/KeyboardHeightContext';
import { ChatInputBar } from '../features/chat/components/ChatInputBar';
import { useSettingsStore } from '../settings/settingsStore';


// スタックナビゲーターの作成
const Stack = createStackNavigator<RootStackParamList>();

// 内部ナビゲーターコンポーネント（KeyboardHeightProviderの内側で動作）
function RootNavigatorContent() {
  const navigationRef = useNavigationContainerRef();
  const [currentRouteName, setCurrentRouteName] = useState<string | undefined>(undefined);
  const { colors } = useTheme();
  const { settings } = useSettingsStore();

  const shouldShowChat = (currentRouteName === 'FileList' || currentRouteName === 'FileEdit') && settings.llmEnabled;

  return (
    <>
      <NavigationContainer
        ref={navigationRef}
        onReady={() => {
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
          <Stack.Screen name="FileList" component={FileListScreen} options={{ title: 'Files' }} />
          <Stack.Screen name="FileEdit" component={FileEditScreen} options={{ title: 'Edit File' }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
          <Stack.Screen name="Subscription" component={SubscriptionScreen} options={{ title: 'Subscription' }} />
          <Stack.Screen name="TokenPurchase" component={TokenPurchaseScreen} options={{ title: 'プラン・トークン購入' }} />
        </Stack.Navigator>
      </NavigationContainer>
      {shouldShowChat && <ChatInputBar />}
    </>
  );
}

// RootNavigatorコンポーネント（Providerでラップ）
function RootNavigator() {
  return (
    <KeyboardHeightProvider>
      <RootNavigatorContent />
    </KeyboardHeightProvider>
  );
}



export default RootNavigator;