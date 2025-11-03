/**
 * @file MessageInput.tsx
 * @summary メッセージ入力エリアコンポーネント
 * @responsibility ユーザーがメッセージを入力して送信するための入力フィールドと送信ボタンを提供
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CustomInlineInput } from '../../../components/CustomInlineInput';
import { useTheme } from '../../../design/theme/ThemeContext';
import { useChatUI } from '../contexts/ChatUIContext';

interface MessageInputProps {
  inputText: string;
  setInputText: (text: string) => void;
}

/**
 * メッセージ入力コンポーネント
 */
export const MessageInput: React.FC<MessageInputProps> = ({ inputText, setInputText }) => {
  const { colors, iconSizes } = useTheme();
  const { sendMessage, isLoading } = useChatUI();

  // メッセージ送信処理
  const handleSendMessage = async () => {
    const trimmedInput = inputText.trim();
    if (trimmedInput.length > 0 && !isLoading) {
      await sendMessage(trimmedInput);
      setInputText('');
    }
  };

  // 送信可能かどうかの判定
  const canSendMessage = inputText.trim().length > 0 && !isLoading;

  const styles = StyleSheet.create({
    inputArea: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingTop: 10,
      paddingBottom: 10,
      backgroundColor: colors.background,
    },
    customInput: {
      flex: 1,
      maxHeight: 100,
      marginRight: 10,
      minHeight: 44,
    },
    sendButton: {
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderRadius: 18,
      width: 36,
      height: 36,
    },
    disabledButton: {
      opacity: 0.5,
    },
    disabledButtonText: {
      opacity: 0.7,
    },
  });

  return (
    <View style={styles.inputArea}>
      <CustomInlineInput
        style={styles.customInput}
        placeholder="メッセージを入力..."
        value={inputText}
        onChangeText={setInputText}
        multiline
        maxLength={2000}
        editable={!isLoading}
        onSubmitEditing={handleSendMessage}
        returnKeyType="send"
        blurOnSubmit={false}
        borderColor={colors.background}
      />
      <TouchableOpacity
        style={[styles.sendButton, !canSendMessage && styles.disabledButton]}
        onPress={handleSendMessage}
        disabled={!canSendMessage}
      >
        <MaterialCommunityIcons
          name="arrow-right-bold"
          size={iconSizes.medium}
          color={colors.white}
          style={!canSendMessage && styles.disabledButtonText}
        />
      </TouchableOpacity>
    </View>
  );
};
