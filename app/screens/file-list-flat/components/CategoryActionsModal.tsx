/**
 * @file CategoryActionsModal.tsx
 * @summary カテゴリーアクション選択モーダル
 * @description
 * 長押しされたカテゴリーに対する操作を選択するモーダル。
 * 削除、名前変更のアクションを提供。
 * ActionsListModalを活用してUI統一。
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

  if (!categoryPath || !categoryName) return null;

  // 機能フラグに基づいてアクションリストを構築
  const actions: ActionItem[] = [];

  // RAG機能が有効な場合のみQ&A作成を表示
  if (FILE_LIST_FLAT_CONFIG.features.ragEnabled) {
    actions.push({
      icon: 'bulb-outline',
      label: t('modals.categoryActions.createQA'),
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
      label: t('modals.categoryActions.export'),
      onPress: () => {
        onExport(categoryPath);
        onClose();
      },
    },
    {
      icon: 'create-outline',
      label: t('modals.categoryActions.rename'),
      onPress: () => {
        onRename(categoryPath);
        onClose();
      },
    },
    {
      icon: 'trash-outline',
      label: t('modals.categoryActions.delete'),
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
      title={t('modals.categoryActions.title')}
      itemInfo={{
        icon: 'folder',
        name: categoryName,
        metadata: t('modals.categoryActions.fileCount', { count: fileCount }),
      }}
      actions={actions}
      onClose={onClose}
    />
  );
};
