/**
 * 差分表示 汎用コンポーネント
 * 差分データを元に、その内容を視覚的に表示する責務を持つ。
 * 状態管理は行わず、propsで渡されたデータを表示し、ユーザー操作を親に通知する。
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { DiffLine } from '../../../services/diffService';

interface DiffViewerProps {
  diff: DiffLine[];
  selectedBlocks: Set<number>;
  onBlockToggle: (blockId: number) => void;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ diff, selectedBlocks, onBlockToggle }) => {
  const processedBlocks = new Set<number>();

  const renderDiffLine = (line: DiffLine, index: number) => {
    const lineNumber = line.originalLineNumber || line.newLineNumber || '';
    const showCheckbox = line.changeBlockId !== null && !processedBlocks.has(line.changeBlockId);

    if (showCheckbox && line.changeBlockId) {
      processedBlocks.add(line.changeBlockId);
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
        <Text style={styles.lineNumber}>{lineNumber}</Text>
        <Text style={[styles.prefix, { color: prefixColor }]}>{prefix}</Text>
        <Text style={styles.content}>{line.content}</Text>
        {showCheckbox && line.changeBlockId !== null ? (
          <TouchableOpacity
            style={[
              styles.checkbox,
              selectedBlocks.has(line.changeBlockId) && styles.checkboxSelected,
            ]}
            onPress={() => onBlockToggle(line.changeBlockId!)}
          >
            <Text style={styles.checkboxText}>
              {selectedBlocks.has(line.changeBlockId) ? '☑' : '☐'}
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
  lineNumber: {
    width: 40,
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
    textAlign: 'right',
    marginRight: 8,
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
  checkboxText: {
    fontSize: 16,
    color: '#007bff',
  },
  checkboxPlaceholder: {
    width: 32,
    height: 32,
  },
});
