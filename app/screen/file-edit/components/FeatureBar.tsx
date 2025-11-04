/**
 * @file FeatureBar.tsx
 * @summary エディタ画面の機能バーコンポーネント
 * @description
 * ヘッダー直下に配置される機能ボタンバー。
 * タイトル・カテゴリ表示と、要約編集など高機能なボタンを配置。
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  TextInput,
  StyleSheet,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../design/theme/ThemeContext';

interface FeatureBarProps {
  title: string;
  category: string;
  onTitleChange: (title: string) => void;
  onSummaryPress: () => void;
}

export const FeatureBar: React.FC<FeatureBarProps> = ({
  title,
  category,
  onTitleChange,
  onSummaryPress,
}) => {
  const { colors, spacing, typography, iconSizes } = useTheme();
  const [localTitle, setLocalTitle] = useState(title);
  const isComposingRef = useRef(false);

  useEffect(() => {
    setLocalTitle(title);
  }, [title]);

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
      }
    }
  };

  const handleBlur = () => {
    if (isComposingRef.current) {
      isComposingRef.current = false;
      onTitleChange(localTitle);
    }
  };

  const handleSubmitEditing = () => {
    if (isComposingRef.current) {
      isComposingRef.current = false;
      onTitleChange(localTitle);
    }
  };

  const handleSelectionChange = () => {
    setTimeout(() => {
      if (isComposingRef.current) {
        isComposingRef.current = false;
        onTitleChange(localTitle);
      }
    }, 150);
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.md,
    },
    leftSection: {
      flex: 1,
      justifyContent: 'center',
    },
    category: {
      fontSize: 11,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    titleInput: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      padding: 0,
      margin: 0,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: spacing.xs,
    },
    buttonText: {
      ...typography.body,
      color: colors.white,
      fontWeight: '600',
      marginLeft: spacing.xs,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        {category && (
          <Text
            style={styles.category}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {category}
          </Text>
        )}
        <TextInput
          value={localTitle}
          onChangeText={handleChangeText}
          style={styles.titleInput}
          placeholder="ファイルのタイトル"
          placeholderTextColor={colors.textSecondary}
          onKeyPress={handleKeyPress}
          onBlur={handleBlur}
          onSubmitEditing={handleSubmitEditing}
          onSelectionChange={handleSelectionChange}
          autoCorrect={false}
          autoCapitalize="none"
          numberOfLines={1}
        />
      </View>
      <TouchableOpacity
        style={styles.button}
        onPress={onSummaryPress}
        activeOpacity={0.7}
      >
        <Ionicons name="document-text-outline" size={iconSizes.small} color={colors.white} />
        <Text style={styles.buttonText}>要約</Text>
      </TouchableOpacity>
    </View>
  );
};
