import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Text,
} from 'react-native';

interface ChatInputBarProps {
  onFocus: () => void; // 親コンポーネントにフォーカスイベントを通知
  isChatPanelVisible: boolean;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  onFocus,
  isChatPanelVisible,
}) => {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardAvoidingContainer}
    >
      <View style={styles.container}>
        <TextInput
          style={styles.textInput}
          placeholder="AIに質問する..."
          placeholderTextColor="#999"
          onFocus={onFocus} // フォーカス時に親コンポーネントに通知
          editable={!isChatPanelVisible} // チャットパネル表示中は編集不可
        />
        <TouchableOpacity
          style={styles.sendButton}
          onPress={onFocus} // 送信ボタンもチャットパネルを開くトリガーに
          disabled={isChatPanelVisible} // チャットパネル表示中は無効
        >
          <Text style={styles.sendButtonText}>チャット</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f8f9fa', // 背景色をChatPanelのヘッダーと合わせる
    borderTopWidth: 1,
    borderTopColor: '#dee2e6', // ボーダー色をChatPanelのヘッダーと合わせる
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
    borderRadius: 20, // より丸みを帯びたデザインに
    paddingHorizontal: 15,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: '#fff',
    marginRight: 8,
    minHeight: 40, // 最小の高さを設定
  },
  sendButton: {
    backgroundColor: '#007bff',
    borderRadius: 20, // より丸みを帯びたデザインに
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
