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

interface DiffViewerProps {
  diff: DiffLine[];
  selectedBlocks: Set<number>;
  onBlockToggle: (blockId: number) => void;
  isReadOnly?: boolean; // Add isReadOnly prop
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ diff, selectedBlocks, onBlockToggle, isReadOnly = false }) => {
  const processedBlocks = new Set<number>();

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
    let prefixColor = '#666';

    switch (line.type) {
      case 'added':
        lineStyle = [styles.diffLine, styles.diffAdded];
        prefix = '+';
        prefixColor = '#28a745';
        break;
      case 'deleted':
        lineStyle = [styles.diffLine, styles.diffDeleted];
        prefix = '-';
        prefixColor = '#dc3545';
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

const styles = StyleSheet.create({
  diffContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  diffLine: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginVertical: 1,
  },
  diffAdded: {
    backgroundColor: '#d4edda',
    borderLeftWidth: 3,
    borderLeftColor: '#28a745',
  },
  diffDeleted: {
    backgroundColor: '#f8d7da',
    borderLeftWidth: 3,
    borderLeftColor: '#dc3545',
  },
  diffCommon: {
    backgroundColor: '#f8f9fa',
  },
  hunkHeader: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f1f8ff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#c8e1ff',
    marginVertical: 4,
  },
  hunkHeaderText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  lineNumber: {
    width: 30,
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
    textAlign: 'right',
    marginRight: 4,
  },
  prefix: {
    width: 20,
    fontSize: 14,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'monospace',
    paddingRight: 8,
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxSelected: {
    backgroundColor: '#007bff',
  },
  checkboxDisabled: {
    borderColor: '#ccc',
    backgroundColor: '#f0f0f0',
  },
  checkboxText: {
    fontSize: 16,
    color: '#007bff',
  },
  checkboxTextSelected: {
    color: '#fff',
  },
  checkboxTextDisabled: {
    color: '#aaa',
  },
  checkboxPlaceholder: {
    width: 32,
    height: 32,
  },
});