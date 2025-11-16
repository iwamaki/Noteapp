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
import { FILE_LIST_FLAT_CONFIG } from '../config';
import { CategoryActionsModalProps } from '../types';

export const CategoryActionsModal: React.FC<CategoryActionsModalProps> = ({
  visible,
  categoryPath,
  categoryName,
  fileCount,
  onClose,
  onDelete,
  onRename,
  onExport,
  onCreateQA,
}) => {
  if (!categoryPath || !categoryName) return null;

  // 機能フラグに基づいてアクションリストを構築
  const actions: ActionItem[] = [];

  // RAG機能が有効な場合のみQ&A作成を表示
  if (FILE_LIST_FLAT_CONFIG.features.ragEnabled) {
    actions.push({
      icon: 'bulb-outline',
      label: 'Q&Aを作成',
      onPress: () => {
        onCreateQA(categoryPath, categoryName);
        onClose();
      },
    });
  }

  // 常に表示するアクション
  actions.push(
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
    }
  );

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
