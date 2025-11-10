/**
 * @file PurchaseConfirmModal.tsx
 * @summary Purchase confirmation modal component
 * @description Reusable modal for confirming purchases (tokens, chat items, etc.)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CustomModal } from './CustomModal';
import { useTheme } from '../design/theme/ThemeContext';

export interface PurchaseDetail {
  label: string;
  value: string;
  isPrimary?: boolean; // If true, value will be displayed in primary color
}

interface PurchaseConfirmModalProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  details: PurchaseDetail[];
  purchasing?: boolean;
  confirmButtonText?: string;
  cancelButtonText?: string;
}

export const PurchaseConfirmModal: React.FC<PurchaseConfirmModalProps> = ({
  isVisible,
  onClose,
  onConfirm,
  title,
  message,
  details,
  purchasing = false,
  confirmButtonText = '購入する',
  cancelButtonText = 'キャンセル',
}) => {
  const { colors, spacing, typography } = useTheme();

  const styles = StyleSheet.create({
    detailContainer: {
      marginVertical: spacing.sm,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
    },
    detailLabel: {
      ...typography.body,
      color: colors.textSecondary,
    },
    detailValue: {
      ...typography.body,
      fontWeight: '700',
      color: colors.text,
    },
    detailValuePrimary: {
      ...typography.body,
      fontWeight: '700',
      color: colors.primary,
    },
  });

  return (
    <CustomModal
      isVisible={isVisible}
      title={title}
      message={message}
      onClose={onClose}
      buttons={[
        {
          text: cancelButtonText,
          style: 'cancel',
          onPress: onClose,
        },
        {
          text: purchasing ? '購入中...' : confirmButtonText,
          style: 'default',
          onPress: onConfirm,
        },
      ]}
    >
      <View style={styles.detailContainer}>
        {details.map((detail, index) => (
          <View key={index} style={styles.detailRow}>
            <Text style={styles.detailLabel}>{detail.label}</Text>
            <Text
              style={detail.isPrimary ? styles.detailValuePrimary : styles.detailValue}
            >
              {detail.value}
            </Text>
          </View>
        ))}
      </View>
    </CustomModal>
  );
};
