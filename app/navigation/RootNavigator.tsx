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
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from './types';
import FileListScreen from '../screen/file-list/FileListScreen';
import FileEditScreen from '../screen/file-edit/FileEditScreen';
import DiffViewScreen from '../screen/diff-view/DiffViewScreen';
import VersionHistoryScreen from '../screen/version-history/VersionHistoryScreen';
import SettingsScreen from '../settings/SettingsScreen';

import { useTheme } from '../design/theme/ThemeContext';
import { KeyboardHeightProvider } from '../contexts/KeyboardHeightContext';
import { ChatInputBar } from '../features/chat/components/ChatInputBar';


// スタックナビゲーターの作成
const Stack = createStackNavigator<RootStackParamList>();

// 内部ナビゲーターコンポーネント（KeyboardHeightProviderの内側で動作）
function RootNavigatorContent() {
  const navigationRef = useNavigationContainerRef();
  const [currentRouteName, setCurrentRouteName] = useState<string | undefined>(undefined);
  const { colors } = useTheme();


  const shouldShowChat = currentRouteName === 'FileList' || currentRouteName === 'FileEdit';

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
          }}
        >
          <Stack.Screen name="FileList" component={FileListScreen} options={{ title: 'Notes' }} />
          <Stack.Screen name="FileEdit" component={FileEditScreen} options={{ title: 'Edit Note' }} />
          <Stack.Screen name="DiffView" component={DiffViewScreen} options={{ title: 'View Diff' }} />
          <Stack.Screen name="VersionHistory" component={VersionHistoryScreen} options={{ title: 'Version History' }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
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