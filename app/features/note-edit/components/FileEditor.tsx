/**
 * @file FileEditor.tsx
 * @summary このファイルは、アプリケーションのファイルエディタコンポーネントを定義します。
 * @responsibility ユーザーがファイルのコンテンツを編集、プレビュー、または差分表示できるインターフェースを提供し、異なる表示モード間の切り替えを管理する責任があります。
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { generateDiff, DiffLine } from '../../../services/diffService';
import { useDiffManager } from '../../../hooks/useDiffManager';
import { DiffViewer } from '../../diff-view/components/DiffViewer';
import { useTheme } from '../../../theme/ThemeContext';

// 表示モードの型定義
export type ViewMode = 'content' | 'edit' | 'preview' | 'diff';

// ファイルビューアの設定
export interface FileViewerConfig {
  extensions: string[];
  editable: boolean;
}

// コンポーネントのプロパティ定義
interface FileEditorProps {
  filename: string;
  initialContent: string;
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  onContentChange?: (content: string) => void;
}

// ファイル形式別の設定
const FILE_VIEWERS: Record<string, FileViewerConfig> = {
  text: { extensions: ['txt', 'log', 'cfg', 'ini'], editable: true },
  markdown: { extensions: ['md', 'markdown'], editable: true },
  code: { extensions: ['js', 'ts', 'py', 'java', 'c', 'cpp', 'css', 'html', 'json', 'xml', 'yaml', 'yml'], editable: true },
  image: { extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'], editable: false },
  pdf: { extensions: ['pdf'], editable: false },
  default: { extensions: [], editable: false },
};

// ファイルエディタコンポーネント
export const FileEditor: React.FC<FileEditorProps> = ({
  filename,
  initialContent,
  mode,
  onModeChange,
  onContentChange,
}) => {
  const { colors, typography } = useTheme();
  const [currentContent, setCurrentContent] = useState(initialContent);
  const [originalContent, setOriginalContent] = useState(initialContent);

  // initialContentプロパティの変更を監視し、内部状態を更新する
  useEffect(() => {
    setCurrentContent(initialContent);
    setOriginalContent(initialContent);
  }, [initialContent]);

  // ファイル形式の判定
  const viewerConfig = useMemo(() => {
    if (!filename) return FILE_VIEWERS.default;
    const ext = filename.split('.').pop()?.toLowerCase();
    if (!ext) return FILE_VIEWERS.default;
    for (const [, config] of Object.entries(FILE_VIEWERS)) {
      if (config.extensions.includes(ext)) {
        return config;
      }
    }
    return FILE_VIEWERS.default;
  }, [filename]);

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

  // 変更があるかどうかの判定
  const isModified = useMemo(() => {
    return currentContent !== originalContent;
  }, [currentContent, originalContent]);

  // 差分適用のハンドラ
  const handleApplyDiff = useCallback(() => {
    const selectedContent = generateSelectedContent();
    onModeChange('content');
  }, [generateSelectedContent, onModeChange]);

  // 全選択・全解除の判定
  const allSelected = allChangeBlockIds.size > 0 && selectedBlocks.size === allChangeBlockIds.size;

  // スタイル定義
  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    contentContainer: { flex: 1, paddingHorizontal: 16, paddingVertical: 12 },
    previewContainer: { flex: 1, paddingHorizontal: 16, paddingVertical: 12 },
    previewText: { ...typography.body, color: colors.text, fontFamily: 'monospace' },
    editContainer: { flex: 1, paddingHorizontal: 16, paddingVertical: 12 },
    textEditor: { flex: 1, ...typography.body, fontFamily: 'monospace', borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: colors.background, color: colors.text },
    footer: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: colors.secondary, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
    controlButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: colors.border },
    controlButtonText: { ...typography.body, fontWeight: '500', color: colors.text },
    applyButton: { backgroundColor: colors.success, borderColor: colors.success },
    applyButtonText: { color: colors.background },
    cancelButton: { backgroundColor: colors.secondary },
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
          <View style={styles.editContainer}>
            <TextInput
              style={styles.textEditor}
              value={currentContent}
              onChangeText={(text) => {
                setCurrentContent(text);
                if (onContentChange) {
                  onContentChange(text);
                }
              }}
              multiline
              placeholder="ファイルの内容を編集してください..."
              placeholderTextColor={colors.textSecondary}
              textAlignVertical="top"
            />
          </View>
        );

      case 'preview':
        return (
          <ScrollView style={styles.previewContainer}>
            <Markdown style={{
              body: { color: colors.text, ...typography.body },
              heading1: { color: colors.text, ...typography.title },
              heading2: { color: colors.text, ...typography.subtitle },
            }}>{currentContent}</Markdown>
          </ScrollView>
        );

      case 'diff':
        return diff.length > 0 ? (
          <View style={{ flex: 1 }}>
            <DiffViewer
              diff={diff}
              selectedBlocks={selectedBlocks}
              onBlockToggle={toggleBlockSelection}
            />
            <View style={styles.footer}>
              <TouchableOpacity style={styles.controlButton} onPress={toggleAllSelection}>
                <Text style={styles.controlButtonText}>{allSelected ? '☑ All' : '☐ All'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.controlButton, styles.applyButton]} onPress={handleApplyDiff}>
                <Text style={[styles.controlButtonText, styles.applyButtonText]}>✅ 適用</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.controlButton, styles.cancelButton]} onPress={() => onModeChange('edit')}>
                <Text style={styles.controlButtonText}>❌ キャンセル</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null;

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
