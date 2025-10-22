import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../design/theme/ThemeContext';

interface FileListEmptyStateProps {
  containerStyle: object;
  messageStyle: object;
  message?: string;
}

export const FileListEmptyState: React.FC<FileListEmptyStateProps> = ({
  containerStyle,
  messageStyle,
  message,
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
      {message ? (
        <Text style={[messageStyle, styles.emptyMessage]}>{message}</Text>
      ) : (
        <>
          <Text style={[messageStyle, styles.emptyMessage]}>ノートがありません。</Text>
          <Text style={[messageStyle, styles.emptyMessage]}>下の「+」ボタンから新しいファイルを作成しましょう。</Text>
        </>
      )}
    </View>
  );
};
