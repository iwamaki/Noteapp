/**
 * @file RootNavigator.tsx
 * @summary このファイルはアプリケーションのルートナビゲーターを定義します。
 * @responsibility アプリケーション全体のナビゲーションスタックを設定し、主要な画面間の遷移を管理する責任があります。
 */

import React from 'react';
import {
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from './types';
import { View, StyleSheet } from 'react-native';

import NoteListScreen from '../screen/note-list/NoteListScreen';
import NoteEditScreen from '../screen/note-edit/NoteEditScreen';
import DiffViewScreen from '../screen/diff-view/DiffViewScreen';
import VersionHistoryScreen from '../screen/version-history/VersionHistoryScreen';
import SettingsScreen from '../settings/SettingsScreen';
import { ChatInputBar } from '../features/chat/ChatInputBar';
import { useKeyboard } from '../contexts/KeyboardContext';

// スタックナビゲーターの作成
const Stack = createStackNavigator<RootStackParamList>();

// RootNavigatorコンポーネント
function RootNavigator() {
  const navigationRef = useNavigationContainerRef();
  const { keyboardHeight } = useKeyboard();

  return (
    <View style={styles.container}>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator initialRouteName="NoteList">
          <Stack.Screen name="NoteList" component={NoteListScreen} options={{ title: 'Notes' }} />
          <Stack.Screen name="NoteEdit" component={NoteEditScreen} options={{ title: 'Edit Note' }} />
          <Stack.Screen name="DiffView" component={DiffViewScreen} options={{ title: 'View Diff' }} />
          <Stack.Screen name="VersionHistory" component={VersionHistoryScreen} options={{ title: 'Version History' }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
        </Stack.Navigator>
      </NavigationContainer>
      <View style={{ bottom: keyboardHeight }}>
        <ChatInputBar />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default RootNavigator;
