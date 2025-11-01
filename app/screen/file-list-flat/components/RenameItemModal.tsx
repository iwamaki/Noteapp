/**
 * @file RenameItemModal.tsx
 * @summary アイテム（ノート/フォルダ）の名前変更モーダル
 */
import React, { useState, useEffect } from 'react';
import { CustomInlineInput } from '../../../components/CustomInlineInput';
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
  const [inputValue, setInputValue] = useState(initialName);

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
        placeholder={itemType === 'folder' ? '新しいフォルダ名' : '新しいノート名'}
        value={inputValue}
        onChangeText={setInputValue}
        onClear={() => setInputValue('')}
        autoFocus
        onSubmitEditing={handleRename}
      />
    </CustomModal>
  );
};
