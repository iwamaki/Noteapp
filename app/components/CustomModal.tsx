import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../design/theme/ThemeContext';
import { responsive } from '../design/styles/commonStyles';

interface CustomModalButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface CustomModalProps {
  isVisible: boolean;
  title: string;
  message?: string;
  buttons: CustomModalButton[];
  onClose: () => void;
  children?: React.ReactNode;
}

export const CustomModal: React.FC<CustomModalProps> = ({
  isVisible,
  title,
  message,
  buttons,
  onClose,
  children,
}) => {
  const { colors, typography, spacing } = useTheme();

  const styles = StyleSheet.create({
    centeredView: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.overlay, // Semi-transparent overlay
    },
    modalView: {
      margin: spacing.md,
      backgroundColor: colors.background,
      borderRadius: responsive.getResponsiveSize(10, 15, 20),
      padding: spacing.lg,
      alignItems: 'stretch', // Changed to stretch for children
      shadowColor: colors.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
      width: '80%', // Adjust as needed
      maxWidth: 400,
      borderWidth: 2,
      borderColor: colors.secondary,
    },
    modalTitle: {
      ...typography.title,
      marginBottom: spacing.sm,
      textAlign: 'center',
      color: colors.text,
    },
    modalMessage: {
      ...typography.body,
      marginBottom: spacing.lg,
      textAlign: 'center',
      color: colors.textSecondary,
    },
    childrenContainer: {
      marginVertical: spacing.md,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: spacing.md,
      width: '100%',
      marginTop: spacing.md,
    },
    button: {
      borderRadius: responsive.getResponsiveSize(5, 8, 10),
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      minWidth: 80,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      ...typography.body,
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
      justifyContent: 'center',
      alignItems: 'center',
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
      <Pressable style={styles.centeredView} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <Pressable style={styles.modalView} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{title}</Text>
            {message && <Text style={styles.modalMessage}>{message}</Text>}
            {children && <View style={styles.childrenContainer}>{children}</View>}
            <View style={styles.buttonContainer}>
              {buttons.map((button, index) => {
                const { button: buttonStyle, text: textStyle } = getButtonStyles(
                  button.style
                );
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.button, buttonStyle]}
                    onPress={button.onPress}
                  >
                    <Text style={[styles.buttonText, textStyle]}>{
                      button.text
                    }</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
};
