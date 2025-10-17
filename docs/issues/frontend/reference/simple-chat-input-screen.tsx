/**
 * @file simple-chat-input-screen.tsx
 * @summary このファイルは、アプリケーションのシンプルなチャット入力コンポーネントを定義します。
 * @responsibility ユーザーがメッセージを入力して送信するためのUIを提供し、キーボードの表示状態に応じたレイアウト調整を行う責任があります。
 */

import React, { useState, useEffect, useRef } from 'react';
import { Keyboard, View, TextInput, TouchableOpacity, StyleSheet, ScrollView, StyleProp, ViewStyle, findNodeHandle, UIManager } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// =============================================================================
// 定数・テーマ定義
// =============================================================================

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

// =============================================================================
// カスタムフック
// =============================================================================

/**
 * テーマ情報を提供するフック
 */
const useTheme = () => ({
  colors: mockColors,
  typography: mockTypography,
});

/**
 * チャット機能を提供するフック
 */
const useChat = () => {
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (text: string) => {
    setIsLoading(true);
    console.log('Mock sendMessage:', text);
    // APIコールをシミュレート
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsLoading(false);
  };

  return {
    isLoading,
    sendMessage,
  };
};

// =============================================================================
// 型定義
// =============================================================================

interface ChatInputProps {
  inputText: string;
  setInputText: (text: string) => void;
  handleSendMessage: () => Promise<void>;
  canSendMessage: boolean;
  isLoading: boolean;
  colors: typeof mockColors;
  typography: typeof mockTypography;
}

interface SimpleChatInputProps {
  bottomInset: number;
  keyboardHeight: number;
  style?: StyleProp<ViewStyle>;
}

// =============================================================================
// コンポーネント
// =============================================================================

/**
 * チャット入力エリアコンポーネント
 * テキスト入力と送信ボタンを含む
 */
const ChatInput: React.FC<ChatInputProps> = ({
  inputText,
  setInputText,
  handleSendMessage,
  canSendMessage,
  isLoading,
  colors,
  typography,
}) => {
  const styles = StyleSheet.create({
    inputArea: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: 'magenta',
    },
    textInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      paddingHorizontal: 15,
      paddingVertical: 10,
      fontSize: typography.subtitle.fontSize,
      backgroundColor: 'cyan',
      color: colors.text,
      maxHeight: 100,
      marginRight: 8,
      minHeight: 44,
    },
    sendButton: {
      backgroundColor: 'purple',
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


/**
 * シンプルなチャット入力コンポーネント
 * ChatInputをラップし、キーボードとセーフエリアの調整を行う
 */
const SimpleChatInput: React.FC<SimpleChatInputProps> = ({ bottomInset, keyboardHeight, style }) => {
  const { colors, typography } = useTheme();
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
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: 'yellow',
      paddingBottom: bottomInset,
    },
  });

  return (
    <View style={[styles.container, style]}>
      <ChatInput
        inputText={inputText}
        setInputText={setInputText}
        handleSendMessage={handleSendMessage}
        canSendMessage={canSendMessage}
        isLoading={isLoading}
        colors={colors}
        typography={typography}
      />
    </View>
  );
};


// =============================================================================
// メインスクリーンコンポーネント
// =============================================================================

/**
 * シンプルチャット入力スクリーン
 * メインコンテンツエリアとチャット入力エリアを含む画面
 */
export default function SimpleChatInputScreen() {
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const mainTextInputRef = useRef<TextInput>(null);

  // キーボード表示時の自動スクロール処理
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);

        // テキスト入力エリアをキーボード上に表示するためのスクロール処理
        if (mainTextInputRef.current && scrollViewRef.current) {
          const mainTextInputNode = findNodeHandle(mainTextInputRef.current);
          const scrollViewNode = findNodeHandle(scrollViewRef.current);

          if (mainTextInputNode && scrollViewNode) {
            UIManager.measureLayout(
              mainTextInputNode,
              scrollViewNode,
              () => {
                console.warn('measureLayout failed');
              },
              (x, y, width, height) => {
                const textInputBottom = y + height;
                const screenHeight = e.endCoordinates.screenY;
                const visibleAreaBottom = screenHeight - insets.bottom;

                if (textInputBottom > visibleAreaBottom) {
                  scrollViewRef.current?.scrollTo({
                    y: textInputBottom - visibleAreaBottom + (insets.bottom || 0),
                    animated: true,
                  });
                }
              }
            );
          }
        }
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, [insets.bottom]);

  const screenStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'white',
    },
    scrollViewContent: {
      flexGrow: 1,
      paddingBottom: insets.bottom,
    },
    mainTextInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: 'gray',
      padding: 10,
      borderRadius: 5,
      margin: 20,
      textAlignVertical: 'top',
    },
  });

  return (
    <SafeAreaProvider>
      <View style={screenStyles.container}>
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={screenStyles.scrollViewContent}
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
            ref={mainTextInputRef}
            style={screenStyles.mainTextInput}
            placeholder="メインコンテンツのテキスト入力エリア..."
            multiline
          />
        </ScrollView>
        <SimpleChatInput
          bottomInset={insets.bottom}
          keyboardHeight={keyboardHeight}
          style={{ marginBottom: keyboardHeight }}
        />
      </View>
    </SafeAreaProvider>
  );
}