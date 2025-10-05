/**
 * @file FileEditor.tsx
 * @summary このファイルは、アプリケーションのファイルエディタコンポーネントを定義します。
 * @responsibility ユーザーがファイルのコンテンツを編集、プレビュー、または差分表示できるインターフェースを提供し、異なる表示モード間の切り替えを管理する責任があります。
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { generateDiff } from '../../../services/diffService';
import { useDiffManager } from '../../../hooks/useDiffManager';
import { useTheme } from '../../../theme/ThemeContext';

import { MarkdownPreview } from './editors/MarkdownPreview';
import { TextEditor } from './editors/TextEditor';
import { DiffPreview } from './editors/DiffPreview';

// 表示モードの型定義
export type ViewMode = 'content' | 'edit' | 'preview' | 'diff';

// コンポーネントのプロパティ定義
interface FileEditorProps {
  filename: string;
  initialContent: string;
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  onContentChange?: (content: string) => void;
}

// ファイルエディタコンポーネント
export const FileEditor: React.FC<FileEditorProps> = ({

  initialContent,
  mode,
  onModeChange,
  onContentChange,
}) => {
  const { colors, typography } = useTheme();
  const [currentContent, setCurrentContent] = useState(initialContent);
  const [originalContent] = useState(initialContent);

  // 差分の生成
  const diff = useMemo(() =>
    originalContent !== currentContent
      ? generateDiff(originalContent, currentContent)
      : [],
    [originalContent, currentContent]
  );

  // 差分管理フックの利用
  const {
    selectedBlocks,
    toggleBlockSelection,
    toggleAllSelection,
    generateSelectedContent,
    allChangeBlockIds
  } = useDiffManager(diff);

  // 差分適用のハンドラ
  const handleApplyDiff = useCallback(() => {
    generateSelectedContent();
    onModeChange('content');
  }, [generateSelectedContent, onModeChange]);

  // 全選択・全解除の判定
  const allSelected = allChangeBlockIds.size > 0 && selectedBlocks.size === allChangeBlockIds.size;

  // コンテンツ変更のハンドラ
  const handleContentChange = useCallback((text: string) => {
    setCurrentContent(text);
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
          <View style={styles.contentContainer}>
            <Text style={styles.previewText}>{currentContent}</Text>
          </View>
        );

      case 'edit':
        return (
          <TextEditor
            content={currentContent}
            onContentChange={handleContentChange}
          />
        );

      case 'preview':
        return <MarkdownPreview content={currentContent} />;

      case 'diff':
        return (
          <DiffPreview
            diff={diff}
            selectedBlocks={selectedBlocks}
            allSelected={allSelected}
            onBlockToggle={toggleBlockSelection}
            onToggleAll={toggleAllSelection}
            onApply={handleApplyDiff}
            onCancel={() => onModeChange('edit')}
          />
        );

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
