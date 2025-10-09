import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../design/theme/ThemeContext';

interface NoteListEmptyStateProps {
  containerStyle: object;
  messageStyle: object;
}

export const NoteListEmptyState: React.FC<NoteListEmptyStateProps> = ({
  containerStyle,
  messageStyle,
}) => {
  const { spacing } = useTheme();

  const styles = StyleSheet.create({
    emptyContainer: {
      flex: 1,
    },
    emptyMessage: {
      fontSize: 16,
      textAlign: 'center',
      paddingHorizontal: spacing.xl,
    },
  });

  return (
    <View style={[containerStyle, styles.emptyContainer]}>
      <Text style={[messageStyle, styles.emptyMessage]}>ノートがありません。</Text>
      <Text style={[messageStyle, styles.emptyMessage]}>下の「+」ボタンから新しいノートを作成しましょう。</Text>
    </View>
  );
};
