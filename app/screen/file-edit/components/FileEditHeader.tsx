/**
 * @file NoteEditHeader.tsx
 * @summary ノート編集画面のヘッダータイトル入力コンポーネント
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  TextInput,
  StyleSheet,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
  View,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../../../design/theme/ThemeContext';
import { responsive } from '../../../design/styles/commonStyles';
import { Ionicons } from '@expo/vector-icons';

interface NoteEditHeaderProps {
  title: string;
  onTitleChange: (title: string) => void;
  editable: boolean;
  onCompositionStart?: () => void;
  onCompositionEnd?: (title: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const FileEditHeader: React.FC<NoteEditHeaderProps> = ({
  title,
  onTitleChange,
  editable,
  onCompositionStart,
  onCompositionEnd,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}) => {
  const { colors, typography, spacing } = useTheme();
  const [localTitle, setLocalTitle] = useState(title);
  const isComposingRef = useRef(false);

  useEffect(() => {
    setLocalTitle(title);
  }, [title]);

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: responsive.getResponsiveSize(180, 220, 260),
    },
    headerTitle: {
      ...typography.title,
      color: colors.text,
      flex: 1,
      textAlign: 'left',
    },
    buttonContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    button: {
      paddingHorizontal: spacing.sm,
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
    <View style={styles.container}>
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
      <View style={styles.buttonContainer}>
        <TouchableOpacity onPress={onUndo} disabled={!canUndo} style={styles.button}>
          <Ionicons
            name="arrow-undo-outline"
            size={24}
            color={canUndo ? colors.primary : colors.textSecondary}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={onRedo} disabled={!canRedo} style={styles.button}>
          <Ionicons
            name="arrow-redo-outline"
            size={24}
            color={canRedo ? colors.primary : colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};
