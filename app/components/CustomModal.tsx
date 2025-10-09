import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
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
}

export const CustomModal: React.FC<CustomModalProps> = ({
  isVisible,
  title,
  message,
  buttons,
  onClose,
}) => {
  const { colors, typography, spacing } = useTheme();

  const styles = StyleSheet.create({
    centeredView: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent overlay
    },
    modalView: {
      margin: spacing.md,
      backgroundColor: colors.background,
      borderRadius: responsive.getResponsiveSize(10, 15, 20),
      padding: spacing.lg,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
      width: '80%', // Adjust as needed
      maxWidth: 400, // Max width for larger screens
    },
    modalTitle: {
      ...typography.h3,
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
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
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
      marginHorizontal: spacing.xs,
    },
    buttonText: {
      ...typography.button,
      color: colors.buttonText,
    },
    defaultButton: {
      backgroundColor: colors.primary,
    },
    cancelButton: {
      backgroundColor: colors.secondary,
    },
    destructiveButton: {
      backgroundColor: colors.error,
    },
  });

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.centeredView} onPress={onClose}>
        <Pressable style={styles.modalView}>
          <Text style={styles.modalTitle}>{title}</Text>
          {message && <Text style={styles.modalMessage}>{message}</Text>}
          <View style={styles.buttonContainer}>
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.button,
                  button.style === 'cancel'
                    ? styles.cancelButton
                    : button.style === 'destructive'
                    ? styles.destructiveButton
                    : styles.defaultButton,
                ]}
                onPress={() => {
                  button.onPress?.();
                  onClose(); // Close modal after button press
                }}
              >
                <Text style={styles.buttonText}>{button.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
