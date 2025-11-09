/**
 * @file NoticeCard.tsx
 * @summary Notice card component
 * @description Displays important information or warnings
 */

import React from 'react';
import { View, Text } from 'react-native';
import { sharedStyles } from '../styles/sharedStyles';

interface NoticeCardProps {
  title: string;
  text: string;
}

export const NoticeCard: React.FC<NoticeCardProps> = ({ title, text }) => {
  return (
    <View style={sharedStyles.noteCard}>
      <Text style={sharedStyles.noteTitle}>{title}</Text>
      <Text style={sharedStyles.noteText}>{text}</Text>
    </View>
  );
};
