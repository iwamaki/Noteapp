/**
 * @file FileActionsModal.tsx
 * @summary ファイルアクション選択モーダル
 * @description
 * 長押しされたファイルに対する操作を選択するモーダル。
 * 削除、コピー、名前変更などのアクションを提供。
 * ActionsListModalを活用してUI統一し、画面中央に表示。
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActionsListModal, ActionItem } from '../../../components/ActionsListModal';
import { getMetadataText } from '../utils';
import { FileActionsModalProps } from '../types';
import { FILE_LIST_FLAT_CONFIG } from '../config';

export const FileActionsModal: React.FC<FileActionsModalProps> = ({
  visible,
  file,
  onClose,
  onDelete,
  onCopy,
  onRename,
  onEditCategories,
  onEditTags,
  onMove,
  onAttachToChat,
  onExport,
}) => {
  const { t } = useTranslation();

  if (!file) return null;

  // 機能フラグに基づいてアクションリストを構築
  const actions: ActionItem[] = [];

  // チャット添付機能が有効な場合のみ表示
  if (FILE_LIST_FLAT_CONFIG.features.chatAttachEnabled) {
    actions.push({
      icon: 'chatbubble-outline',
      label: t('modals.fileActions.attachToChat'),
      onPress: () => {
        onAttachToChat(file);
        onClose();
      },
    });
  }

  // 常に表示するアクション
  actions.push(
    {
      icon: 'create-outline',
      label: t('modals.fileActions.rename'),
      onPress: () => {
        onRename(file);
        onClose();
      },
    },
    {
      icon: 'folder-outline',
      label: t('modals.fileActions.editCategory'),
      onPress: () => {
        onEditCategories(file);
        onClose();
      },
    },
    {
      icon: 'pricetag-outline',
      label: t('modals.fileActions.editTags'),
      onPress: () => {
        onEditTags(file);
        onClose();
      },
    },
    {
      icon: 'move-outline',
      label: t('modals.fileActions.move'),
      onPress: () => {
        onMove(file);
        onClose();
      },
    },
    {
      icon: 'copy-outline',
      label: t('modals.fileActions.copy'),
      onPress: () => {
        onCopy(file);
        onClose();
      },
    },
    {
      icon: 'share-outline',
      label: t('modals.fileActions.export'),
      onPress: () => {
        onExport(file);
        onClose();
      },
    },
    {
      icon: 'trash-outline',
      label: t('modals.fileActions.delete'),
      onPress: () => {
        onDelete(file);
        onClose();
      },
      destructive: true,
    }
  );

  return (
    <ActionsListModal
      visible={visible}
      title={t('modals.fileActions.title')}
      itemInfo={{
        icon: 'document-text',
        name: file.title,
        metadata: getMetadataText(file),
      }}
      actions={actions}
      onClose={onClose}
    />
  );
};
