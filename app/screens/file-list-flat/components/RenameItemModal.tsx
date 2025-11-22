/**
 * @file RenameItemModal.tsx
 * @summary ノートの名前変更モーダル
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { InputFormModal } from '../../../components/InputFormModal';
import { RenameItemModalProps } from '../types';

export const RenameItemModal: React.FC<RenameItemModalProps> = ({
  visible,
  initialName,
  onClose,
  onRename,
}) => {
  const { t } = useTranslation();

  const handleRename = (newName: string) => {
    onRename(newName);
    onClose();
  };

  return (
    <InputFormModal
      visible={visible}
      title={t('modals.renameItem.title')}
      message={t('modals.renameItem.message')}
      initialValue={initialName}
      placeholder={t('modals.renameItem.placeholder')}
      onClose={onClose}
      onSubmit={handleRename}
      submitButtonText={t('common.button.rename')}
      validateInput={(value) => value.length > 0}
    />
  );
};
