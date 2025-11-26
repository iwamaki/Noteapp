/**
 * @file MessageInput.tsx
 * @summary メッセージ入力エリアコンポーネント
 * @responsibility ユーザーがメッセージを入力して送信するための入力フィールドと送信ボタンを提供
 */

import React, { useMemo } from 'react';
import { View, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { CustomInlineInput } from '../../../components/CustomInlineInput';
import { useTheme } from '../../../design/theme/ThemeContext';
import { useChat } from '../hooks/useChat';
import { CHAT_CONFIG } from '../config/chatConfig';
import { useTokenBalanceStore } from '../../settings/settingsStore';
import { useModelSwitch } from '../../settings/hooks/useModelSwitch';
import { useAuth } from '../../auth/authStore';

interface MessageInputProps {
  inputText: string;
  setInputText: (text: string) => void;
}

/**
 * メッセージ入力コンポーネント
 */
const MessageInputComponent: React.FC<MessageInputProps> = ({ inputText, setInputText }) => {
  const { t } = useTranslation();
  const { colors, iconSizes } = useTheme();
  const { sendMessage, isLoading } = useChat();
  const { loadedModels, activeModelCategory } = useTokenBalanceStore();
  const { switchModel } = useModelSwitch();
  const { isAuthenticated } = useAuth();

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
      // ログインチェック
      if (!isAuthenticated) {
        Alert.alert(
          t('chat.loginRequired.title'),
          t('chat.loginRequired.message'),
          [
            {
              text: t('common.ok'),
              style: 'default',
            },
          ]
        );
        return;
      }

      await sendMessage(trimmedInput);
      setInputText('');
    }
  };

  // 送信可能かどうかの判定
  const canSendMessage = inputText.trim().length > 0 && !isLoading;

  // 動的スタイルをメモ化
  const styles = useMemo(
    () => ({
      inputArea: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
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
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
        backgroundColor: colors.background,
        borderRadius: CHAT_CONFIG.components.border.radius.pill,
        width: CHAT_CONFIG.components.input.buttonSize,
        height: CHAT_CONFIG.components.input.buttonSize,
        marginRight: CHAT_CONFIG.components.spacing.sm,
        borderWidth: 1,
        borderColor: colors.tertiary,
      },
      sendButton: {
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
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
    }),
    [colors]
  );

  return (
    <View style={styles.inputArea}>
      <CustomInlineInput
        style={styles.customInput}
        placeholder={t('chat.input.placeholder')}
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

export const MessageInput = React.memo(MessageInputComponent);
MessageInput.displayName = 'MessageInput';
