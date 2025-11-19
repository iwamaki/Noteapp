/**
 * @file RenameItemModal.tsx
 * @summary ノートの名前変更モーダル
 */
import React from 'react';
import { InputFormModal } from '../../../components/InputFormModal';
import { RenameItemModalProps } from '../types';

export const RenameItemModal: React.FC<RenameItemModalProps> = ({
  visible,
  initialName,
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
      title="ノート名を変更"
      message="新しいノート名を入力してください。"
      initialValue={initialName}
      placeholder="新しいノート名"
      onClose={onClose}
      onSubmit={handleRename}
      submitButtonText="変更"
      validateInput={(value) => value.length > 0}
    />
  );
};
