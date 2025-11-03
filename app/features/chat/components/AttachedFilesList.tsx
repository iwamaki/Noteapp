/**
 * @file AttachedFilesList.tsx
 * @summary 添付ファイルのリストを表示するコンポーネント
 * @responsibility チャット入力バーに添付されたファイルを表示し、削除操作を提供
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../design/theme/ThemeContext';
import { useChatUI } from '../contexts/ChatUIContext';
import { CHAT_CONFIG } from '../config/chatConfig';

/**
 * 添付ファイルリストコンポーネント
 */
export const AttachedFilesList: React.FC = () => {
  const { colors } = useTheme();
  const { attachedFiles, removeAttachedFile } = useChatUI();

  // 添付ファイルがない場合は何も表示しない
  if (attachedFiles.length === 0) {
    return null;
  }

  const styles = StyleSheet.create({
    attachedFileWrapper: {
      paddingVertical: CHAT_CONFIG.components.spacing.md,
      paddingHorizontal: CHAT_CONFIG.components.spacing.lg,
      borderBottomWidth: CHAT_CONFIG.components.border.width,
      borderBottomColor: colors.tertiary,
    },
    attachedFilesScrollView: {
      flexDirection: 'row',
    },
    attachedFileContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: `${colors.primary}15`, // プライマリカラーの薄い背景
      paddingHorizontal: CHAT_CONFIG.components.spacing.xl,
      paddingVertical: CHAT_CONFIG.components.attachedFile.itemSpacing,
      borderRadius: CHAT_CONFIG.components.border.radius.large, // Pill型
      marginRight: CHAT_CONFIG.components.spacing.md,
      borderWidth: CHAT_CONFIG.components.border.width,
      borderColor: `${colors.primary}40`,
    },
    attachedFileIcon: {
      marginRight: CHAT_CONFIG.components.attachedFile.itemSpacing,
    },
    attachedFileName: {
      fontSize: CHAT_CONFIG.components.fontSize.medium,
      color: colors.primary,
      fontWeight: '600',
      maxWidth: CHAT_CONFIG.components.message.maxFileNameWidth,
    },
  });

  return (
    <View style={styles.attachedFileWrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.attachedFilesScrollView}
      >
        {attachedFiles.map((file, index) => (
          <TouchableOpacity
            key={`${file.filename}-${index}`}
            style={styles.attachedFileContainer}
            onPress={() => removeAttachedFile(index)}
            activeOpacity={CHAT_CONFIG.components.opacity.muted}
          >
            <Ionicons
              name="document-text"
              size={CHAT_CONFIG.components.icon.medium}
              color={colors.primary}
              style={styles.attachedFileIcon}
            />
            <Text style={styles.attachedFileName} numberOfLines={1}>
              {file.filename}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};
