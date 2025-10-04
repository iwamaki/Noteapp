/**
 * @file NoteEditHeader.tsx
 * @summary ノート編集画面のヘッダータイトル入力コンポーネント
 */

import React, { useState, useRef } from 'react';
import { TextInput, StyleSheet, Platform, NativeSyntheticEvent, TextInputKeyPressEventData } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { responsive } from '../../../utils/commonStyles';

interface NoteEditHeaderProps {
  title: string;
  onTitleChange: (title: string) => void;
  editable: boolean;
  onCompositionStart?: () => void;
  onCompositionEnd?: (title: string) => void;
}

export const NoteEditHeader: React.FC<NoteEditHeaderProps> = ({
  title,
  onTitleChange,
  editable,
  onCompositionStart,
  onCompositionEnd,
}) => {
  const { colors, typography } = useTheme();
  const [localTitle, setLocalTitle] = useState(title);
  const isComposingRef = useRef(false);

  const styles = StyleSheet.create({
    headerTitle: {
      ...typography.title,
      color: colors.text,
      width: responsive.getResponsiveSize(180, 200, 220),
      textAlign: 'left',
    },
  });

  const handleChangeText = (text: string) => {
    setLocalTitle(text);
    // IME入力中でなければ即座に親に通知
    if (!isComposingRef.current) {
      onTitleChange(text);
    }
  };


  // Android/iOSでのIME入力検知
  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    // IME入力の開始を検知（完全ではないが補助的に使用）
    if (e.nativeEvent.key === 'Unidentified' || e.nativeEvent.key === 'Process') {
      if (!isComposingRef.current) {
        isComposingRef.current = true;
        onCompositionStart?.();
      }
    }
  };

  // フォーカス喪失時にIME入力終了とみなす
  const handleBlur = () => {
    if (isComposingRef.current) {
      isComposingRef.current = false;
      onCompositionEnd?.(localTitle);
    }
  };

  // 確定キー（Enterなど）押下時
  const handleSubmitEditing = () => {
    if (isComposingRef.current) {
      isComposingRef.current = false;
      onCompositionEnd?.(localTitle);
    }
  };

  // セレクション変更時（カーソル移動時）にもIME終了判定
  const handleSelectionChange = () => {
    // 一定時間後にIME状態をチェック（IME確定後のカーソル移動）
    setTimeout(() => {
      if (isComposingRef.current) {
        isComposingRef.current = false;
        onCompositionEnd?.(localTitle);
      }
    }, 150);
  };

  return (
    <TextInput
      value={localTitle}
      onChangeText={handleChangeText}
      style={styles.headerTitle}
      placeholder="ノートのタイトル"
      placeholderTextColor={colors.textSecondary}
      editable={editable}
      onKeyPress={handleKeyPress}
      onBlur={handleBlur}
      onSubmitEditing={handleSubmitEditing}
      onSelectionChange={handleSelectionChange}
      // IME入力を有効にする
      autoCorrect={false}
      autoCapitalize="none"
    />
  );
};
