/**
 * @file CategoryActionsModal.tsx
 * @summary カテゴリーアクション選択モーダル
 * @description
 * 長押しされたカテゴリーに対する操作を選択するモーダル。
 * 削除、名前変更のアクションを提供。
 * ActionsListModalを活用してUI統一。
 */

import React from 'react';
import { ActionsListModal, ActionItem } from '../../../components/ActionsListModal';

interface CategoryActionsModalProps {
  visible: boolean;
  categoryPath: string | null;
  categoryName: string | null;
  fileCount: number;
  onClose: () => void;
  onDelete: (categoryPath: string) => void;
  onRename: (categoryPath: string) => void;
  onExport: (categoryPath: string) => void;
}

export const CategoryActionsModal: React.FC<CategoryActionsModalProps> = ({
  visible,
  categoryPath,
  categoryName,
  fileCount,
  onClose,
  onDelete,
  onRename,
  onExport,
}) => {
  if (!categoryPath || !categoryName) return null;

  const actions: ActionItem[] = [
    {
      icon: 'share-outline',
      label: 'エクスポート',
      onPress: () => {
        onExport(categoryPath);
        onClose();
      },
    },
    {
      icon: 'create-outline',
      label: '名前を変更',
      onPress: () => {
        onRename(categoryPath);
        onClose();
      },
    },
    {
      icon: 'trash-outline',
      label: '削除',
      onPress: () => {
        onDelete(categoryPath);
        onClose();
      },
      destructive: true,
    },
  ];

  return (
    <ActionsListModal
      visible={visible}
      title="カテゴリー操作"
      itemInfo={{
        icon: 'folder',
        name: categoryName,
        metadata: `${fileCount}個のファイル`,
      }}
      actions={actions}
      onClose={onClose}
    />
  );
};
