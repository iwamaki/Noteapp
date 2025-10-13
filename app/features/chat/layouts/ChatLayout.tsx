/**
 * @file ChatLayout.tsx
 * @summary ChatInputBarのレイアウトを管理するコンテナコンポーネント
 * @description このコンポーネントは、ChatInputBarを画面下部に配置し、
 * キーボードの表示状態に応じて適切な位置に配置する責任を持ちます。
 *
 * @responsibility
 * - ChatInputBarの絶対配置（position: absolute, bottom: 0）
 * - キーボード表示時の自動レイアウト調整（React Nativeのデフォルト動作）
 * - 表示する画面の判定（NoteList, NoteEditのみ表示）
 */

import React from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { ChatInputBar } from '../components/ChatInputBar';

interface ChatLayoutProps {
  /** ChatInputBarを表示するかどうか */
  visible: boolean;
}

/**
 * ChatInputBarを画面下部に配置するレイアウトコンポーネント
 *
 * @example
 * ```tsx
 * function RootNavigator() {
 *   const [currentRouteName, setCurrentRouteName] = useState<string>();
 *   const shouldShowChat = currentRouteName === 'NoteList' || currentRouteName === 'NoteEdit';
 *
 *   return (
 *     <View style={{ flex: 1 }}>
 *       <NavigationContainer>
 *         <Stack.Navigator>...</Stack.Navigator>
 *       </NavigationContainer>
 *       <ChatLayout visible={shouldShowChat} />
 *     </View>
 *   );
 * }
 * ```
 */
export function ChatLayout({ visible }: ChatLayoutProps) {
  if (!visible) {
    return null;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'position' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      style={styles.container}
    >
      <ChatInputBar />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
