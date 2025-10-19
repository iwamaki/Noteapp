/**
 * @file FileEditor.tsx
 * @summary このファイルは、アプリケーションのファイルエディタコンポーネントを定義します。
 * @responsibility ユーザーがファイルのコンテンツを編集、プレビュー、または差分表示できるインターフェースを提供し、異なる表示モード間の切り替えを管理する責任があります。
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../../design/theme/ThemeContext';

import { MarkdownPreview } from './MarkdownPreview';
import { TextEditor } from './TextEditor';

// 表示モードの型定義
export type ViewMode = 'content' | 'edit' | 'preview';

// コンポーネントのプロパティ定義
interface FileEditorProps {
  filename: string;
  initialContent: string;
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  onContentChange?: (content: string) => void;
  wordWrap?: boolean;
}

// ファイルエディタコンポーネント
export const FileEditor: React.FC<FileEditorProps> = ({
  initialContent,
  mode,
  onContentChange,
  wordWrap,
}) => {
  const { colors, typography } = useTheme();

  // コンテンツ変更のハンドラ
  const handleContentChange = useCallback((text: string) => {
    if (onContentChange) {
      onContentChange(text);
    }
  }, [onContentChange]);

  // スタイル定義
  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    contentContainer: { flex: 1, paddingHorizontal: 16, paddingVertical: 12 },
    previewText: { ...typography.body, color: colors.text, fontFamily: 'monospace' },
  });

  // コンテンツのレンダリング
  const renderContent = () => {
    switch (mode) {
      case 'content':
        return (
          <ScrollView
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator
          >
            <Text style={styles.previewText}>{initialContent}</Text>
          </ScrollView>
        );

      case 'edit':
        return (
          <TextEditor
            content={initialContent}
            onContentChange={handleContentChange}
            wordWrap={wordWrap}
          />
        );

      case 'preview':
        return <MarkdownPreview content={initialContent} />;

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {renderContent()}
    </View>
  );
};
