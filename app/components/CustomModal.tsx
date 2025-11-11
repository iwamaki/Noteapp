import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
} from 'react-native';
import { useTheme } from '../design/theme/ThemeContext';
import { responsive } from '../design/styles/responsive';

interface CustomModalButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
  customComponent?: React.ReactNode; // カスタムボタンコンポーネント
  disabled?: boolean; // ボタンを無効化
}

interface CustomModalProps {
  isVisible: boolean;
  title: string;
  message?: string;
  buttons: CustomModalButton[];
  onClose: () => void;
  children?: React.ReactNode;
  fixedFooter?: React.ReactNode; // スクロールエリア外に固定表示する要素
  keyboardVerticalOffset?: number; // キーボードとの間隔（px）、デフォルト: 20
}

export const CustomModal: React.FC<CustomModalProps> = ({
  isVisible,
  title,
  message,
  buttons,
  onClose,
  children,
  fixedFooter,
  keyboardVerticalOffset = 20, // デフォルト: キーボードの上20px
}) => {
  const { colors, typography, spacing } = useTheme();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const styles = StyleSheet.create({
    centeredView: {
      flex: 1,
      justifyContent: isKeyboardVisible ? 'flex-end' : 'center', // キーボード表示時は下寄せ、非表示時は中央
      alignItems: 'center',
      backgroundColor: colors.overlay, // Semi-transparent overlay
      paddingHorizontal: spacing.xl,
      paddingBottom: isKeyboardVisible ? spacing.xl : 0, // キーボード表示時のみ下部余白
      paddingVertical: isKeyboardVisible ? 0 : spacing.xl, // 中央配置時は上下余白
    },
    modalView: {
      backgroundColor: colors.background,
      borderRadius: responsive.getResponsiveSize(10, 15, 20),
      paddingVertical: spacing.lg,
      alignItems: 'stretch',
      shadowColor: colors.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
      width: '100%',
      maxWidth: 400,
      maxHeight: '85%',
      borderWidth: 1,
      borderColor: colors.tertiary,
    },
    modalTitle: {
      ...typography.title,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.lg,
      textAlign: 'center',
      color: colors.text,
    },
    modalMessage: {
      ...typography.body,
      marginBottom: spacing.md,
      paddingHorizontal: spacing.lg,
      textAlign: 'center',
      color: colors.textSecondary,
    },
    childrenContainer: {
      marginVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      flexShrink: 1,
    },
    scrollContentContainer: {
      paddingBottom: spacing.md,
    },
    fixedFooterContainer: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      width: '100%',
      marginTop: spacing.md,
    },
    button: {
      borderRadius: responsive.getResponsiveSize(5, 8, 10),
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      ...typography.body,
      fontSize: (typography.body.fontSize || 16) * 0.875, // 1段階小さく
      fontWeight: 'bold',
    },
    defaultButton: {
      backgroundColor: colors.primary,
    },
    defaultButtonText: {
      color: colors.white,
    },
    cancelButton: {
      backgroundColor: colors.secondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelButtonText: {
      color: colors.text,
    },
    destructiveButton: {
      backgroundColor: colors.danger,
    },
    destructiveButtonText: {
      color: colors.white,
    },
    keyboardAvoidingView: {
      flex: 1,
      width: '100%',
    },
  });

  const getButtonStyles = (style: CustomModalButton['style']) => {
    switch (style) {
      case 'cancel':
        return {
          button: styles.cancelButton,
          text: styles.cancelButtonText,
        };
      case 'destructive':
        return {
          button: styles.destructiveButton,
          text: styles.destructiveButtonText,
        };
      default:
        return {
          button: styles.defaultButton,
          text: styles.defaultButtonText,
        };
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <Pressable style={styles.centeredView} onPress={onClose}>
          <Pressable style={styles.modalView} onPress={() => {}}>
            <Text style={styles.modalTitle}>{title}</Text>
            {message && <Text style={styles.modalMessage}>{message}</Text>}
            {children && (
              <ScrollView
                style={styles.childrenContainer}
                contentContainerStyle={styles.scrollContentContainer}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
                scrollEnabled={true}
                nestedScrollEnabled={true}
              >
                {children}
              </ScrollView>
            )}
            {fixedFooter && (
              <View style={styles.fixedFooterContainer}>
                {fixedFooter}
              </View>
            )}
            <View style={styles.buttonContainer}>
              {buttons.map((button, index) => {
                // カスタムコンポーネントが指定されている場合はそれを使用
                if (button.customComponent) {
                  return (
                    <View key={index} style={{ flex: 1 }}>
                      {button.customComponent}
                    </View>
                  );
                }

                // 通常のボタン
                const { button: buttonStyle, text: textStyle } = getButtonStyles(
                  button.style
                );
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.button,
                      buttonStyle,
                      button.disabled && { opacity: 0.5 }
                    ]}
                    onPress={button.onPress}
                    disabled={button.disabled}
                  >
                    <Text style={[styles.buttonText, textStyle]}>{
                      button.text
                    }</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};
