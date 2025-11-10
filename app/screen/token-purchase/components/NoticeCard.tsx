/**
 * @file NoticeCard.tsx
 * @summary Notice card component
 * @description Displays important information or warnings using ListItem
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ListItem } from '../../../components/ListItem';
import { useTheme } from '../../../design/theme/ThemeContext';

interface NoticeCardProps {
  title: string;
  text: string;
}

export const NoticeCard: React.FC<NoticeCardProps> = ({ title, text }) => {
  const { colors, spacing } = useTheme();

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.secondary,
      borderRadius: 12,
      padding: spacing.md,
      marginTop: spacing.lg,
    },
  });

  return (
    <View style={styles.container}>
      <ListItem.Title style={{ marginBottom: spacing.xs }}>{title}</ListItem.Title>
      <ListItem.Description numberOfLines={10}>{text}</ListItem.Description>
    </View>
  );
};
