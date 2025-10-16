/**
 * @file DiffViewer.tsx
 * @summary このファイルは、アプリケーションの差分表示コンポーネントを定義します。
 * @responsibility 2つのテキスト間の差分を視覚的に表示し、ユーザーが変更ブロックを選択・解除できる機能を提供する責任があります。
 */
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { DiffLine } from '../services/diffService';
import { useTheme } from '../../../design/theme/ThemeContext';

interface DiffViewerProps {
  diff: DiffLine[];
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ diff }) => {
  const { colors, typography } = useTheme();
  const styles = StyleSheet.create({
    diffContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    diffLine: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
      paddingHorizontal: 8,
      marginVertical: 1,
    },
    diffAdded: {
      backgroundColor: colors.success + '30',
      borderLeftWidth: 3,
      borderLeftColor: colors.success,
    },
    diffDeleted: {
      backgroundColor: colors.danger + '30',
      borderLeftWidth: 3,
      borderLeftColor: colors.danger,
    },
    diffCommon: {
      backgroundColor: colors.secondary,
    },
    lineNumber: {
      width: 30,
      ...typography.caption,
      color: colors.textSecondary,
      fontFamily: 'monospace',
      textAlign: 'right',
      marginRight: 4,
    },
    prefix: {
      width: 20,
      ...typography.body,
      fontFamily: 'monospace',
      fontWeight: 'bold',
      textAlign: 'center',
    },
    content: {
      flex: 1,
      ...typography.body,
      fontFamily: 'monospace',
      color: colors.text,
      paddingRight: 8,
    },
  });

  const renderDiffLine = (line: DiffLine, index: number) => {
    let lineStyle: any = styles.diffLine;
    let prefix = ' ';
    let prefixColor = colors.textSecondary;

    switch (line.type) {
      case 'added':
        lineStyle = [styles.diffLine, styles.diffAdded];
        prefix = '+';
        prefixColor = colors.success;
        break;
      case 'deleted':
        lineStyle = [styles.diffLine, styles.diffDeleted];
        prefix = '-';
        prefixColor = colors.danger;
        break;
      case 'common':
        lineStyle = [styles.diffLine, styles.diffCommon];
        break;
    }

    return (
      <View key={index} style={lineStyle}>
        <Text style={styles.lineNumber}>{line.originalLineNumber || ''}</Text>
        <Text style={styles.lineNumber}>{line.newLineNumber || ''}</Text>
        <Text style={[styles.prefix, { color: prefixColor }]}>{prefix}</Text>
        <Text style={styles.content}>{line.content}</Text>
      </View>
    );
  };

  return (
    <ScrollView style={styles.diffContainer}>
      {diff.map(renderDiffLine)}
    </ScrollView>
  );
};