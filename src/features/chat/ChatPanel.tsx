/**
 * @deprecated このコンポーネントは非推奨です。
 * 代わりに ChatInputBar コンポーネントを直接使用してください。
 * 
 * 旧実装: モーダル形式のチャットパネル
 * 新実装: ChatInputBar - 画面下部に固定され、展開可能な入力バー
 * 
 * このファイルは後方互換性のために残されていますが、
 * 新しいコードでは使用しないでください。
 */

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { ChatInputBar } from './components/ChatInputBar';
import { ChatContext } from '../../services/api';
import { LLMCommand } from '../../services/llmService';

interface ChatPanelProps {
  context?: ChatContext;
  onCommandReceived?: (commands: LLMCommand[]) => void;
  isVisible: boolean;
  onClose: () => void;
}

/**
 * @deprecated ChatInputBarを直接使用してください
 */
export const ChatPanel: React.FC<ChatPanelProps> = ({ 
  context, 
  onCommandReceived,
  isVisible,
  onClose 
}) => {
  // このコンポーネントは使用すべきではありません
  // ChatInputBarが直接画面に配置されるべきです
  if (!isVisible) return null;

  return (
    <View style={styles.deprecatedWarning}>
      <Text style={styles.warningText}>
        ⚠️ ChatPanel は非推奨です。ChatInputBar を使用してください。
      </Text>
      <ChatInputBar 
        context={context} 
        onCommandReceived={onCommandReceived}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  deprecatedWarning: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  warningText: {
    backgroundColor: '#fff3cd',
    color: '#856404',
    padding: 8,
    textAlign: 'center',
    fontSize: 12,
  },
});
