/**
 * @file RenameItemModal.tsx
 * @summary アイテム（ノート/フォルダ）の名前変更モーダル
 */
import React, { useState, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { CustomInlineInput } from '../../../components/CustomInlineInput';
import { useTheme } from '../../../design/theme/ThemeContext';
import { CustomModal } from '../../../components/CustomModal';

interface RenameItemModalProps {
  visible: boolean;
  initialName: string;
  itemType: 'file' | 'folder';
  onClose: () => void;
  onRename: (newName: string) => void;
}

export const RenameItemModal: React.FC<RenameItemModalProps> = ({
  visible,
  initialName,
  itemType,
  onClose,
  onRename,
}) => {
  const { colors, typography, spacing } = useTheme();
  const [inputValue, setInputValue] = useState(initialName);

  const styles = StyleSheet.create({
    inputBorder: {
      borderWidth: 1,
      borderRadius: 8,
    },
  });

  useEffect(() => {
    if (visible) {
      setInputValue(initialName);
    }
  }, [visible, initialName]);

  const handleRename = () => {
    if (inputValue.trim() && inputValue.trim() !== initialName) {
      onRename(inputValue.trim());
      onClose();
    }
  };

  return (
    <CustomModal
      isVisible={visible}
      title={itemType === 'folder' ? 'フォルダ名を変更' : 'ノート名を変更'}
      message={`新しい${itemType === 'folder' ? 'フォルダ名' : 'ノート名'}を入力してください。`}
      onClose={onClose}
      buttons={[
        {
          text: 'キャンセル',
          style: 'cancel',
          onPress: onClose,
        },
        {
          text: '変更',
          style: 'default',
          onPress: handleRename,
        },
      ]}
    >
      <CustomInlineInput
        style={[
          typography.body,
          styles.inputBorder,
          {
            borderColor: colors.border,
            padding: spacing.md,
            color: colors.text,
            backgroundColor: colors.background,
          },
        ]}
        placeholder={itemType === 'folder' ? '新しいフォルダ名' : '新しいノート名'}
        placeholderTextColor={colors.textSecondary}
        value={inputValue}
        onChangeText={setInputValue}
        autoFocus
        onSubmitEditing={handleRename}
      />
    </CustomModal>
  );
};
