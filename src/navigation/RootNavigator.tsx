import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from './types';

import NoteListScreen from '../screens/NoteListScreen';
import NoteEditScreen from '../screens/NoteEditScreen';
import DiffViewScreen from '../screens/DiffViewScreen';
import VersionHistoryScreen from '../screens/VersionHistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createStackNavigator<RootStackParamList>();

function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="NoteList">
        <Stack.Screen name="NoteList" component={NoteListScreen} options={{ title: 'Notes' }} />
        <Stack.Screen name="NoteEdit" component={NoteEditScreen} options={{ title: 'Edit Note' }} />
        <Stack.Screen name="DiffView" component={DiffViewScreen} options={{ title: 'View Diff' }} />
        <Stack.Screen name="VersionHistory" component={VersionHistoryScreen} options={{ title: 'Version History' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default RootNavigator;
