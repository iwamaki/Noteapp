/**
 * @file FileEditor.tsx
 * @summary このファイルは、アプリケーションのファイルエディタコンポーネントを定義します。
 * @responsibility ユーザーがファイルのコンテンツを編集、プレビュー、または差分表示できるインターフェースを提供し、異なる表示モード間の切り替えを管理する責任があります。
 * テキスト/バイナリ両対応。
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../design/theme/ThemeContext';

import { MarkdownPreview } from './MarkdownPreview';
import { TextEditor } from './TextEditor';
import { BinaryContentViewer } from './BinaryContentViewer';
import { ContentType, SupportedMimeType } from '@data/core/typesFlat';

// 表示モードの型定義
export type ViewMode = 'content' | 'edit' | 'preview';

// コンポーネントのプロパティ定義
interface FileEditorProps {
  filename: string;
  initialContent: string;
  contentType?: ContentType;
  mimeType?: SupportedMimeType;
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  onContentChange?: (content: string) => void;
}

// ファイルエディタコンポーネント
export const FileEditor: React.FC<FileEditorProps> = ({
  initialContent,
  contentType,
  mimeType,
  mode,
  onContentChange,
}) => {
  const { colors, typography } = useTheme();

  // バイナリコンテンツかどうか
  const isBinary = contentType === 'binary';

  // コンテンツ変更のハンドラ
  const handleContentChange = useCallback((text: string) => {
    if (onContentChange) {
      onContentChange(text);
    }
  }, [onContentChange]);

  // スタイル定義
  const styles = StyleSheet.create({
    container: {
      flex: 1, // 親から与えられたスペースを最大限に利用
      // backgroundColor を削除。レイアウトは親に委ねる
    },
    contentContainer: {
      // flex: 1 を削除。paddingはコンテンツの一部として維持
    },
    previewText: { ...typography.body, color: colors.text, fontFamily: 'monospace' },
  });

  // コンテンツのレンダリング
  const renderContent = () => {
    // バイナリファイルの場合は専用ビューアで表示
    if (isBinary) {
      return (
        <BinaryContentViewer
          content={initialContent}
          mimeType={mimeType}
        />
      );
    }

    // テキストファイルの場合
    switch (mode) {
      case 'content':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.previewText}>{initialContent}</Text>
          </View>
        );

      case 'edit':
        return (
          <TextEditor
            content={initialContent}
            onContentChange={handleContentChange}
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
