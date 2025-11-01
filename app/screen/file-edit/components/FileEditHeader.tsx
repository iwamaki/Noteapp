/**
 * @file FileEditHeader.tsx
 * @summary ファイル編集画面のヘッダータイトル入力コンポーネント
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  TextInput,
  StyleSheet,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';
import { useTheme } from '../../../design/theme/ThemeContext';

interface FileEditHeaderProps {
  title: string;
  onTitleChange: (title: string) => void;
  editable: boolean;
  onCompositionStart?: () => void;
  onCompositionEnd?: (title: string) => void;
}

export const FileEditHeader: React.FC<FileEditHeaderProps> = ({
  title,
  onTitleChange,
  editable,
  onCompositionStart,
  onCompositionEnd,
}) => {
  const { colors, typography } = useTheme();
  const [localTitle, setLocalTitle] = useState(title);
  const isComposingRef = useRef(false);

  useEffect(() => {
    setLocalTitle(title);
  }, [title]);

  const styles = StyleSheet.create({
    headerTitle: {
      ...typography.title,
      color: colors.text,
      flex: 1,
      textAlign: 'left',
    },
  });

  const handleChangeText = (text: string) => {
    setLocalTitle(text);
    if (!isComposingRef.current) {
      onTitleChange(text);
    }
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (e.nativeEvent.key === 'Unidentified' || e.nativeEvent.key === 'Process') {
      if (!isComposingRef.current) {
        isComposingRef.current = true;
        onCompositionStart?.();
      }
    }
  };

  const handleBlur = () => {
    if (isComposingRef.current) {
      isComposingRef.current = false;
      onCompositionEnd?.(localTitle);
    }
  };

  const handleSubmitEditing = () => {
    if (isComposingRef.current) {
      isComposingRef.current = false;
      onCompositionEnd?.(localTitle);
    }
  };

  const handleSelectionChange = () => {
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
      placeholder="ファイルのタイトル"
      placeholderTextColor={colors.textSecondary}
      editable={editable}
      onKeyPress={handleKeyPress}
      onBlur={handleBlur}
      onSubmitEditing={handleSubmitEditing}
      onSelectionChange={handleSelectionChange}
      autoCorrect={false}
      autoCapitalize="none"
    />
  );
};
