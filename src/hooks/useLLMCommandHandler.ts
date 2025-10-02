import { useCallback, useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { LLMCommand, LLMResponse } from '../services/llmService';
import { useNoteStore } from '../store/noteStore';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface CommandHandlerContext {
  currentContent: string;
  setContent: (content: string) => void;
  title: string;
}

export const useLLMCommandHandler = (context: CommandHandlerContext) => {
  const navigation = useNavigation<NavigationProp>();
  const { activeNote } = useNoteStore();
  const previousContentRef = useRef<string>(context.currentContent);
  const isWaitingForUpdateRef = useRef<boolean>(false);

  // activeNoteの内容が変更された場合に編集中のコンテンツを更新
  useEffect(() => {
    if (isWaitingForUpdateRef.current && activeNote && activeNote.content !== previousContentRef.current) {
      console.log('[LLMCommandHandler] Applying updated content from store');
      context.setContent(activeNote.content);
      previousContentRef.current = activeNote.content;
      isWaitingForUpdateRef.current = false;
    }
  }, [activeNote, context]);

  // 画面のフォーカス時にコンテンツの同期をチェック
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (activeNote && activeNote.content !== context.currentContent) {
        console.log('[LLMCommandHandler] Syncing content on screen focus');
        context.setContent(activeNote.content);
        previousContentRef.current = activeNote.content;
      }
    });

    return unsubscribe;
  }, [navigation, activeNote, context]);

  const executeEditFileCommand = useCallback((command: LLMCommand) => {
    if (!command.content) {
      console.warn('edit_file command missing content');
      return;
    }

    console.log('[LLMCommandHandler] Executing edit_file command:', {
      originalContentLength: context.currentContent.length,
      newContentLength: command.content.length,
      originalPreview: context.currentContent.substring(0, 100),
      newPreview: command.content.substring(0, 100)
    });

    // DiffViewから戻ってきた際の更新を待機状態にする
    isWaitingForUpdateRef.current = true;
    previousContentRef.current = context.currentContent;

    navigation.navigate('DiffView', {
      originalContent: context.currentContent,
      newContent: command.content,
      mode: 'save'
    });
  }, [navigation, context]);

  const executeCommand = useCallback((command: LLMCommand) => {
    switch (command.action) {
      case 'edit_file':
        executeEditFileCommand(command);
        break;
      default:
        console.warn(`Unknown command action: ${command.action}`);
    }
  }, [executeEditFileCommand]);

  const handleLLMResponse = useCallback((response: LLMResponse) => {
    if (!response.commands || response.commands.length === 0) {
      return;
    }

    response.commands.forEach(command => {
      executeCommand(command);
    });
  }, [executeCommand]);

  return {
    handleLLMResponse,
    executeCommand
  };
};