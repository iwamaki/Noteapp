/**
 * @file RenameItemModal.tsx
 * @summary アイテム（ノート/フォルダ）の名前変更モーダル
 */
import React from 'react';
import { InputFormModal } from '../../../components/InputFormModal';

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
  const handleRename = (newName: string) => {
    onRename(newName);
    onClose();
  };

  return (
    <InputFormModal
      visible={visible}
      title={itemType === 'folder' ? 'フォルダ名を変更' : 'ノート名を変更'}
      message={`新しい${itemType === 'folder' ? 'フォルダ名' : 'ノート名'}を入力してください。`}
      initialValue={initialName}
      placeholder={itemType === 'folder' ? '新しいフォルダ名' : '新しいノート名'}
      onClose={onClose}
      onSubmit={handleRename}
      submitButtonText="変更"
      validateInput={(value) => value.length > 0}
    />
  );
};
