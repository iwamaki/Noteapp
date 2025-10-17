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
import { View, StyleSheet } from 'react-native';
import { RootStackParamList } from './types';
import NoteListScreen from '../screen/note-list/NoteListScreen';
import NoteEditScreen from '../screen/note-edit/NoteEditScreen';
import DiffViewScreen from '../screen/diff-view/DiffViewScreen';
import VersionHistoryScreen from '../screen/version-history/VersionHistoryScreen';
import SettingsScreen from '../settings/SettingsScreen';
import { ChatLayout } from '../features/chat/layouts/ChatLayout';
import { useTheme } from '../design/theme/ThemeContext';


// スタックナビゲーターの作成
const Stack = createStackNavigator<RootStackParamList>();

// RootNavigatorコンポーネント
function RootNavigator() {
  const navigationRef = useNavigationContainerRef();
  const [currentRouteName, setCurrentRouteName] = useState<string | undefined>(undefined);
  const { colors } = useTheme();

  const shouldShowChat = currentRouteName === 'NoteList' || currentRouteName === 'NoteEdit';

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
          initialRouteName="NoteList"
          screenOptions={{
            headerTintColor: colors.text,
          }}
        >
          <Stack.Screen name="NoteList" component={NoteListScreen} options={{ title: 'Notes' }} />
          <Stack.Screen name="NoteEdit" component={NoteEditScreen} options={{ title: 'Edit Note' }} />
          <Stack.Screen name="DiffView" component={DiffViewScreen} options={{ title: 'View Diff' }} />
          <Stack.Screen name="VersionHistory" component={VersionHistoryScreen} options={{ title: 'Version History' }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
        </Stack.Navigator>
      </NavigationContainer>
      <View style={styles.chatLayoutContainer}>
        <ChatLayout visible={shouldShowChat} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  chatLayoutContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
});

export default RootNavigator;