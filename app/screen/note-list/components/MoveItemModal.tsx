/**
 * @file MoveItemModal.tsx
 * @summary アイテム（ノート/フォルダ）の移動先選択モーダル
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../../../design/theme/ThemeContext';
import { Folder } from '@shared/types/note';
import { Ionicons } from '@expo/vector-icons';
import { PathUtils } from '../noteStorage';

interface MoveItemModalProps {
  visible: boolean;
  currentPath: string;
  folders: Folder[];
  onClose: () => void;
  onMove: (destinationPath: string) => void;
}

export const MoveItemModal: React.FC<MoveItemModalProps> = ({
  visible,
  currentPath,
  folders,
  onClose,
  onMove,
}) => {
  const { colors, spacing, typography, shadows } = useTheme();
  const [internalCurrentPath, setInternalCurrentPath] = useState(currentPath);

  // モーダルが開かれたときにパスをリセット
  React.useEffect(() => {
    if (visible) {
      setInternalCurrentPath(currentPath);
    }
  }, [visible, currentPath]);

  const displayFolders = useMemo(() => {
    const normalizedInternalPath = PathUtils.normalizePath(internalCurrentPath);
    return folders.filter(folder => PathUtils.normalizePath(folder.path) === normalizedInternalPath);
  }, [folders, internalCurrentPath]);

  const handleSelectFolder = useCallback((folder: Folder) => {
    setInternalCurrentPath(PathUtils.getFullPath(folder.path, folder.name));
  }, []);

  const handleGoUp = useCallback(() => {
    setInternalCurrentPath(PathUtils.getParentPath(internalCurrentPath));
  }, [internalCurrentPath]);

  const handleMoveHere = () => {
    onMove(internalCurrentPath);
    onClose();
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: spacing.xl,
      width: '90%',
      maxWidth: 500,
      maxHeight: '80%',
      ...shadows.large,
    },
    title: {
      ...typography.title,
      fontSize: 20,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    currentPathDisplay: {
      ...typography.body,
      color: colors.textSecondary,
      marginBottom: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
    },
    pathText: {
      color: colors.primary,
      fontWeight: '600',
      flexShrink: 1,
    },
    folderItem: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
    },
    folderName: {
      ...typography.body,
      color: colors.text,
      marginLeft: spacing.sm,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: spacing.md,
      marginTop: spacing.lg,
    },
    button: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: 8,
      minWidth: 80,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: colors.secondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    moveButton: {
      backgroundColor: colors.primary,
    },
    buttonText: {
      ...typography.body,
      fontWeight: '600',
    },
    cancelButtonText: {
      color: colors.text,
    },
    moveButtonText: {
      color: colors.white,
    },
    disabledButton: {
      opacity: 0.5,
    },
  });

  const renderFolderItem = useCallback(({ item }: { item: Folder }) => (
    <TouchableOpacity style={styles.folderItem} onPress={() => handleSelectFolder(item)}>
      <Ionicons name="folder-outline" size={24} color={colors.textSecondary} />
      <Text style={styles.folderName}>{item.name}</Text>
    </TouchableOpacity>
  ), [handleSelectFolder, colors]);

  const canGoUp = internalCurrentPath !== '/';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalContainer}>
          <Text style={styles.title}>アイテムを移動</Text>

          <View style={styles.currentPathDisplay}>
            {canGoUp && (
              <TouchableOpacity onPress={handleGoUp} style={{ marginRight: spacing.sm }}>
                <Ionicons name="arrow-up-circle-outline" size={24} color={colors.primary} />
              </TouchableOpacity>
            )}
            <Text style={styles.pathText} numberOfLines={1}>{internalCurrentPath}</Text>
          </View>

          <FlatList
            data={displayFolders}
            renderItem={renderFolderItem}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <Text style={{ ...typography.body, color: colors.textSecondary, textAlign: 'center', padding: spacing.md }}>
                このフォルダにはサブフォルダがありません。
              </Text>
            }
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={[styles.buttonText, styles.cancelButtonText]}>
                キャンセル
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.moveButton,
              ]}
              onPress={handleMoveHere}
            >
              <Text style={[styles.buttonText, styles.moveButtonText]}>
                ここに移動
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
