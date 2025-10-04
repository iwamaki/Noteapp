/**
 * @file DiffPreview.tsx
 * @summary 差分プレビューコンポーネント
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DiffLine } from '../../../../services/diffService';
import { DiffViewer } from '../../../diff-view/components/DiffViewer';
import { useTheme } from '../../../../theme/ThemeContext';

interface DiffPreviewProps {
  diff: DiffLine[];
  selectedBlocks: Set<number>;
  allSelected: boolean;
  onBlockToggle: (blockId: number) => void;
  onToggleAll: () => void;
  onApply: () => void;
  onCancel: () => void;
}

export const DiffPreview: React.FC<DiffPreviewProps> = ({
  diff,
  selectedBlocks,
  allSelected,
  onBlockToggle,
  onToggleAll,
  onApply,
  onCancel,
}) => {
  const { colors, typography } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      backgroundColor: colors.secondary,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    controlButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    controlButtonText: {
      ...typography.body,
      fontWeight: '500',
      color: colors.text,
    },
    applyButton: {
      backgroundColor: colors.success,
      borderColor: colors.success,
    },
    applyButtonText: {
      color: colors.background,
    },
    cancelButton: {
      backgroundColor: colors.secondary,
    },
  });

  if (diff.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <DiffViewer
        diff={diff}
        selectedBlocks={selectedBlocks}
        onBlockToggle={onBlockToggle}
      />
      <View style={styles.footer}>
        <TouchableOpacity style={styles.controlButton} onPress={onToggleAll}>
          <Text style={styles.controlButtonText}>
            {allSelected ? '☑ All' : '☐ All'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.controlButton, styles.applyButton]}
          onPress={onApply}
        >
          <Text style={[styles.controlButtonText, styles.applyButtonText]}>
            ✅ 適用
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.controlButton, styles.cancelButton]}
          onPress={onCancel}
        >
          <Text style={styles.controlButtonText}>❌ キャンセル</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
