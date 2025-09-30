/*
* ルートナビゲーターの設定
* 主要な画面（ノート一覧、ノート編集、差分表示、バージョン履歴、設定）をスタックナビゲーションで管理
*/

import React from 'react';
import {
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from './types';
import { View, StyleSheet } from 'react-native';

import NoteListScreen from '../features/note-list/NoteListScreen';
import NoteEditScreen from '../features/note-edit/NoteEditScreen';
import DiffViewScreen from '../features/diff-view/DiffViewScreen';
import VersionHistoryScreen from '../features/version-history/VersionHistoryScreen';
import SettingsScreen from '../features/settings/SettingsScreen';

// スタックナビゲーターの作成
const Stack = createStackNavigator<RootStackParamList>();

// RootNavigatorコンポーネント
function RootNavigator() {
  const navigationRef = useNavigationContainerRef();

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default RootNavigator;
