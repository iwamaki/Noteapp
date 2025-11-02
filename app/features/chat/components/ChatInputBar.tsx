/**
 * @file ChatInputBar.tsx
 * @summary このファイルは、アプリケーションのチャット入力バーコンポーネントを定義します。
 * @responsibility ユーザーがメッセージを入力して送信するためのUIを提供し、チャット履歴の表示と管理、
 * およびキーボードの表示状態に応じたレイアウト調整を全て自己管理する責任があります。
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  ScrollView,
} from 'react-native';
import { CustomInlineInput } from '../../../components/CustomInlineInput';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useChat } from '../hooks/useChat';
import { useTheme } from '../../../design/theme/ThemeContext';
import { ChatHistory } from '../components/ChatHistory';
import { ToggleTabButton } from '../components/ToggleTabButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardHeight } from '../../../contexts/KeyboardHeightContext';

export const ChatInputBar: React.FC = () => {
  const { colors, typography, iconSizes } = useTheme();
  const insets = useSafeAreaInsets();
  const { keyboardHeight, setChatInputBarHeight } = useKeyboardHeight();
  const {
    messages,
    isLoading,
    sendMessage,
    resetChat,
    chatAreaHeight,
    panResponder,
    isResizing,
    attachedFiles,
    removeAttachedFile,
    tokenUsage,
    summarizeConversation,
  } = useChat();
  const [inputText, setInputText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const lastHeightRef = useRef<number>(0);

  // ChatInputBarの高さを計測してContextに報告
  const handleLayout = useCallback((event: any) => {
    const { height } = event.nativeEvent.layout;
    const roundedHeight = Math.round(height); // 小数点以下を丸める

    // 高さが実際に変わったときのみ更新（閾値1px以上）
    if (Math.abs(roundedHeight - lastHeightRef.current) > 1) {
      lastHeightRef.current = roundedHeight;
      // スワイプ中はレイアウト更新を抑制
      if (!isResizing) {
        setChatInputBarHeight(roundedHeight);
      }
    }
  }, [isResizing, setChatInputBarHeight]);

  // スワイプ終了時にレイアウトを更新
  useEffect(() => {
    if (!isResizing && lastHeightRef.current > 0) {
      setChatInputBarHeight(lastHeightRef.current);
    }
  }, [isResizing, setChatInputBarHeight]);

  // メッセージ送信処理
  const handleSendMessage = async () => {
    const trimmedInput = inputText.trim();
    if (trimmedInput.length > 0 && !isLoading) {
  
      await sendMessage(trimmedInput);
      setInputText('');
    }
  };

  // 送信可能かどうかの判定
  const canSendMessage = inputText.trim().length > 0 && !isLoading;

  // 静的スタイルをメモ化（テーマが変わったときのみ再作成）
  /* eslint-disable react-native/no-unused-styles */
  const styles = useMemo(
    () => StyleSheet.create({
      container: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 1,
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.tertiary,
        paddingBottom: insets.bottom,
      },
      attachedFileWrapper: {
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.tertiary,
      },
      attachedFilesScrollView: {
        flexDirection: 'row',
      },
      attachedFileContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${colors.primary}15`, // プライマリカラーの薄い背景
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16, // Pill型
        marginRight: 8,
        borderWidth: 1,
        borderColor: `${colors.primary}40`,
      },
      attachedFileIcon: {
        marginRight: 6,
      },
      attachedFileName: {
        fontSize: 12,
        color: colors.primary,
        fontWeight: '600',
        maxWidth: 120,
      },
      inputArea: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingTop: 10,
        paddingBottom: 10,
        backgroundColor: colors.background,
      },
      customInput: {
        flex: 1,
        maxHeight: 100,
        marginRight: 10,
        minHeight: 44,
      },
      sendButton: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.primary,
        borderRadius: 18,
        width: 36,
        height: 36,
      },
      disabledButton: {
        opacity: 0.5,
      },
      disabledButtonText: {
        opacity: 0.7,
      },
    }),
    [colors, typography, insets.bottom]
  );
  /* eslint-enable react-native/no-unused-styles */

  // 動的スタイルを分離（keyboardHeightが変わったときのみ再作成）
  const dynamicContainerStyle = useMemo(
    () => ({ bottom: keyboardHeight }),
    [keyboardHeight]
  );

  return (
    <View style={[styles.container, dynamicContainerStyle]} onLayout={handleLayout}>
        {/* 付箋タブ型の展開ボタン */}
        {!isExpanded && (
          <ToggleTabButton
            onPress={() => setIsExpanded(true)}
            direction="up"
            position="top"
          />
        )}

        {/* メッセージ履歴エリア（展開可能） */}
        {isExpanded && (
          <ChatHistory
            messages={messages}
            isLoading={isLoading}
            onCollapse={() => setIsExpanded(false)}
            onResetChat={resetChat}
            onSummarize={summarizeConversation}
            messageAreaHeight={chatAreaHeight}
            panHandlers={panResponder.panHandlers}
            tokenUsage={tokenUsage}
          />
        )}

        {/* 添付ファイル表示 */}
        {attachedFiles.length > 0 && (
          <View style={styles.attachedFileWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.attachedFilesScrollView}
            >
              {attachedFiles.map((file, index) => (
                <TouchableOpacity
                  key={`${file.filename}-${index}`}
                  style={styles.attachedFileContainer}
                  onPress={() => removeAttachedFile(index)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="document-text"
                    size={14}
                    color={colors.primary}
                    style={styles.attachedFileIcon}
                  />
                  <Text style={styles.attachedFileName} numberOfLines={1}>
                    {file.filename}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* 入力エリア（常に表示） */}
        <View style={styles.inputArea}>
          <CustomInlineInput
            style={styles.customInput}
            placeholder="メッセージを入力..."
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={2000}
            editable={!isLoading}
            onSubmitEditing={handleSendMessage}
            returnKeyType="send"
            blurOnSubmit={false}
            borderColor={colors.background}
          />
          <TouchableOpacity
            style={[styles.sendButton, !canSendMessage && styles.disabledButton]}
            onPress={handleSendMessage}
            disabled={!canSendMessage}
          >
            <MaterialCommunityIcons
              name="arrow-right-bold"
              size={iconSizes.medium}
              color={colors.white}
              style={!canSendMessage && styles.disabledButtonText}
            />
          </TouchableOpacity>
        </View>
    </View>
  );
};
