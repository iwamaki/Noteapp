/**
 * @file DiffViewer.tsx
 * @summary このファイルは、アプリケーションの差分表示コンポーネントを定義します。
 * @responsibility 2つのテキスト間の差分を視覚的に表示し、ユーザーが変更ブロックを選択・解除できる機能を提供する責任があります。
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { DiffLine } from '../../../services/diffService';
import { useTheme } from '../../../theme/ThemeContext';

interface DiffViewerProps {
  diff: DiffLine[];
  selectedBlocks: Set<number>;
  onBlockToggle: (blockId: number) => void;
  isReadOnly?: boolean; // Add isReadOnly prop
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ diff, selectedBlocks, onBlockToggle, isReadOnly = false }) => {
  const { colors, typography } = useTheme();
  const processedBlocks = new Set<number>();

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
    hunkHeader: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      backgroundColor: colors.secondary,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.border,
      marginVertical: 4,
    },
    hunkHeaderText: {
      ...typography.caption,
      color: colors.textSecondary,
      fontFamily: 'monospace',
      fontWeight: 'bold',
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
    checkbox: {
      width: 32,
      height: 32,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    checkboxSelected: {
      backgroundColor: colors.primary,
    },
    checkboxDisabled: {
      borderColor: colors.textSecondary,
      backgroundColor: colors.secondary,
    },
    checkboxText: {
      fontSize: 16,
      color: colors.primary,
    },
    checkboxTextSelected: {
      color: colors.background,
    },
    checkboxTextDisabled: {
      color: colors.textSecondary,
    },
    checkboxPlaceholder: {
      width: 32,
      height: 32,
    },
  });

  const renderDiffLine = (line: DiffLine, index: number) => {
    const showCheckbox = line.changeBlockId !== null && line.changeBlockId !== undefined && !processedBlocks.has(line.changeBlockId);

    if (showCheckbox && line.changeBlockId) {
      processedBlocks.add(line.changeBlockId);
    }

    if (line.type === 'hunk-header') {
      return (
        <View key={index} style={styles.hunkHeader}>
          <Text style={styles.hunkHeaderText}>{line.content}</Text>
        </View>
      );
    }

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
        {showCheckbox && line.changeBlockId !== null ? (
          <TouchableOpacity
            style={[
              styles.checkbox,
              selectedBlocks.has(line.changeBlockId!) && styles.checkboxSelected,
              isReadOnly && styles.checkboxDisabled,
            ]}
            onPress={() => onBlockToggle(line.changeBlockId!)}
            disabled={isReadOnly}
          >
            <Text style={[
              styles.checkboxText,
              selectedBlocks.has(line.changeBlockId!) && styles.checkboxTextSelected,
              isReadOnly && styles.checkboxTextDisabled
            ]}>
              {selectedBlocks.has(line.changeBlockId!) ? '☑' : '☐'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.checkboxPlaceholder} />
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.diffContainer}>
      {diff.map(renderDiffLine)}
    </ScrollView>
  );
};