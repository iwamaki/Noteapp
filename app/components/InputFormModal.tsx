/**
 * @file InputFormModal.tsx
 * @summary 入力フォーム付きモーダル共通コンポーネント
 * @description
 * 単一の入力フィールドを持つモーダルを共通化。
 * 入力値の管理、初期値の設定、保存/キャンセル処理を内包。
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomInlineInput } from './CustomInlineInput';
import { CustomModal } from './CustomModal';

interface InputFormModalProps {
  visible: boolean;
  title: string;
  message?: string;
  initialValue: string;
  placeholder: string;
  onClose: () => void;
  onSubmit: (value: string) => void;
  children?: React.ReactNode;
  multiline?: boolean;
  submitButtonText?: string;
  cancelButtonText?: string;
  validateInput?: (value: string) => boolean;
}

/**
 * 入力フォーム付きモーダル
 *
 * 入力値の管理を内部で行い、保存時に onSubmit で値を返す。
 * children には追加のコンテンツ（ヒント、影響範囲表示など）を渡せる。
 */
export const InputFormModal: React.FC<InputFormModalProps> = ({
  visible,
  title,
  message,
  initialValue,
  placeholder,
  onClose,
  onSubmit,
  children,
  multiline = false,
  submitButtonText,
  cancelButtonText,
  validateInput,
}) => {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState(initialValue);

  // デフォルトのボタンテキストを翻訳キーから取得
  const defaultSubmitText = submitButtonText || t('common.button.save');
  const defaultCancelText = cancelButtonText || t('common.button.cancel');

  // モーダルが表示されるたびに初期値をリセット
  useEffect(() => {
    if (visible) {
      setInputValue(initialValue);
    }
  }, [visible, initialValue]);

  const handleSubmit = () => {
    const trimmedValue = inputValue.trim();

    // バリデーション
    if (validateInput && !validateInput(trimmedValue)) {
      return;
    }

    // 変更がない場合は何もしない
    if (trimmedValue === initialValue.trim()) {
      return;
    }

    onSubmit(trimmedValue);
  };

  return (
    <CustomModal
      isVisible={visible}
      title={title}
      message={message}
      onClose={onClose}
      buttons={[
        {
          text: defaultCancelText,
          style: 'cancel',
          onPress: onClose,
        },
        {
          text: defaultSubmitText,
          style: 'default',
          onPress: handleSubmit,
        },
      ]}
    >
      <CustomInlineInput
        placeholder={placeholder}
        value={inputValue}
        onChangeText={setInputValue}
        onClear={() => setInputValue('')}
        autoFocus
        onSubmitEditing={handleSubmit}
        multiline={multiline}
      />
      {children}
    </CustomModal>
  );
};
