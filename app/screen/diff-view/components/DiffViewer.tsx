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
import { DiffLine, InlineChange } from '../services/diffService';
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
    // インライン変更のスタイル
    inlineEqual: {
      // 変更なし部分は通常表示
    },
    inlineDelete: {
      backgroundColor: colors.danger + '50',
      textDecorationLine: 'line-through',
      textDecorationColor: colors.danger,
    },
    inlineInsert: {
      backgroundColor: colors.success + '50',
      fontWeight: 'bold',
    },
  });

  const getInlineStyle = (type: InlineChange['type']) => {
    switch (type) {
      case 'delete':
        return styles.inlineDelete;
      case 'insert':
        return styles.inlineInsert;
      case 'equal':
      default:
        return styles.inlineEqual;
    }
  };

  const renderInlineContent = (line: DiffLine) => {
    if (!line.inlineChanges || line.inlineChanges.length === 0) {
      // インライン変更がない場合は通常のテキスト表示
      return <Text style={styles.content}>{line.content}</Text>;
    }

    // インライン変更がある場合は、各部分を個別にスタイリング
    return (
      <Text style={styles.content}>
        {line.inlineChanges.map((change, idx) => (
          <Text key={idx} style={getInlineStyle(change.type)}>
            {change.content}
          </Text>
        ))}
      </Text>
    );
  };

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
        {renderInlineContent(line)}
      </View>
    );
  };

  return (
    <ScrollView style={styles.diffContainer}>
      {diff.map(renderDiffLine)}
    </ScrollView>
  );
};