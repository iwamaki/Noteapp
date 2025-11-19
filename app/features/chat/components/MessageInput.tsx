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
import { CHAT_CONFIG } from '../config/chatConfig';
import { useTokenBalanceStore } from '../../../settings/settingsStore';
import { useModelSwitch } from '../../../hooks/useModelSwitch';

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
  const { loadedModels, activeModelCategory } = useTokenBalanceStore();
  const { switchModel } = useModelSwitch();

  // loadedModels から Quick/Think モデルを取得（フォールバック付き）
  const quickModel = loadedModels?.quick || 'gemini-2.5-flash';
  const thinkModel = loadedModels?.think || 'gemini-2.5-pro';

  // 現在のモデルがquickかthinkか判定（settingsから直接取得してReactivityを確保）
  const isCurrentlyQuick = activeModelCategory === 'quick';

  // モデルを切り替える（装填されているモデル間でトグル）
  const toggleModel = async () => {
    const newCategory = isCurrentlyQuick ? 'think' : 'quick';
    const newModel = isCurrentlyQuick ? thinkModel : quickModel;
    await switchModel(newCategory, newModel);
  };

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
      paddingHorizontal: CHAT_CONFIG.components.spacing.lg,
      paddingTop: CHAT_CONFIG.components.spacing.lg,
      paddingBottom: CHAT_CONFIG.components.spacing.lg,
      backgroundColor: colors.background,
    },
    customInput: {
      flex: 1,
      maxHeight: CHAT_CONFIG.components.input.maxHeight,
      marginRight: CHAT_CONFIG.components.spacing.lg,
      minHeight: CHAT_CONFIG.components.input.minHeight,
    },
    modelToggleButton: {
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: CHAT_CONFIG.components.border.radius.pill,
      width: CHAT_CONFIG.components.input.buttonSize,
      height: CHAT_CONFIG.components.input.buttonSize,
      marginRight: CHAT_CONFIG.components.spacing.sm,
      borderWidth: 1,
      borderColor: colors.tertiary,
    },
    sendButton: {
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderRadius: CHAT_CONFIG.components.border.radius.pill,
      width: CHAT_CONFIG.components.input.buttonSize,
      height: CHAT_CONFIG.components.input.buttonSize,
    },
    disabledButton: {
      opacity: CHAT_CONFIG.components.opacity.disabled,
    },
    disabledButtonText: {
      opacity: CHAT_CONFIG.components.opacity.muted,
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
        maxLength={CHAT_CONFIG.components.input.maxLength}
        editable={!isLoading}
        onSubmitEditing={handleSendMessage}
        returnKeyType="send"
        blurOnSubmit={false}
        borderColor={colors.background}
      />
      <TouchableOpacity
        style={styles.modelToggleButton}
        onPress={toggleModel}
        disabled={isLoading}
      >
        <MaterialCommunityIcons
          name={isCurrentlyQuick ? 'speedometer' : 'speedometer-slow'}
          size={iconSizes.medium}
          color={isCurrentlyQuick ? colors.accentQuick : colors.accentThink}
        />
      </TouchableOpacity>
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
