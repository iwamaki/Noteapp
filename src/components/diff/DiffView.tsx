/**
 * 差分表示コンポーネント
 * プロトタイプのfile-editor.jsの差分表示機能をReact Nativeコンポーネントに変換
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ViewStyle, // 追加
} from 'react-native';
import { DiffLine, DiffManager } from '../../utils/diffUtils';

interface DiffViewProps {
  diff: DiffLine[];
  selectedBlocks: Set<number>;
  onBlockToggle: (blockId: number) => void;
  onAllToggle: () => void;
  onApply: () => void;
  onCancel: () => void;
}

export const DiffView: React.FC<DiffViewProps> = ({
  diff,
  selectedBlocks,
  onBlockToggle,
  onAllToggle,
  onApply,
  onCancel,
}) => {
  const totalChanges = new Set(
    diff.filter(line => line.changeBlockId !== null)
      .map(line => line.changeBlockId)
  ).size;

  const selectedCount = selectedBlocks.size;
  const allSelected = selectedCount === totalChanges && totalChanges > 0;

  const processedBlocks = new Set<number>();

  const renderDiffLine = (line: DiffLine, index: number) => {
    const lineNumber = line.originalLineNumber || line.newLineNumber || '';
    const showCheckbox = line.changeBlockId !== null &&
      !processedBlocks.has(line.changeBlockId);

    if (showCheckbox) {
      processedBlocks.add(line.changeBlockId as number); // 型アサーションを追加
    }

    let lineStyle: ViewStyle[] = [styles.diffLine]; // 型アサーションを追加
    let prefix = '';
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
        prefix = ' ';
        prefixColor = '#666';
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
              selectedBlocks.has(line.changeBlockId as number) && styles.checkboxSelected // 型アサーションを追加
            ]}
            onPress={() => onBlockToggle(line.changeBlockId as number)} // 型アサーションを追加
          >
            <Text style={styles.checkboxText}>
              {selectedBlocks.has(line.changeBlockId as number) ? '☑' : '☐'} // 型アサーションを追加
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.checkboxPlaceholder} />
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.diffContainer}>
        {diff.map(renderDiffLine)}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={onAllToggle}
          >
            <Text style={styles.controlButtonText}>
              {allSelected ? '☑ All' : '☐ All'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, styles.cancelButton]}
            onPress={onCancel}
          >
            <Text style={styles.controlButtonText}>❌ キャンセル</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.controlButton,
              styles.applyButton,
              selectedCount === 0 && styles.disabledButton
            ]}
            onPress={onApply}
            disabled={selectedCount === 0}
          >
            <Text style={[
              styles.controlButtonText,
              styles.applyButtonText,
              selectedCount === 0 && styles.disabledButtonText
            ]}>
              ✅ 適用 ({selectedCount}件)
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
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
  footer: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  controlButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  controlButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
  },
  applyButton: {
    backgroundColor: '#28a745',
    borderColor: '#28a745',
  },
  applyButtonText: {
    color: '#fff',
  },
  disabledButton: {
    backgroundColor: '#6c757d',
    borderColor: '#6c757d',
    opacity: 0.5,
  },
  disabledButtonText: {
    color: '#fff',
    opacity: 0.7,
  },
});