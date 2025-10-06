/**
 * @file useLLMCommandHandler.ts
 * @summary このファイルは、LLM（大規模言語モデル）からのコマンドを処理するカスタムフックを定義します。
 * @responsibility LLMから受け取ったコマンド（例: ファイル編集）を解釈し、アプリケーションの状態を適切に更新したり、関連する画面遷移をトリガーしたりする責任があります。
 */
import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { LLMCommand, LLMResponse } from '../services/llmService';
import { useNoteStore } from '../store/note';
import { logger } from '../utils/logger'; // loggerをインポート
import { useNoteOperations } from '../hooks/useNoteOperations';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface CommandHandlerContext {
  currentContent: string;
  setContent: (content: string) => void;
  title: string;
}

export const useLLMCommandHandler = (context: CommandHandlerContext) => {
  const navigation = useNavigation<NavigationProp>();
  const activeNote = useNoteStore(state => state.activeNote);
  const { updateNote } = useNoteOperations();

  const executeEditFileCommand = useCallback((command: LLMCommand) => {
    if (!command.content) {
      logger.warn('llm', 'edit_file command missing content');
      return;
    }

    if (!activeNote?.id) {
      logger.warn('llm', 'No active note to apply LLM edit to.');
      return;
    }

    logger.debug('llm', '[LLMCommandHandler] Executing edit_file command', {
      originalContentLength: context.currentContent.length,
      newContentLength: command.content.length,
      originalPreview: context.currentContent.substring(0, 100),
      newPreview: command.content.substring(0, 100)
    });

    navigation.navigate('DiffView', {
      originalContent: context.currentContent,
      newContent: command.content,
      mode: 'apply',
      onApply: async (approvedContent: string) => {
        if (activeNote?.id) {
          await updateNote(activeNote.id, { content: approvedContent });
          context.setContent(approvedContent); // Update local editor state
          logger.debug('llm', '[LLMCommandHandler] LLM edit applied and note updated.');
        }
      },
    });
  }, [navigation, context, activeNote, updateNote]);

  const executeCommand = useCallback((command: LLMCommand) => {
    switch (command.action) {
      case 'edit_file':
        executeEditFileCommand(command);
        break;
      default:
        logger.warn('llm', 'Unknown command action', { action: command.action });
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