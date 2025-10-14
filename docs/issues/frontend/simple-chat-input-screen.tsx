/**
 * @file simple-chat-input-screen.tsx
 * @summary このファイルは、アプリケーションのシンプルなチャット入力コンポーネントを定義します。
 * @responsibility ユーザーがメッセージを入力して送信するためのUIを提供し、キーボードの表示状態に応じたレイアウト調整を行う責任があります。
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
  Keyboard,
  Platform,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons'; // Fixed typo

const mockColors = {
  primary: '#007AFF',
  secondary: '#F0F0F0',
  background: '#FFFFFF',
  text: '#333333',
  textSecondary: '#666666',
  border: '#CCCCCC',
  white: '#FFFFFF',
};

const mockTypography = {
  caption: {
    fontSize: 12,
  },
  subtitle: {
    fontSize: 16,
  },
};

const useTheme = () => ({
  colors: mockColors,
  typography: mockTypography,
});

// --- Mock useChatLayoutMetrics ---
const useChatLayoutMetrics = () => ({
  chatInputBarBottomPadding: 10, // Default value
});

// --- Mock useChat Hook ---
const useChat = () => {
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (text: string) => {
    setIsLoading(true);
    console.log('Mock sendMessage:', text);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsLoading(false);
  };

  return {
    isLoading,
    sendMessage,
  };
};

const ChatInput: React.FC<{
  inputText: string;
  setInputText: (text: string) => void;
  handleSendMessage: () => Promise<void>;
  canSendMessage: boolean;
  isLoading: boolean;
  colors: typeof mockColors;
  typography: typeof mockTypography;
  chatInputBarBottomPadding: number;
}> = ({
  inputText,
  setInputText,
  handleSendMessage,
  canSendMessage,
  isLoading,
  colors,
  typography,
  chatInputBarBottomPadding,
}) => {
  const styles = StyleSheet.create({
    inputArea: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 8,
      paddingBottom: chatInputBarBottomPadding,
      backgroundColor: colors.secondary,
    },
    textInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      paddingHorizontal: 15,
      paddingVertical: 10,
      fontSize: typography.subtitle.fontSize,
      backgroundColor: colors.background,
      color: colors.text,
      maxHeight: 100,
      marginRight: 8,
      minHeight: 44,
    },
    sendButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 40,
    },
    disabledButton: {
      backgroundColor: colors.textSecondary,
      opacity: 0.5,
    },
    disabledButtonText: {
      opacity: 0.7,
    },
  });

  return (
    <View style={styles.inputArea}>
      <TextInput
        style={styles.textInput}
        placeholder="メッセージを入力..."
        placeholderTextColor={colors.textSecondary}
        value={inputText}
        onChangeText={setInputText}
        multiline
        maxLength={2000}
        editable={!isLoading}
        onSubmitEditing={handleSendMessage}
        returnKeyType="send"
        blurOnSubmit={false}
      />
      <TouchableOpacity
        style={[styles.sendButton, !canSendMessage && styles.disabledButton]}
        onPress={handleSendMessage}
        disabled={!canSendMessage}
      >
        <Ionicons
          name="send"
          size={24}
          color={colors.white}
          style={!canSendMessage && styles.disabledButtonText}
        />
      </TouchableOpacity>
    </View>
  );
};


const SimpleChatInput: React.FC = () => {
  const { colors, typography } = useTheme();
  const { chatInputBarBottomPadding } = useChatLayoutMetrics();
  const {
    isLoading,
    sendMessage,
  } = useChat();
  const [inputText, setInputText] = useState('');

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
    container: {
      backgroundColor: colors.secondary,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
  });

  return (
    <View style={styles.container}>
      <ChatInput
        inputText={inputText}
        setInputText={setInputText}
        handleSendMessage={handleSendMessage}
        canSendMessage={canSendMessage}
        isLoading={isLoading}
        colors={colors}
        typography={typography}
        chatInputBarBottomPadding={chatInputBarBottomPadding}
      />
    </View>
  );
};

// Main screen component to wrap SimpleChatInput
export default function SimpleChatInputScreen() {
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={standaloneStyles.safeArea}>
        <View style={standaloneStyles.outerContainer}>
          <View style={[standaloneStyles.container, { paddingBottom: keyboardHeight }]}>
            <SimpleChatInput />
          </View>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
const standaloneStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  outerContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
});