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
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.tertiary,
    },
    attachedFilesScrollView: {
      flexDirection: 'row',
    },
    attachedFileContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: `${colors.primary}15`, // プライマリカラーの薄い背景
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16, // Pill型
      marginRight: 8,
      borderWidth: 1,
      borderColor: `${colors.primary}40`,
    },
    attachedFileIcon: {
      marginRight: 6,
    },
    attachedFileName: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: '600',
      maxWidth: 120,
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
            activeOpacity={0.7}
          >
            <Ionicons
              name="document-text"
              size={14}
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
