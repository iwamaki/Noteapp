import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
} from 'react-native';

interface ChatInputBarProps {
  onFocus: () => void;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({ onFocus }) => {
  return (
    <View style={styles.containerWrapper}>
      <View style={styles.container}>
        <TextInput
          style={styles.textInput}
          placeholder="AIに質問する..."
          placeholderTextColor="#999"
          onFocus={onFocus}
        />
        <TouchableOpacity style={styles.sendButton} onPress={onFocus}>
          <Text style={styles.sendButtonText}>チャット</Text>
        </TouchableOpacity>
      </View>
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
    paddingVertical: 8,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: '#fff',
    marginRight: 8,
    minHeight: 40,
  },
  sendButton: {
    backgroundColor: '#007bff',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
