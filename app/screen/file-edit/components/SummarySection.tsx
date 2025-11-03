/**
 * @file SummarySection.tsx
 * @summary ファイル編集画面のインライン要約セクション
 * @description
 * ファイルの要約をエディタ画面に直接表示・編集できる折りたたみ可能なセクション。
 * モーダルよりも直感的な編集体験を提供。
 */

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../design/theme/ThemeContext';

interface SummarySectionProps {
  summary: string;
  onSummaryChange: (summary: string) => void;
  defaultExpanded?: boolean;
}

export const SummarySection: React.FC<SummarySectionProps> = ({
  summary,
  onSummaryChange,
  defaultExpanded = true,
}) => {
  const { colors, spacing, typography } = useTheme();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    headerIcon: {
      marginRight: spacing.xs,
    },
    headerTitle: {
      ...typography.body,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    previewText: {
      ...typography.caption,
      color: colors.textSecondary,
      marginLeft: spacing.sm,
      flex: 1,
    },
    toggleButton: {
      padding: spacing.xs,
    },
    inputContainer: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
    },
    input: {
      ...typography.body,
      color: colors.text,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      minHeight: 60,
      maxHeight: 120,
      textAlignVertical: 'top',
    },
    hint: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
  });

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Ionicons
            name="document-text-outline"
            size={18}
            color={colors.primary}
            style={styles.headerIcon}
          />
          <Text style={styles.headerTitle}>要約</Text>
          {!isExpanded && summary && (
            <Text style={styles.previewText} numberOfLines={1}>
              {summary}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={toggleExpanded}
        >
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.text}
          />
        </TouchableOpacity>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.inputContainer}>
          <TextInput
            value={summary}
            onChangeText={onSummaryChange}
            placeholder="ファイルの内容を簡潔に要約してください..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={3}
            style={styles.input}
            textAlignVertical="top"
          />
          <Text style={styles.hint}>
            このファイルの内容を1〜2文で要約します。忙しい人のための機能です。
          </Text>
        </View>
      )}
    </View>
  );
};
