import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Platform } from 'react-native';

interface ChatInputBarProps {
  onPress: () => void;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({ onPress }) => {
  return (
    <View style={styles.containerWrapper}>
      <TouchableOpacity style={styles.container} onPress={onPress}>
        <Text style={styles.icon}>🤖</Text>
        <Text style={styles.text}>AIチャットを開始...</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  containerWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
    paddingHorizontal: 10,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8, // iOSのホームインジケーターを考慮
    paddingTop: 8,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    minHeight: 50,
  },
  icon: {
    fontSize: 20,
    marginRight: 10,
  },
  text: {
    flex: 1,
    fontSize: 16,
    color: '#6c757d',
  },
});
