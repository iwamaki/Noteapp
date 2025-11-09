/**
 * @file NoticeCard.tsx
 * @summary Notice card component
 * @description Displays important information or warnings
 */

import React from 'react';
import { View, Text } from 'react-native';
import { getSharedStyles } from '../styles/sharedStyles';
import { useTheme } from '../../../design/theme/ThemeContext';

interface NoticeCardProps {
  title: string;
  text: string;
}

export const NoticeCard: React.FC<NoticeCardProps> = ({ title, text }) => {
  const theme = useTheme();
  const sharedStyles = getSharedStyles(theme);

  return (
    <View style={sharedStyles.noteCard}>
      <Text style={sharedStyles.noteTitle}>{title}</Text>
      <Text style={sharedStyles.noteText}>{text}</Text>
    </View>
  );
};
