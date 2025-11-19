/**
 * @file FileActionsModal.tsx
 * @summary ファイルアクション選択モーダル
 * @description
 * 長押しされたファイルに対する操作を選択するモーダル。
 * 削除、コピー、名前変更などのアクションを提供。
 * ActionsListModalを活用してUI統一し、画面中央に表示。
 */

import React from 'react';
import { ActionsListModal, ActionItem } from '../../../components/ActionsListModal';
import { getMetadataText } from '../utils';
import { FileActionsModalProps } from '../types';

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
  if (!file) return null;

  const actions: ActionItem[] = [
    {
      icon: 'chatbubble-outline',
      label: 'チャットに添付',
      onPress: () => {
        onAttachToChat(file);
        onClose();
      },
    },
    {
      icon: 'share-outline',
      label: 'エクスポート',
      onPress: () => {
        onExport(file);
        onClose();
      },
    },
    {
      icon: 'create-outline',
      label: '名前を変更',
      onPress: () => {
        onRename(file);
        onClose();
      },
    },
    {
      icon: 'folder-outline',
      label: 'カテゴリーを編集',
      onPress: () => {
        onEditCategories(file);
        onClose();
      },
    },
    {
      icon: 'pricetag-outline',
      label: 'タグを編集',
      onPress: () => {
        onEditTags(file);
        onClose();
      },
    },
    {
      icon: 'move-outline',
      label: '移動',
      onPress: () => {
        onMove(file);
        onClose();
      },
    },
    {
      icon: 'copy-outline',
      label: 'コピーを作成',
      onPress: () => {
        onCopy(file);
        onClose();
      },
    },
    {
      icon: 'trash-outline',
      label: '削除',
      onPress: () => {
        onDelete(file);
        onClose();
      },
      destructive: true,
    },
  ];

  return (
    <ActionsListModal
      visible={visible}
      title="ファイル操作"
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
